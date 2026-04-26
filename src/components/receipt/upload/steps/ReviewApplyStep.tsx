'use client'

import React, { useMemo } from 'react'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import type { Property } from '@/services/types/property'
import type { BulkRowState } from '../BulkUploadReceiptModal'

interface ReviewApplyStepProps {
  rows: BulkRowState[]
  properties: Property[]
  applying: boolean
  appliedCount: number
  onRetryRow: (row: BulkRowState) => void
}

const ReviewApplyStep: React.FC<ReviewApplyStepProps> = ({
  rows,
  properties,
  appliedCount,
  onRetryRow,
}) => {
  const propertyById = useMemo(() => {
    const map = new Map<string, Property>()
    properties.forEach((p) => map.set(p.id, p))
    return map
  }, [properties])

  const toApply = rows.filter(
    (r) => r.applyAsExpense && r.receiptId && r.status !== 'failed' && r.status !== 'skipped'
  )
  const willSkip = rows.filter((r) => !r.applyAsExpense && r.receiptId)

  return (
    <div className="space-y-4">
      {appliedCount === 0 ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-gray-900">
            Ready to apply {toApply.length} receipt{toApply.length === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {willSkip.length > 0 &&
              `${willSkip.length} receipt${willSkip.length === 1 ? '' : 's'} will stay in your receipts list without being applied. `}
            Click <span className="font-medium">Apply Receipts</span> to create expenses.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-gray-900">
            Done — {appliedCount} receipt{appliedCount === 1 ? '' : 's'} applied
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Expenses created. You can close this dialog or retry any failed rows below.
          </p>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_180px_100px_100px_120px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
          <span>Receipt</span>
          <span>Property</span>
          <span>Month</span>
          <span className="text-right">Total</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-gray-100 max-h-[26rem] overflow-y-auto">
          {rows.map((row) => {
            const property = row.propertyId ? propertyById.get(row.propertyId) : null
            const propertyLabel = property
              ? property.listingName || property.address || 'Unnamed'
              : '—'
            return (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_180px_100px_100px_120px] gap-3 px-4 py-3 items-center text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {row.extracted?.vendorName || row.file.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {row.applyAsExpense ? 'Will create expense' : 'Receipt only (no expense)'}
                  </p>
                </div>
                <span className="text-gray-700 truncate">{propertyLabel}</span>
                <span className="text-gray-700">{row.expenseMonth || '—'}</span>
                <span className="text-right text-gray-900 font-medium">
                  {row.extracted?.total != null
                    ? `$${Number(row.extracted.total).toFixed(2)}`
                    : '—'}
                </span>
                <div>
                  {row.status === 'applied' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                      <CheckCircleIcon className="w-4 h-4" />
                      Applied
                    </span>
                  )}
                  {row.status === 'applying' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Applying
                    </span>
                  )}
                  {row.status === 'apply-failed' && (
                    <button
                      onClick={() => onRetryRow(row)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline"
                      title={row.errorMessage}
                    >
                      <ExclamationCircleIcon className="w-4 h-4" />
                      Retry
                    </button>
                  )}
                  {row.status === 'scanned' && (
                    <span className="text-xs text-gray-500">Pending</span>
                  )}
                  {row.status === 'failed' && (
                    <span className="text-xs text-red-600">Scan failed</span>
                  )}
                  {row.status === 'skipped' && (
                    <span className="text-xs text-gray-400">Skipped</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ReviewApplyStep
