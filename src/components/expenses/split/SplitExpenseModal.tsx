'use client'

import { notifyError } from '@/utils/notify'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import SearchableSelect from '@/components/shared/SearchableSelect'
import type { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import { useNotificationStore } from '@/store/useNotificationStore'
import { formatCurrency, splitExpense } from '@/services/expenseService'
import { getProperties } from '@/services/propertyService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import { getReceiptById } from '@/services/receiptService'
import type { Expense, ExpenseLineItem, SplitExpenseChildOverrides, SplitExpenseResponseData } from '@/services/types/expense'
import type { ReceiptExtraCharge } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'
import type { ExpenseCategory } from '@/services/types/expenseCategories'

interface SplitExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  /** The expense being split. Parent of all created child(ren). */
  expense: Expense
  /** Pre-loaded line items so we don't re-fetch — parent modal already has them. */
  lineItems: ExpenseLineItem[]
  userId: string
  /** Called with both expenses after a successful split. */
  onSplit: (result: SplitExpenseResponseData) => void
  zIndex?: number
}

/** Round to cents — mirrors the backend round2 helper. */
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100

const sumFees = (fees: ReceiptExtraCharge[] | null | undefined): number =>
  Array.isArray(fees) ? fees.reduce((s, c) => s + (Number(c?.amount) || 0), 0) : 0

