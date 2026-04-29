'use client'

import React, { useMemo, useState } from 'react'
import { DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline'
import SearchableSelect, {
  SearchableSelectOption,
} from '@/components/shared/SearchableSelect'
import Modal from '@/components/shared/modal'
import ReceiptDetailsPopupModal from '../ReceiptDetailsPopupModal'
import type { Property } from '@/services/types/property'
import type { BulkRowState } from '../BulkUploadReceiptModal'

const isPdf = (mt?: string) => mt === 'application/pdf'

interface AssignReceiptsStepProps {
  rows: BulkRowState[]
  properties: Property[]
  propertiesLoading: boolean
  onUpdateRow: (id: string, patch: Partial<BulkRowState>) => void
  onBulkAssign: (patch: { propertyId?: string; expenseMonth?: string }) => void
}

const AssignReceiptsStep: React.FC<AssignReceiptsStepProps> = ({
  rows,
  properties,
  propertiesLoading,
  onUpdateRow,
  onBulkAssign,
}) => {
  const [bulkProperty, setBulkProperty] = useState<string | null>(null)
  const [bulkMonth, setBulkMonth] = useState('')
  const [previewRow, setPreviewRow] = useState<BulkRowState | null>(null)
  const [detailsRow, setDetailsRow] = useState<BulkRowState | null>(null)

  const propertyOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      properties.map((p) => ({
        value: p.id,
        label: p.listingName || p.address || 'Unnamed Property',
        secondaryLabel: p.address || undefined,
      })),
    [properties]
  )

  const visibleRows = rows.filter(
    (r) => r.status !== 'failed' && r.status !== 'skipped' && r.receiptId
  )
  const incompleteCount = visibleRows.filter(
    (r) => r.applyAsExpense && (!r.propertyId || !r.expenseMonth)
  ).length

  const applyBulk = () => {
    if (!bulkProperty && !bulkMonth) return
    onBulkAssign({
      propertyId: bulkProperty || undefined,
      expenseMonth: bulkMonth || undefined,
    })
  }

  return (
    <div className="space-y-4">
      {/* Bulk-assign bar */}
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
        <p className="text-sm font-semibold text-gray-900 mb-3">
          Assign all at once
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Property
            </label>
            <SearchableSelect
              options={propertyOptions}
              value={bulkProperty}
              onChange={(v) => setBulkProperty(v)}
              placeholder={propertiesLoading ? 'Loading…' : 'Select property…'}
              loading={propertiesLoading}
              clearable
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Month
            </label>
            <input
              type="month"
              value={bulkMonth}
              onChange={(e) => setBulkMonth(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={applyBulk}
            disabled={!bulkProperty && !bulkMonth}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply to all
          </button>
        </div>
      </div>

      {/* Per-row assignment table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[64px_1fr_120px_220px_140px_120px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
          <span></span>
          <span>Receipt</span>
          <span></span>
          <span>Property</span>
          <span>Month</span>
          <span>Apply as expense</span>
        </div>
        <div className="divide-y divide-gray-100 max-h-[24rem] overflow-y-auto">
          {visibleRows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[64px_1fr_120px_220px_140px_120px] gap-3 px-4 py-3 items-center"
            >
              <button
                type="button"
                onClick={() => setPreviewRow(row)}
                title="Click to preview receipt"
                className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 hover:border-purple-400 hover:shadow-sm transition-all flex items-center justify-center overflow-hidden cursor-zoom-in"
              >
                {row.previewUrl && !isPdf(row.file.type) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.previewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <DocumentTextIcon className="w-7 h-7 text-gray-400" />
                )}
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {row.extracted?.vendorName || row.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {row.extracted?.expenseDate || 'No date'}
                </p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-base font-semibold text-gray-900 tabular-nums">
                  {row.extracted?.total != null
                    ? `$${Number(row.extracted.total).toFixed(2)}`
                    : '—'}
                </p>
                <button
                  type="button"
                  onClick={() => setDetailsRow(row)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Details
                </button>
              </div>
              <SearchableSelect
                options={propertyOptions}
                value={row.propertyId || null}
                onChange={(v) => onUpdateRow(row.id, { propertyId: v || undefined })}
                placeholder="Select…"
                loading={propertiesLoading}
                clearable
              />
              <input
                type="month"
                value={row.expenseMonth || ''}
                onChange={(e) =>
                  onUpdateRow(row.id, { expenseMonth: e.target.value || undefined })
                }
                className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={row.applyAsExpense}
                  onChange={(e) =>
                    onUpdateRow(row.id, { applyAsExpense: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                {row.applyAsExpense ? 'Yes' : 'No'}
              </label>
            </div>
          ))}
          {visibleRows.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              No scanned receipts to assign. Go back to retry failed scans.
            </div>
          )}
        </div>
      </div>

      {/* Receipt preview lightbox */}
      {previewRow && previewRow.previewUrl && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewRow(null)}
          style="w-full max-w-4xl mx-4"
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {previewRow.extracted?.vendorName || previewRow.file.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {previewRow.extracted?.total != null
                    ? `$${Number(previewRow.extracted.total).toFixed(2)}`
                    : '—'}{' '}
                  · {previewRow.extracted?.expenseDate || 'No date'} ·{' '}
                  {previewRow.file.name}
                </p>
              </div>
              <button
                onClick={() => setPreviewRow(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0"
                aria-label="Close preview"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
              {isPdf(previewRow.file.type) ? (
                <iframe
                  src={previewRow.previewUrl}
                  title={previewRow.file.name}
                  className="w-full h-[75vh]"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewRow.previewUrl}
                  alt={previewRow.file.name}
                  className="max-w-full max-h-[75vh] object-contain"
                />
              )}
            </div>
          </div>
        </Modal>
      )}

      {incompleteCount > 0 && (
        <p className="text-xs text-amber-700">
          {incompleteCount} receipt{incompleteCount === 1 ? '' : 's'} needs property
          and month before you can continue.
        </p>
      )}

      <ReceiptDetailsPopupModal
        receiptId={detailsRow?.receiptId ?? null}
        onClose={() => setDetailsRow(null)}
        fallbackVendorName={detailsRow?.extracted?.vendorName}
        fallbackTotal={detailsRow?.extracted?.total}
        fallbackExpenseDate={detailsRow?.extracted?.expenseDate}
      />
    </div>
  )
}

export default AssignReceiptsStep
