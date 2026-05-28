'use client'

import { useMemo } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import SearchableSelect, {
  type SearchableSelectOption,
} from '@/components/shared/SearchableSelect'
import type { QbDefaults, QbStepOverrides } from '@/services/types/quickbooks'

/**
 * Per-expense context that drives the form's display copy + auto-resolved hints
 * (e.g. "Property owner: X · auto-matched"). The same expense info that drives
 * computeInitialStepValue lives here, plus presentational extras.
 */
export interface SendToQbStepExpense {
  vendorName?: string | null
  hasReceipt: boolean
  expenseAmount?: number
  propertyId?: string | null
  primaryOwnerName?: string | null
  taxBreakdown?: { gst: number; pst: number; hst: number; qst: number }
}

interface SendToQbStepProps {
  /** Per-expense context (display-only for the most part). */
  expense: SendToQbStepExpense
  /** Shared QB data (accounts/customers/classes/mappings/connection). Same across a wizard run. */
  defaults: QbDefaults
  /** Controlled value. */
  value: QbStepOverrides
  /** Fires on every field change. */
  onChange: (next: QbStepOverrides) => void
  /** Show loading skeletons in dropdowns while defaults are still being fetched. */
  loading?: boolean
  /**
   * Optional reason the step can't be staged/sent (computed externally via
   * getStepDisabledReason). Rendered as a small amber footnote when set; the
   * action button (Send / Stage & Next) lives outside this component.
   */
  disabledReason?: string | null
}

const formatCurrency = (n: number | undefined) =>
  typeof n === 'number' && Number.isFinite(n) ? `$${n.toFixed(2)}` : ''

/**
 * Pure controlled form for one expense's QuickBooks send. Renders identically
 * regardless of whether it's mounted inside the single-expense SendToQbModal
 * or the bulk SendToQbWizard's per-step view. The only thing the parent owns
 * is the action button (Send to QuickBooks / Stage & Next) and any wrapper
 * chrome (modal vs. wizard frame).
 */
