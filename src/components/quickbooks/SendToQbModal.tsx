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
} from '@/services/quickbooksService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type {
  QbEntityType,
  QbAccount,
  QbPaymentAccount,
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
  /** Expense category code; drives the default of the line-level expense-account picker. */
  categoryCode?: string | null
  /** Expense amount; populates the resolution summary. */
  expenseAmount?: number
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
  onSynced,
}: SendToQbModalProps) {
  const [entityType, setEntityType] = useState<QbEntityType>(connectionDefaultEntityType)
  const [includeReceipt, setIncludeReceipt] = useState<boolean>(hasReceipt)
  const [submitting, setSubmitting] = useState(false)
  const { showNotification } = useNotificationStore()

  // Loaded in parallel on each open.
  const [qbAccounts, setQbAccounts] = useState<QbAccount[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<QbPaymentAccount[]>([])
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [defaultPaymentAccountName, setDefaultPaymentAccountName] = useState<string | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  // Per-send overrides — these never persist back to mappings or connection.
  const [qbAccountId, setQbAccountId] = useState<string>('')
  const [paymentAccountId, setPaymentAccountId] = useState<string>('')

  useEffect(() => {
    if (!isOpen) return
    setEntityType(connectionDefaultEntityType)
    setIncludeReceipt(hasReceipt)

    let cancelled = false
    setLoadingAccounts(true)
    Promise.all([
      getQbAccounts(),
      getQbPaymentAccounts(),
      getAccountMappings(),
      getConnection(),
    ])
      .then(([accountsRes, paymentRes, mappingsRes, connRes]) => {
        if (cancelled) return
        const accs = accountsRes.status === 'success' ? accountsRes.data : []
        const pays = paymentRes.status === 'success' ? paymentRes.data : []
        const maps = mappingsRes.status === 'success' ? mappingsRes.data : []
        setQbAccounts(accs)
        setPaymentAccounts(pays)

        const conn = connRes.status === 'success' ? connRes.data : null
        setConnectionStatus(conn?.status ?? null)
        setDefaultPaymentAccountName(conn?.defaultPaymentAccountName ?? null)

        const mappedAccount = categoryCode
          ? maps.find((m) => m.expenseCategoryCode === categoryCode)
          : undefined
        setQbAccountId(mappedAccount?.qbAccountId ?? '')
        setPaymentAccountId(conn?.defaultPaymentAccountId ?? '')
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
  }, [isOpen, categoryCode, connectionDefaultEntityType, hasReceipt])

  const expenseAccountOptions: SearchableSelectOption<string>[] = useMemo(
    () => qbAccounts.map((a) => ({ value: a.id, label: a.name, secondaryLabel: a.accountType })),
    [qbAccounts]
  )

  const paymentAccountOptions: SearchableSelectOption<string>[] = useMemo(
    () => paymentAccounts.map((a) => ({ value: a.id, label: a.name, secondaryLabel: a.accountType })),
    [paymentAccounts]
  )

  const qbAccountName = useMemo(() => {
    const found = qbAccounts.find((a) => a.id === qbAccountId)
    return found?.name ?? '—'
  }, [qbAccounts, qbAccountId])

  const paymentAccountName = useMemo(() => {
    const found = paymentAccounts.find((a) => a.id === paymentAccountId)
    return found?.name ?? defaultPaymentAccountName ?? '—'
  }, [paymentAccounts, paymentAccountId, defaultPaymentAccountName])

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
    disabledReason = 'No expense accounts in your QuickBooks company'
  } else if (noPaymentAccountsForPurchase) {
    disabledReason =
      'No Bank/Credit Card accounts in your QuickBooks company. Switch to Bill or add one.'
  } else if (!qbAccountId) {
    disabledReason = 'Pick a QuickBooks account or set up a mapping in QB Mappings'
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
      }
      if (entityType === 'purchase') {
        payload.paymentAccountId = paymentAccountId
      }
      const res = await syncExpenseToQb(expenseId, payload)
      if (res.status === 'success') {
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
    <Modal isOpen={isOpen} onClose={onClose} style="w-11/12 max-w-md">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Send to QuickBooks</h3>
        {vendorName && (
          <p className="text-sm text-gray-600">
            Vendor: <span className="font-medium text-gray-900">{vendorName}</span>
          </p>
        )}

        {isExpired && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>Your QuickBooks connection has expired. Reconnect in Settings → Integrations to continue.</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Entity type
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

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Expense account
          </label>
          <SearchableSelect<string>
            options={expenseAccountOptions}
            value={qbAccountId || null}
            onChange={(v) => setQbAccountId(v ?? '')}
            placeholder="Select a QuickBooks expense account…"
            loading={loadingAccounts}
            emptyText="No expense accounts found"
          />
        </div>

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

        {summaryText && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
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
