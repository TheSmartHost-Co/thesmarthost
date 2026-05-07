'use client'

import React, { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { getReceiptById } from '@/services/receiptService'
import type { ReceiptDetail } from '@/services/types/receipt'

interface ReceiptDetailsPopupModalProps {
  /** When non-null, the popup is open and fetches details for this receipt. */
  receiptId: string | null
  onClose: () => void
  /** Header fallbacks used while detail is loading. */
  fallbackVendorName?: string | null
  fallbackTotal?: number | null
  fallbackExpenseDate?: string | null
}

const fmt = (n: number | null | undefined): string =>
  n == null ? '—' : `$${Number(n).toFixed(2)}`

/**
 * Read-only popup that shows the AI-extracted details for a single receipt
 * (subtotal, per-tax breakdown, total, line items). Mounted from inside the
 * Bulk Upload wizard's Assign step so the user can verify what was extracted
 * before committing it as an expense.
 */
const ReceiptDetailsPopupModal: React.FC<ReceiptDetailsPopupModalProps> = ({
  receiptId,
  onClose,
  fallbackVendorName,
  fallbackTotal,
  fallbackExpenseDate,
}) => {
  const [detail, setDetail] = useState<ReceiptDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!receiptId) {
      setDetail(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getReceiptById(receiptId)
      .then((res) => {
        if (cancelled) return
        if (res.status === 'success' && res.data) {
          setDetail(res.data)
        } else {
          setError(res.message || 'Failed to load receipt details')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Network error')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [receiptId])

  if (!receiptId) return null

  const vendorName = detail?.vendorName ?? fallbackVendorName ?? 'Receipt'
  const expenseDate = detail?.expenseDate ?? fallbackExpenseDate ?? null
  const total = detail?.total ?? fallbackTotal ?? null
  const lineItems = detail?.lineItems ?? []

  return (
    <Modal isOpen={true} onClose={onClose} style="w-full max-w-lg mx-4">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 pr-2">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {vendorName}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {fmt(total)} · {expenseDate || 'No date'}
              {detail?.paymentMethod ? ` · ${detail.paymentMethod}` : ''}
            </p>
          </div>
        </div>

        {loading && (
          <div className="py-10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="py-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && detail && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900 tabular-nums">{fmt(detail.subtotal)}</span>
              </div>
              {(detail.taxGst || detail.taxPst || detail.taxHst || detail.taxQst) && (
                <>
                  {detail.taxGst ? (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 pl-2">GST</span>
                      <span className="text-gray-600 tabular-nums">{fmt(detail.taxGst)}</span>
                    </div>
                  ) : null}
                  {detail.taxPst ? (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 pl-2">PST</span>
                      <span className="text-gray-600 tabular-nums">{fmt(detail.taxPst)}</span>
                    </div>
                  ) : null}
                  {detail.taxHst ? (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 pl-2">HST</span>
                      <span className="text-gray-600 tabular-nums">{fmt(detail.taxHst)}</span>
                    </div>
                  ) : null}
                  {detail.taxQst ? (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 pl-2">QST</span>
                      <span className="text-gray-600 tabular-nums">{fmt(detail.taxQst)}</span>
                    </div>
                  ) : null}
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax Total</span>
                <span className="text-gray-900 tabular-nums">{fmt(detail.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-1.5">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900 tabular-nums">{fmt(detail.total)}</span>
              </div>
            </div>

            {lineItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Line Items ({lineItems.length})
                </h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-12">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Unit $</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-gray-900">{item.name}</td>
                          <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                            {Math.round(Number(item.quantity) || 0)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                            {fmt(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                            {fmt(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ReceiptDetailsPopupModal