export default function SendToQbStep({
  expense,
  defaults,
  value,
  onChange,
  loading = false,
  disabledReason = null,
}: SendToQbStepProps) {
  const isExpired = defaults.connectionStatus === 'expired'

  const expenseAccountOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      defaults.qbAccounts.map((a) => ({
        value: a.id,
        label: a.name,
        secondaryLabel: a.accountType,
      })),
    [defaults.qbAccounts]
  )

  const paymentAccountOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      defaults.paymentAccounts.map((a) => ({
        value: a.id,
        label: a.name,
        secondaryLabel: a.accountType,
      })),
    [defaults.paymentAccounts]
  )

  const customerOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      defaults.qbCustomers.map((c) => ({
        value: c.id,
        label: c.displayName,
        secondaryLabel: c.primaryEmailAddr || undefined,
      })),
    [defaults.qbCustomers]
  )

  const classOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      defaults.qbClasses.map((c) => ({
        value: c.id,
        label: c.name,
        secondaryLabel:
          c.fullyQualifiedName !== c.name ? c.fullyQualifiedName : undefined,
      })),
    [defaults.qbClasses]
  )

  // Item picker options: synthetic "None" row first, then every Service/NonInventory
  // Item from the user's QBO chart. Empty-string value === explicit None — line
  // falls back to AccountBasedExpenseLineDetail for that send.
  const itemOptions: SearchableSelectOption<string>[] = useMemo(
    () => [
      {
        value: '',
        label: '— None (leave the Product/service column blank)',
      },
      ...defaults.qbItems.map((it) => ({
        value: it.id,
        label: it.name,
        secondaryLabel: it.type,
      })),
    ],
    [defaults.qbItems]
  )

  // True when the currently-picked Item matches the connection-level default
  // (Phase 1 setting). Used to render a subtle "default from settings" hint.
  const isAutoDetectedDefault = useMemo(
    () => !!value.qbItemId && defaults.billableItemId === value.qbItemId,
    [defaults.billableItemId, value.qbItemId]
  )

  const qbAccountName = useMemo(() => {
    const found = defaults.qbAccounts.find((a) => a.id === value.qbAccountId)
    return found?.name ?? '—'
  }, [defaults.qbAccounts, value.qbAccountId])

  const paymentAccountName = useMemo(() => {
    const found = defaults.paymentAccounts.find((a) => a.id === value.paymentAccountId)
    return found?.name ?? defaults.defaultPaymentAccountName ?? '—'
  }, [defaults.paymentAccounts, value.paymentAccountId, defaults.defaultPaymentAccountName])

  // Sales-tax picker options: synthetic "None" row first, then every QBO
  // TaxCode. '' = explicit None — no TaxCodeRef on the line. The receipt-matched
  // default is pre-selected via computeInitialStepValue.
  const taxCodeOptions: SearchableSelectOption<string>[] = useMemo(
    () => [
      { value: '', label: '— None (no sales tax)' },
      ...defaults.qbTaxCodes.map((tc) => ({
        value: tc.id,
        label: tc.name,
      })),
    ],
    [defaults.qbTaxCodes]
  )

  // Receipt's total tax = sum of the detected per-kind amounts. Used only to
  // derive the pre-tax subtotal — the same value the backend sends as the QBO
  // line Amount (lineSubtotal = amount − tax_total).
  const receiptTax = useMemo(() => {
    const b = expense.taxBreakdown ?? { gst: 0, pst: 0, hst: 0, qst: 0 }
    return Number(b.gst || 0) + Number(b.pst || 0) + Number(b.hst || 0) + Number(b.qst || 0)
  }, [expense.taxBreakdown])

  const subtotal = useMemo(
    () =>
      expense.expenseAmount !== undefined
        ? Math.round((expense.expenseAmount - receiptTax) * 100) / 100
        : undefined,
    [expense.expenseAmount, receiptTax]
  )

  // The tax preview reflects the SELECTED QBO rate (what QBO will actually
  // post), not the receipt's printed tax. Prefer the numeric `rate` the backend
  // joined from the TaxRate entity (e.g. 14.975 for GST/QST QC); fall back to
  // parsing percentages out of the rate names ("GST 5%" / "QST 9.975%") when the
  // numeric value is unavailable. Returns 0 for "None"/zero-rated/exempt, and
  // null when the rate can't be determined (→ fall back to the receipt's tax).
  const selectedTaxRate = useMemo<number | null>(() => {
    if (!value.qbTaxCodeId) return 0 // "None" → no tax
    const code = defaults.qbTaxCodes.find((tc) => tc.id === value.qbTaxCodeId)
    if (!code) return null
    if (typeof code.rate === 'number') return code.rate / 100
    const rates = code.rates ?? []
    if (rates.length === 0) return 0 // zero-rated / exempt / out of scope
    let sum = 0
    let parsedAny = false
    for (const r of rates) {
      const m = (r.name || '').match(/(\d+(?:\.\d+)?)\s*%/)
      if (m) {
        sum += parseFloat(m[1])
        parsedAny = true
      }
    }
    return parsedAny ? sum / 100 : null
  }, [value.qbTaxCodeId, defaults.qbTaxCodes])

  // Preview tax = subtotal × selected rate (rounded). Falls back to the
  // receipt's tax when the rate can't be determined from names.
  const previewTax = useMemo(() => {
    if (subtotal === undefined) return undefined
    if (selectedTaxRate === null) return receiptTax
    return Math.round(subtotal * selectedTaxRate * 100) / 100
  }, [subtotal, selectedTaxRate, receiptTax])

  // Whether the Tax row reflects the picked rate (vs. a receipt-tax fallback).
  const taxFromSelectedRate = selectedTaxRate !== null

  const previewTotal = useMemo(
    () =>
      subtotal !== undefined && previewTax !== undefined
        ? Math.round((subtotal + previewTax) * 100) / 100
        : undefined,
    [subtotal, previewTax]
  )

  const summaryText = useMemo(() => {
    if (!value.qbAccountId) return null
    if (value.qbEntityType === 'bill') {
      return `Sending as Bill, booked to ${qbAccountName}`
    }
    const amountPart =
      expense.expenseAmount !== undefined
        ? ` for ${formatCurrency(expense.expenseAmount)}`
        : ''
    return `Sending as Purchase${amountPart}, debiting ${paymentAccountName}, booked to ${qbAccountName}`
  }, [
    value.qbEntityType,
    value.qbAccountId,
    qbAccountName,
    paymentAccountName,
    expense.expenseAmount,
  ])

  // Tiny helper to keep onChange call sites compact.
  const update = <K extends keyof QbStepOverrides>(key: K, v: QbStepOverrides[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <div className="space-y-4">
      {expense.vendorName && (
        <p className="text-sm text-gray-600">
          Supplier: <span className="font-medium text-gray-900">{expense.vendorName}</span>
        </p>
      )}

      {isExpired && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            Your QuickBooks connection has expired. Reconnect in Settings → Integrations to
            continue.
          </span>
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
              onClick={() => update('qbEntityType', opt)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                value.qbEntityType === opt
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt === 'purchase' ? 'Purchase (paid)' : 'Bill (unpaid)'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Default for your account:{' '}
          <span className="font-medium">{defaults.connectionDefaultEntityType}</span>
        </p>
      </div>

      {/* ─── Category (line-level Expense AccountRef) ───────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
          QuickBooks category
        </label>
        <SearchableSelect<string>
          options={expenseAccountOptions}
          value={value.qbAccountId || null}
          onChange={(v) => update('qbAccountId', v ?? '')}
          placeholder="Select a QuickBooks category…"
          loading={loading}
          emptyText="No expense categories found"
        />
      </div>

      {/* ─── Customer ───────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
          Customer{' '}
          <span className="text-[10px] font-normal lowercase text-gray-500">(optional)</span>
        </label>
        <SearchableSelect<string>
          options={customerOptions}
          value={value.customerId || null}
          onChange={(v) => update('customerId', v ?? '')}
          placeholder="Select a customer…"
          loading={loading}
          emptyText="No customers in your QuickBooks company"
        />
        {expense.primaryOwnerName && (
          <p className="text-xs text-gray-500 mt-1">
            Property owner: <span className="font-medium">{expense.primaryOwnerName}</span>
            {value.customerId &&
              defaults.qbCustomers
                .find((c) => c.id === value.customerId)
                ?.displayName.trim()
                .toLowerCase() === expense.primaryOwnerName.trim().toLowerCase() && (
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
          aria-checked={value.isBillable}
          onClick={() => update('isBillable', !value.isBillable)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value.isBillable ? 'bg-emerald-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value.isBillable ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* ─── Product/Service (line-level ItemRef) ─────────────
          Only rendered when the line is rebillable — the ItemRef only
          fires on billable lines, so showing it for non-billable expenses
          would mislead users. Toggle rebillable off and the picker hides
          (its current value is preserved in state for when it's toggled
          back on). */}
      {value.isBillable && (
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Product/service
          </label>
          <SearchableSelect<string>
            options={itemOptions}
            value={value.qbItemId ?? ''}
            onChange={(v) => update('qbItemId', v ?? '')}
            placeholder="Select a Product/service…"
            loading={loading}
            emptyText="No items in your QuickBooks company"
          />
          <p className="text-xs text-gray-500 mt-1">
            Shows up in QuickBooks&apos; <span className="font-medium">Product/service</span> column when
            you add this expense to a customer&apos;s invoice. Pick &ldquo;None&rdquo; to leave it blank.
          </p>
          {isAutoDetectedDefault && (
            <p className="text-xs text-emerald-700 mt-0.5">
              Using your default from Settings → QuickBooks
            </p>
          )}
        </div>
      )}

      {/* ─── Class (cost center / property) ─────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
          Class
        </label>
        <SearchableSelect<string>
          options={classOptions}
          value={value.classId || null}
          onChange={(v) => update('classId', v ?? '')}
          placeholder="Select a class…"
          loading={loading}
          emptyText="No classes in your QuickBooks company"
        />
        {expense.propertyId &&
          defaults.classMappings.find((m) => m.propertyId === expense.propertyId) && (
            <p className="text-xs text-gray-500 mt-1">
              Default for this property:{' '}
              <span className="font-medium">
                {
                  defaults.classMappings.find((m) => m.propertyId === expense.propertyId)
                    ?.qbClassName
                }
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
          value={value.description}
          onChange={(e) => update('description', e.target.value)}
          rows={2}
          placeholder="Goes into the QuickBooks line description and PrivateNote."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* ─── Sales tax ──────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
          Sales tax
        </label>
        <SearchableSelect<string>
          options={taxCodeOptions}
          value={value.qbTaxCodeId ?? ''}
          onChange={(v) => update('qbTaxCodeId', v ?? '')}
          placeholder="Select a sales-tax rate…"
          loading={loading}
          emptyText="No tax codes in your QuickBooks company"
        />
        <p className="text-xs text-gray-500 mt-1">
          QuickBooks computes the tax from this rate on the pre-tax subtotal. Defaulted from
          the receipt&apos;s detected taxes — change it if needed.
        </p>
      </div>

      {/* ─── Amount (subtotal + selected-rate tax + total) ──── */}
      {expense.expenseAmount !== undefined && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1 text-sm">
          {(value.qbTaxCodeId || receiptTax > 0) && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Subtotal (pre-tax)</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">
                  {taxFromSelectedRate ? 'Tax (selected rate)' : 'Tax (from receipt)'}
                </span>
                <span className="font-medium text-gray-900">{formatCurrency(previewTax)}</span>
              </div>
            </>
          )}
          <div
            className={`flex justify-between ${
              value.qbTaxCodeId || receiptTax > 0 ? 'pt-1 border-t border-gray-200' : ''
            }`}
          >
            <span className="text-gray-600">
              {taxFromSelectedRate && value.qbTaxCodeId ? 'Estimated total' : 'Total amount'}
            </span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(
                value.qbTaxCodeId || receiptTax > 0 ? previewTotal : expense.expenseAmount
              )}
            </span>
          </div>
        </div>
      )}

      {/* ─── Paid from (Purchase only) ──────────────────────── */}
      {value.qbEntityType === 'purchase' && (
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Paid from
          </label>
          <SearchableSelect<string>
            options={paymentAccountOptions}
            value={value.paymentAccountId || null}
            onChange={(v) => update('paymentAccountId', v ?? '')}
            placeholder="Select a payment account…"
            loading={loading}
            emptyText="No payment accounts found"
          />
        </div>
      )}

      {/* ─── Receipt attachment ─────────────────────────────── */}
      <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={value.includeReceipt}
          onChange={(e) => update('includeReceipt', e.target.checked)}
          disabled={!expense.hasReceipt}
          className="mt-0.5"
        />
        <span>
          Include receipt attachment
          {!expense.hasReceipt && (
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
    </div>
  )
}