const SplitExpenseModal: React.FC<SplitExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  lineItems,
  userId,
  onSplit,
  zIndex = 70,
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)

  // Reference data (loaded once on open)
  const [properties, setProperties] = useState<Property[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [refDataLoading, setRefDataLoading] = useState(false)

  // Receipt preview + reconciliation warning. Fetched internally when the
  // expense links a receipts row (receiptId). Legacy direct-attach expenses
  // (receipt_path only, no receiptId) get no preview — same as ExpenseViewerModal.
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null)
  const [receiptMimeType, setReceiptMimeType] = useState<string | null>(null)
  const [reconciliationWarning, setReconciliationWarning] = useState<string | null>(null)

  // Form state. Category initializes inline from the parent expense so it's
  // pre-populated on the very first render — not after a useEffect tick (which
  // would show the placeholder for a frame, especially while categories load).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [newPropertyId, setNewPropertyId] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState<string>(expense.category || '')
  // Manual amount path: when an expense has no line items, the user types
  // a subtotal and we let proportional tax auto-fill.
  const [manualSubtotal, setManualSubtotal] = useState<string>('')
  // Editable totals on the new expense. Empty string === "use auto-calc".
  const [totalAmountOverride, setTotalAmountOverride] = useState<string>('')
  const [taxAmountOverride, setTaxAmountOverride] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // ──────────────────────────────────────────────────────────────────
  // Derived: split arithmetic — runs on every keystroke. Matches the
  // backend service formulas so the UI preview is what the user gets.
  // ──────────────────────────────────────────────────────────────────
  const hasLineItems = lineItems.length > 0
  const parentSubtotal = Number(expense.subtotal) || 0
  const parentTaxTotal = Number(expense.taxTotal) || 0
  const parentFeesSum = sumFees(expense.extraCharges)
  const parentAmount = Number(expense.amount) || 0

  const splitSubtotal = useMemo(() => {
    if (hasLineItems) {
      return round2(
        lineItems
          .filter((li) => selectedIds.has(li.id))
          .reduce((s, li) => s + (Number(li.totalCost) || 0), 0)
      )
    }
    const parsed = parseFloat(manualSubtotal)
    return Number.isFinite(parsed) ? round2(parsed) : 0
  }, [hasLineItems, lineItems, selectedIds, manualSubtotal])

  const ratio = parentSubtotal > 0 ? splitSubtotal / parentSubtotal : 0

  // Auto-calculated tax for the new expense (proportional, per-kind).
  const autoChildTaxTotal = round2(parentTaxTotal * ratio)
  const childTaxTotal = taxAmountOverride !== ''
    ? round2(parseFloat(taxAmountOverride) || 0)
    : autoChildTaxTotal

  // Total = subtotal + tax (fees stay on parent in V1).
  const autoChildTotal = round2(splitSubtotal + childTaxTotal)
  const childTotal = totalAmountOverride !== ''
    ? round2(parseFloat(totalAmountOverride) || 0)
    : autoChildTotal

  // Per-kind preview (matches backend allocation; shown read-only).
  const childTaxBreakdown = {
    gst: round2((Number(expense.taxGst) || 0) * ratio),
    pst: round2((Number(expense.taxPst) || 0) * ratio),
    hst: round2((Number(expense.taxHst) || 0) * ratio),
    qst: round2((Number(expense.taxQst) || 0) * ratio),
  }

  // Parent-after preview (derived by subtraction so the preview matches
  // what the backend will write).
  const parentSubAfter = round2(parentSubtotal - splitSubtotal)
  const parentTaxAfter = round2(parentTaxTotal - childTaxTotal)
  const parentAmountAfter = round2(parentSubAfter + parentFeesSum + parentTaxAfter)

  // ──────────────────────────────────────────────────────────────────
  // Load reference data when the modal opens
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setRefDataLoading(true)

    Promise.all([getProperties(userId), getCategoriesByUserId(userId)])
      .then(([propsRes, catsRes]) => {
        if (cancelled) return
        if (propsRes.status === 'success') setProperties(propsRes.data || [])
        if (catsRes.status === 'success') setCategories(catsRes.data || [])
      })
      .catch(() => {
        if (!cancelled) showNotification('Failed to load reference data', 'error')
      })
      .finally(() => {
        if (!cancelled) setRefDataLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId])

  // Reset form when the modal opens (defensive against reopens with stale state)
  useEffect(() => {
    if (!isOpen) return
    setSelectedIds(new Set())
    setNewPropertyId(null)
    setNewCategory(expense.category || '')
    setManualSubtotal('')
    setTotalAmountOverride('')
    setTaxAmountOverride('')
    setReceiptPreviewUrl(null)
    setReceiptMimeType(null)
    setReconciliationWarning(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, expense.id])

  // Fetch the linked receipt for image preview + reconciliation_warning. Only
  // for OCR-flow expenses (receiptId set). Legacy direct-attach expenses fall
  // back to the placeholder. Failures degrade silently — the modal still works.
  useEffect(() => {
    if (!isOpen || !expense.receiptId) return
    let cancelled = false
    getReceiptById(expense.receiptId)
      .then((res) => {
        if (cancelled) return
        if (res.status === 'success') {
          setReceiptPreviewUrl(res.data.signedUrl || null)
          setReceiptMimeType(res.data.mimeType || null)
          setReconciliationWarning(res.data.reconciliationWarning || null)
        }
      })
      .catch(() => { /* preview is optional — keep modal functional */ })
    return () => { cancelled = true }
  }, [isOpen, expense.receiptId])

  // ──────────────────────────────────────────────────────────────────
  // Picker options
  // ──────────────────────────────────────────────────────────────────
  // Exclude the parent's property — a split going back to the same property
  // makes no sense (just edit the existing expense).
  const propertyOptions: SearchableSelectOption<string>[] = properties
    .filter((p) => p.id !== expense.propertyId)
    .map((p) => ({
      value: p.id,
      label: p.listingName || p.address || 'Untitled property',
      secondaryLabel: p.address || undefined,
    }))

  const categoryOptions: SearchableSelectOption<string>[] = categories.map((c) => ({
    value: c.code,
    label: c.label,
    secondaryLabel: c.code,
  }))

  // ──────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────
  const canSubmit = (() => {
    if (submitting) return false
    if (!newPropertyId) return false
    if (splitSubtotal <= 0) return false
    if (splitSubtotal >= parentSubtotal) return false
    return true
  })()

  const handleSubmit = async () => {
    if (!canSubmit || !newPropertyId) return

    const overrides: SplitExpenseChildOverrides = { propertyId: newPropertyId }
    if (newCategory && newCategory !== expense.category) {
      overrides.category = newCategory
    }
    if (!hasLineItems) {
      overrides.subtotalOverride = splitSubtotal
    }
    // Tax override travels only when the user actually changed the field.
    // Otherwise the backend re-derives proportionally — same value, but lets
    // the round-trip invariant be enforced server-side.
    if (taxAmountOverride !== '') {
      overrides.taxTotalOverride = childTaxTotal
    }

    setSubmitting(true)
    try {
      const res = await splitExpense(expense.id, {
        selectedLineItemIds: hasLineItems ? Array.from(selectedIds) : [],
        newExpense: overrides,
      })

      if (res.status === 'success' && res.data) {
        const propLabel = propertyOptions.find((p) => p.value === newPropertyId)?.label || 'new property'
        showNotification(`Expense split. New expense for ${propLabel} created.`, 'success')
        if (res.data.requiresQbReSync) {
          // Distinct second toast — same UX pattern as ExpenseViewerModal's
          // resend flow. Stays on screen long enough to read.
          showNotification('Both expenses need to be re-synced to QuickBooks.', 'info')
        }
        onSplit(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Split failed', 'error')
      }
    } catch (err) {
      console.error('splitExpense error:', err)
      notifyError(err, 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      style="p-0 max-w-5xl w-11/12 max-h-[90vh] flex flex-col overflow-hidden"
      zIndex={zIndex}
      closable={!submitting}
    >
      {/* Header — close X is provided by the shared Modal component (top-right
          absolute-positioned), so we don't add another one here. */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200 bg-white">
        <ArrowsRightLeftIcon className="w-5 h-5 text-amber-600 mr-2" />
        <h2 className="text-lg font-semibold text-amber-700">Split item</h2>
      </div>

      {/* Body — two columns on md+, stacked on mobile */}
      <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* LEFT: receipt preview. Mirrors ReceiptDetailModal's pattern: <img>
            for images, <iframe> for PDFs (and anything non-image). Mime type
            comes from the linked receipt when available, otherwise the legacy
            denormalized column on the expense row. */}
        <div className="bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden">
          {receiptPreviewUrl ? (
            (() => {
              const effectiveMime = receiptMimeType || expense.receiptMimeType || ''
              const isImage = effectiveMime.startsWith('image/')
              return isImage ? (
                <div className="flex-1 p-4 flex items-start justify-center overflow-auto">
                  <img
                    src={receiptPreviewUrl}
                    alt={expense.receiptOriginalName || 'Receipt'}
                    className="max-w-full h-auto rounded shadow-sm"
                  />
                </div>
              ) : (
                <iframe
                  src={receiptPreviewUrl}
                  className="flex-1 w-full border-0"
                  title={expense.receiptOriginalName || 'Receipt PDF'}
                />
              )
            })()
          ) : (
            <div className="flex-1 flex items-start justify-center pt-12 text-sm text-gray-400">
              Receipt preview unavailable
            </div>
          )}
        </div>

        {/* RIGHT: form */}
        <div className="p-6 space-y-5 overflow-auto">
          {/* Reconciliation banner — surfaces the receipt's stored warning so
              the user sees that splitting won't fix an underlying OCR mismatch. */}
          {reconciliationWarning && (
            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Receipt totals don't reconcile</p>
                <p className="text-xs">{reconciliationWarning}</p>
                <p className="text-xs mt-1">Splitting won't change that — fix the OCR data on the Receipt detail first if accuracy matters.</p>
              </div>
            </div>
          )}

          {/* Info banner */}
          <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p>
              Splitting creates a new expense with the same receipt. Categories, totals, and tax can be
              set independently. All other fields are copied from this expense.
            </p>
          </div>

          {/* Current expense summary */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Current item</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-gray-500">Property</div>
              <div className="text-gray-900 truncate">{expense.propertyName || '—'}</div>
              <div className="text-gray-500">Category</div>
              <div className="text-gray-900">{expense.category || '—'}</div>
              <div className="text-gray-500">Subtotal</div>
              <div className="text-gray-900">{formatCurrency(parentSubtotal, expense.currency)}</div>
              <div className="text-gray-500">Tax</div>
              <div className="text-gray-900">{formatCurrency(parentTaxTotal, expense.currency)}</div>
              <div className="text-gray-500">Total</div>
              <div className="text-gray-900 font-medium">{formatCurrency(parentAmount, expense.currency)}</div>
            </div>
          </section>

          {/* Fees-stay-on-parent disclosure (only when fees exist) */}
          {parentFeesSum > 0 && Array.isArray(expense.extraCharges) && (
            <section className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
                Fees & surcharges
              </h4>
              <ul className="text-sm space-y-1">
                {expense.extraCharges.map((fee, idx) => (
                  <li key={idx} className="flex justify-between pl-2 text-gray-700">
                    <span>{fee.label}</span>
                    <span>{formatCurrency(fee.amount, expense.currency)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                Fees ({formatCurrency(parentFeesSum, expense.currency)}) stay on this expense. To
                redistribute, edit either expense after splitting.
              </p>
            </section>
          )}

          {/* Line item picker — or manual subtotal fallback */}
          {hasLineItems ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Line items to move ({selectedIds.size} selected)
              </h3>
              <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-auto">
                {lineItems.map((li) => {
                  const checked = selectedIds.has(li.id)
                  return (
                    <label
                      key={li.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(li.id)}
                        className="w-4 h-4 text-amber-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 truncate">{li.description}</div>
                        {li.quantity > 1 && (
                          <div className="text-xs text-gray-500">Qty {li.quantity}</div>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 font-medium">
                        {formatCurrency(Number(li.totalCost) || 0, expense.currency)}
                      </div>
                    </label>
                  )
                })}
              </div>
            </section>
          ) : (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                No line items extracted
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                This receipt has no OCR line items. Enter the amount (excluding tax) to split off.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Split subtotal ({expense.currency || 'CAD'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualSubtotal}
                  onChange={(e) => setManualSubtotal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="0.00"
                />
              </div>
            </section>
          )}

          {/* New expense form */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">New expense</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Property *</label>
                <SearchableSelect
                  options={propertyOptions}
                  value={newPropertyId}
                  onChange={(val) => setNewPropertyId(val)}
                  placeholder="Select target property..."
                  loading={refDataLoading}
                  loadingText="Loading properties..."
                  emptyText={properties.length === 0 ? 'No properties' : 'No other properties available'}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <SearchableSelect
                  options={categoryOptions}
                  value={newCategory || null}
                  onChange={(val) => setNewCategory(val || '')}
                  placeholder="Select category..."
                  loading={refDataLoading}
                  emptyText="No categories"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalAmountOverride !== '' ? totalAmountOverride : autoChildTotal.toFixed(2)}
                    onChange={(e) => setTotalAmountOverride(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tax amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxAmountOverride !== '' ? taxAmountOverride : autoChildTaxTotal.toFixed(2)}
                    onChange={(e) => setTaxAmountOverride(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Per-kind tax preview (read-only) — surfaces how the auto-calc landed */}
              {parentTaxTotal > 0 && taxAmountOverride === '' && (
                <div className="text-xs text-gray-500 grid grid-cols-4 gap-2 pl-1">
                  {childTaxBreakdown.gst > 0 && <div>GST: {formatCurrency(childTaxBreakdown.gst, expense.currency)}</div>}
                  {childTaxBreakdown.pst > 0 && <div>PST: {formatCurrency(childTaxBreakdown.pst, expense.currency)}</div>}
                  {childTaxBreakdown.hst > 0 && <div>HST: {formatCurrency(childTaxBreakdown.hst, expense.currency)}</div>}
                  {childTaxBreakdown.qst > 0 && <div>QST: {formatCurrency(childTaxBreakdown.qst, expense.currency)}</div>}
                </div>
              )}
            </div>
          </section>

          {/* Live impact preview */}
          <section className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 space-y-1">
            <div className="font-medium text-gray-900 mb-1">Impact</div>
            <div className="flex justify-between">
              <span>Original total</span>
              <span>{formatCurrency(parentAmount, expense.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>This expense after split</span>
              <span>{formatCurrency(parentAmountAfter, expense.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>New expense</span>
              <span>{formatCurrency(childTotal, expense.currency)}</span>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-200 bg-white flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Splitting…' : 'Split'}
        </button>
      </div>
    </Modal>
  )
}

export default SplitExpenseModal
