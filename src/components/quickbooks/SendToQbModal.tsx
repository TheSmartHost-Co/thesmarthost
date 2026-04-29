'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/shared/modal'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import SearchableSelect, {
  type SearchableSelectOption,
} from '@/components/shared/SearchableSelect'
import {
  syncExpenseToQb,
  getQbAccounts,
  getQbPaymentAccounts,
  getAccountMappings,
  getConnection,
  getQbCustomers,
  getQbClasses,
  getPropertyClassMappings,
  upsertPropertyClassMapping,
  getTaxCodeMappings,
} from '@/services/quickbooksService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type {
  QbEntityType,
  QbAccount,
  QbPaymentAccount,
  QbCustomer,
  QbClass,
  PropertyClassMapping,
  TaxCodeMapping,
  SyncExpensePayload,
} from '@/services/types/quickbooks'

interface SendToQbModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  /** Vendor name shown in the confirmation header. Optional — only for clarity. */
  vendorName?: string | null
  /** Whether the expense has a receipt attached. Drives the default of the checkbox. */
  hasReceipt: boolean
  /** Connection-level default; pre-fills the dropdown so the user can override per-call. */
  connectionDefaultEntityType: QbEntityType
  /** Expense category code; drives the default of the line-level expense-category picker. */
  categoryCode?: string | null
  /** Expense amount; populates the resolution summary. */
  expenseAmount?: number
  /** Property the expense belongs to; resolves the default Class via property→class mapping. */
  propertyId?: string | null
  /** Primary owner client name; auto-fills Customer when a QBO customer's displayName matches case-insensitively. */
  primaryOwnerName?: string | null
  /** Per-tax-kind amounts; powers the tax breakdown panel + mapping warnings. */
  taxBreakdown?: { gst: number; pst: number; hst: number; qst: number }
  /** Initial Description value (pre-filled from expense.description, editable per-send). */
  expenseDescription?: string
  onSynced: (result: { qbEntityId: string; qbEntityType: QbEntityType; attached: boolean }) => void
}

const formatCurrency = (n: number | undefined) =>
  typeof n === 'number' && Number.isFinite(n) ? `$${n.toFixed(2)}` : ''

export default function SendToQbModal({
  isOpen,
  onClose,
  expenseId,
  vendorName,
  hasReceipt,
  connectionDefaultEntityType,
  categoryCode,
  expenseAmount,
  propertyId,
  primaryOwnerName,
  taxBreakdown,
  expenseDescription,
  onSynced,
}: SendToQbModalProps) {
  const [entityType, setEntityType] = useState<QbEntityType>(connectionDefaultEntityType)
  const [includeReceipt, setIncludeReceipt] = useState<boolean>(hasReceipt)
  const [submitting, setSubmitting] = useState(false)
  const { showNotification } = useNotificationStore()

  // Loaded in parallel on each open. Note: customers/classes/tax-codes might
  // legitimately be empty if the user hasn't set them up in QBO yet — the UI
  // degrades gracefully (pickers just show "no options found" in those cases).
  const [qbAccounts, setQbAccounts] = useState<QbAccount[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<QbPaymentAccount[]>([])
  const [qbCustomers, setQbCustomers] = useState<QbCustomer[]>([])
  const [qbClasses, setQbClasses] = useState<QbClass[]>([])
  const [taxMappings, setTaxMappings] = useState<TaxCodeMapping[]>([])
  const [classMappings, setClassMappings] = useState<PropertyClassMapping[]>([])
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [defaultPaymentAccountName, setDefaultPaymentAccountName] = useState<string | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  // Per-send overrides — these never persist back to mappings, connection, or expense.
  const [qbAccountId, setQbAccountId] = useState<string>('')
  const [paymentAccountId, setPaymentAccountId] = useState<string>('')
  const [customerId, setCustomerId] = useState<string>('')
  const [classId, setClassId] = useState<string>('')
  const [isBillable, setIsBillable] = useState<boolean>(false)
  const [description, setDescription] = useState<string>('')

  useEffect(() => {
    if (!isOpen) return
    setEntityType(connectionDefaultEntityType)
    setIncludeReceipt(hasReceipt)
    // Always default to ON: most property-management expenses end up rebilled
    // to the property owner, so make billable the happy path. User can still
    // toggle off per-send if a particular expense isn't rebillable.
    setIsBillable(true)
    setDescription(expenseDescription || '')

    let cancelled = false
    setLoadingAccounts(true)
    Promise.all([
      getQbAccounts(),
      getQbPaymentAccounts(),
      getAccountMappings(),
      getConnection(),
      getQbCustomers(),
      getQbClasses(),
      getPropertyClassMappings(),
      getTaxCodeMappings(),
    ])
      .then(([accountsRes, paymentRes, mappingsRes, connRes, customersRes, classesRes, classMapsRes, taxMapsRes]) => {
        if (cancelled) return
        const accs = accountsRes.status === 'success' ? accountsRes.data : []
        const pays = paymentRes.status === 'success' ? paymentRes.data : []
        const maps = mappingsRes.status === 'success' ? mappingsRes.data : []
        const custs = customersRes.status === 'success' ? customersRes.data : []
        const cls = classesRes.status === 'success' ? classesRes.data : []
        const classMaps = classMapsRes.status === 'success' ? classMapsRes.data : []
        const taxMaps = taxMapsRes.status === 'success' ? taxMapsRes.data : []
        setQbAccounts(accs)
        setPaymentAccounts(pays)
        setQbCustomers(custs)
        setQbClasses(cls)
        setClassMappings(classMaps)
        setTaxMappings(taxMaps)

        const conn = connRes.status === 'success' ? connRes.data : null
        setConnectionStatus(conn?.status ?? null)
        setDefaultPaymentAccountName(conn?.defaultPaymentAccountName ?? null)

        // Default the QB category from the saved category mapping.
        const mappedAccount = categoryCode
          ? maps.find((m) => m.expenseCategoryCode === categoryCode)
          : undefined
        setQbAccountId(mappedAccount?.qbAccountId ?? '')

        // Default the payment account from the connection-level setting.
        setPaymentAccountId(conn?.defaultPaymentAccountId ?? '')

        // Default the Class from the property→class mapping.
        const mappedClass = propertyId
          ? classMaps.find((m) => m.propertyId === propertyId)
          : undefined
        setClassId(mappedClass?.qbClassId ?? '')

        // Auto-resolve the Customer by case-insensitive name match against
        // the property's primary owner. Always attempt — billable defaults ON,
        // and even if the user toggles it off, having the customer pre-selected
        // is harmless (only sent to QBO when the user submits).
        if (primaryOwnerName) {
          const target = primaryOwnerName.trim().toLowerCase()
          const match = custs.find((c) => c.displayName.trim().toLowerCase() === target)
          setCustomerId(match?.id ?? '')
        } else {
          setCustomerId('')
        }
      })
      .catch((err) => {
        console.error('Failed to load QB defaults:', err)
      })
      .finally(() => {
        if (!cancelled) setLoadingAccounts(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    categoryCode,
    connectionDefaultEntityType,
    hasReceipt,
    propertyId,
    primaryOwnerName,
    expenseDescription,
  ])

  const expenseAccountOptions: SearchableSelectOption<string>[] = useMemo(
    () => qbAccounts.map((a) => ({ value: a.id, label: a.name, secondaryLabel: a.accountType })),
    [qbAccounts]
  )

  const paymentAccountOptions: SearchableSelectOption<string>[] = useMemo(
    () => paymentAccounts.map((a) => ({ value: a.id, label: a.name, secondaryLabel: a.accountType })),
    [paymentAccounts]
  )

  const customerOptions: SearchableSelectOption<string>[] = useMemo(
    () => qbCustomers.map((c) => ({
      value: c.id,
      label: c.displayName,
      secondaryLabel: c.primaryEmailAddr || undefined,
    })),
    [qbCustomers]
  )

  const classOptions: SearchableSelectOption<string>[] = useMemo(
    () => qbClasses.map((c) => ({
      value: c.id,
      label: c.name,
      secondaryLabel: c.fullyQualifiedName !== c.name ? c.fullyQualifiedName : undefined,
    })),
    [qbClasses]
  )

  const qbAccountName = useMemo(() => {
    const found = qbAccounts.find((a) => a.id === qbAccountId)
    return found?.name ?? '—'
  }, [qbAccounts, qbAccountId])

  const paymentAccountName = useMemo(() => {
    const found = paymentAccounts.find((a) => a.id === paymentAccountId)
    return found?.name ?? defaultPaymentAccountName ?? '—'
  }, [paymentAccounts, paymentAccountId, defaultPaymentAccountName])

  // ─── Tax breakdown analysis ──────────────────────────────────────
  // Walks the (gst, pst, hst, qst) tuple passed in from the parent, paired with
  // the user's saved tax-code mappings, so we can render per-rate amounts
  // alongside a "no mapping for X" warning where applicable.
  const taxRows = useMemo(() => {
    const breakdown = taxBreakdown ?? { gst: 0, pst: 0, hst: 0, qst: 0 }
    const mappingByKind = new Map(taxMappings.map((m) => [m.hmTaxKind, m]))
    return (['gst', 'pst', 'hst', 'qst'] as const).map((kind) => ({
      kind,
      label: kind.toUpperCase(),
      amount: Number(breakdown[kind] || 0),
      mapping: mappingByKind.get(kind) || null,
    }))
  }, [taxBreakdown, taxMappings])

  const totalTax = useMemo(() => taxRows.reduce((s, r) => s + r.amount, 0), [taxRows])
  const unmappedNonZeroKinds = useMemo(
    () => taxRows.filter((r) => r.amount > 0 && !r.mapping),
    [taxRows]
  )

  // ─── Disabled-state matrix (first matching reason wins) ──────────
  const isExpired = connectionStatus === 'expired'
  const noExpenseAccounts = !loadingAccounts && qbAccounts.length === 0
  const noPaymentAccountsForPurchase =
    !loadingAccounts &&
    entityType === 'purchase' &&
    paymentAccounts.length === 0 &&
    !paymentAccountId

  let disabledReason: string | null = null
  if (isExpired) {
    disabledReason = 'Reconnect QuickBooks first'
  } else if (noExpenseAccounts) {
    disabledReason = 'No expense categories in your QuickBooks company'
  } else if (noPaymentAccountsForPurchase) {
    disabledReason =
      'No Bank/Credit Card accounts in your QuickBooks company. Switch to Bill or add one.'
  } else if (!qbAccountId) {
    disabledReason = 'Pick a QuickBooks category or set up a mapping in QB Mappings'
  } else if (entityType === 'purchase' && !paymentAccountId) {
    disabledReason = 'Pick a payment account'
  }

  const sendDisabled = submitting || loadingAccounts || disabledReason !== null

  const handleSend = async () => {
    setSubmitting(true)
    try {
      const payload: SyncExpensePayload = {
        qbEntityType: entityType,
        includeReceipt,
        qbAccountId,
        // Always send isBillable + description so the backend has the
        // most recent value the user picked. customerId / classId only
        // sent when set — null/empty omits them in the payload.
        isBillable,
        description,
      }
      if (entityType === 'purchase') {
        payload.paymentAccountId = paymentAccountId
      }
      if (customerId) payload.customerId = customerId
      if (classId) payload.classId = classId

      const res = await syncExpenseToQb(expenseId, payload)
      if (res.status === 'success') {
        // Learn-on-first-use: if the user picked a Class for an expense whose
        // property has no saved class mapping yet, persist it silently so
        // future sends auto-fill the same value. We only save the FIRST time
        // (existing mapping = leave alone — settings page is the source of
        // truth for explicit edits).
        if (propertyId && classId) {
          const existing = classMappings.find((m) => m.propertyId === propertyId)
          if (!existing) {
            upsertPropertyClassMapping(propertyId, classId).catch((err) => {
              console.error('Failed to learn property→class mapping:', err)
            })
          }
        }

        onSynced({
          qbEntityId: res.data.qbEntityId,
          qbEntityType: res.data.qbEntityType,
          attached: res.data.attached,
        })
        showNotification(
          res.data.alreadySynced
            ? 'Already in QuickBooks'
            : `Sent to QuickBooks${res.data.attached ? ' with receipt' : ''}`,
          'success'
        )
        onClose()
      } else {
        if (res.code === 'QB_RECONNECT_REQUIRED') {
          showNotification('Reconnect QuickBooks to continue', 'error')
        } else {
          showNotification(res.message || 'Failed to send to QuickBooks', 'error')
        }
      }
    } catch (err) {
      console.error('QB sync error:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to send to QuickBooks',
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const summaryText = useMemo(() => {
    if (!qbAccountId) return null
    if (entityType === 'bill') {
      return `Sending as Bill, booked to ${qbAccountName}`
    }
    const amountPart = expenseAmount !== undefined ? ` for ${formatCurrency(expenseAmount)}` : ''
    return `Sending as Purchase${amountPart}, debiting ${paymentAccountName}, booked to ${qbAccountName}`
  }, [entityType, qbAccountId, qbAccountName, paymentAccountName, expenseAmount])

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-11/12 max-w-2xl">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Send to QuickBooks</h3>
        {vendorName && (
          <p className="text-sm text-gray-600">
            Supplier: <span className="font-medium text-gray-900">{vendorName}</span>
          </p>
        )}

        {isExpired && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>Your QuickBooks connection has expired. Reconnect in Settings → Integrations to continue.</span>
          </div>
        )}

        {/* ─── Type ───────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Publish to
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['purchase', 'bill'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setEntityType(opt)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  entityType === opt
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt === 'purchase' ? 'Purchase (paid)' : 'Bill (unpaid)'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Default for your account: <span className="font-medium">{connectionDefaultEntityType}</span>
          </p>
        </div>

        {/* ─── Category (line-level Expense AccountRef) ───────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            QuickBooks category
          </label>
          <SearchableSelect<string>
            options={expenseAccountOptions}
            value={qbAccountId || null}
            onChange={(v) => setQbAccountId(v ?? '')}
            placeholder="Select a QuickBooks category…"
            loading={loadingAccounts}
            emptyText="No expense categories found"
          />
        </div>

        {/* ─── Customer ───────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Customer <span className="text-[10px] font-normal lowercase text-gray-500">(optional)</span>
          </label>
          <SearchableSelect<string>
            options={customerOptions}
            value={customerId || null}
            onChange={(v) => setCustomerId(v ?? '')}
            placeholder="Select a customer…"
            loading={loadingAccounts}
            emptyText="No customers in your QuickBooks company"
          />
          {primaryOwnerName && (
            <p className="text-xs text-gray-500 mt-1">
              Property owner: <span className="font-medium">{primaryOwnerName}</span>
              {customerId && qbCustomers.find((c) => c.id === customerId)?.displayName.trim().toLowerCase() === primaryOwnerName.trim().toLowerCase() && (
                <span className="ml-1 text-emerald-700">(auto-matched)</span>
              )}
            </p>
          )}
        </div>

        {/* ─── Mark as rebillable ─────────────────────────────── */}
        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
          <div className="text-sm">
            <div className="font-semibold text-gray-900">Mark as rebillable</div>
            <div className="text-xs text-gray-500">
              Tags the line as billable to the customer for later reimbursement.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isBillable}
            onClick={() => setIsBillable((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isBillable ? 'bg-emerald-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isBillable ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* ─── Class (cost center / property) ─────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Class
          </label>
          <SearchableSelect<string>
            options={classOptions}
            value={classId || null}
            onChange={(v) => setClassId(v ?? '')}
            placeholder="Select a class…"
            loading={loadingAccounts}
            emptyText="No classes in your QuickBooks company"
          />
          {propertyId && classMappings.find((m) => m.propertyId === propertyId) && (
            <p className="text-xs text-gray-500 mt-1">
              Default for this property: <span className="font-medium">
                {classMappings.find((m) => m.propertyId === propertyId)?.qbClassName}
              </span>
            </p>
          )}
        </div>

        {/* ─── Description ────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Goes into the QuickBooks line description and PrivateNote."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* ─── Amount + tax breakdown ─────────────────────────── */}
        {(expenseAmount !== undefined || totalTax > 0) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 text-sm">
            {expenseAmount !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Total amount</span>
                <span className="font-semibold text-gray-900">{formatCurrency(expenseAmount)}</span>
              </div>
            )}
            {taxRows.some((r) => r.amount > 0) && (
              <div className="pt-2 border-t border-gray-200 space-y-1">
                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Tax breakdown</div>
                {taxRows
                  .filter((r) => r.amount > 0)
                  .map((r) => (
                    <div key={r.kind} className="flex justify-between text-xs">
                      <span className="text-gray-600">
                        {r.label}
                        {r.mapping ? (
                          <span className="ml-2 text-emerald-700">→ {r.mapping.qbTaxCodeName}</span>
                        ) : (
                          <span className="ml-2 text-amber-700">(unmapped)</span>
                        )}
                      </span>
                      <span className="font-medium text-gray-900">{formatCurrency(r.amount)}</span>
                    </div>
                  ))}
                <div className="flex justify-between pt-1 border-t border-gray-100 text-xs">
                  <span className="text-gray-600 font-semibold">Total tax</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(totalTax)}</span>
                </div>
                {unmappedNonZeroKinds.length > 0 && (
                  <div className="text-[11px] text-amber-700 mt-1 leading-snug">
                    {unmappedNonZeroKinds.map((r) => r.label).join(', ')}{' '}
                    {unmappedNonZeroKinds.length === 1 ? 'is' : 'are'} not mapped to a QuickBooks tax code.
                    Total tax will still sync, but per-rate breakdown won&apos;t. Set up mappings in
                    Settings → QuickBooks.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Paid from (Purchase only) ──────────────────────── */}
        {entityType === 'purchase' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Paid from
            </label>
            <SearchableSelect<string>
              options={paymentAccountOptions}
              value={paymentAccountId || null}
              onChange={(v) => setPaymentAccountId(v ?? '')}
              placeholder="Select a payment account…"
              loading={loadingAccounts}
              emptyText="No payment accounts found"
            />
          </div>
        )}

        {/* ─── Receipt attachment ─────────────────────────────── */}
        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={includeReceipt}
            onChange={(e) => setIncludeReceipt(e.target.checked)}
            disabled={!hasReceipt}
            className="mt-0.5"
          />
          <span>
            Include receipt attachment
            {!hasReceipt && (
              <span className="block text-xs text-gray-500">No receipt available</span>
            )}
          </span>
        </label>

        {/* ─── Resolution summary ─────────────────────────────── */}
        {summaryText && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-900">
            {summaryText}
          </div>
        )}

        {disabledReason && !isExpired && (
          <p className="text-xs text-amber-700">{disabledReason}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sendDisabled}
            title={sendDisabled && disabledReason ? disabledReason : undefined}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircleIcon className="w-4 h-4" />
            {submitting ? 'Sending…' : 'Send to QuickBooks'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
