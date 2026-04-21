'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/shared/modal'
import { useReceiptMatchReview } from '@/hooks/useReceiptMatchReview'
import type { ReceiptLineItem, ScanReceiptMatch, ConfirmedMapping } from '@/services/types/receipt'
import type { SupplyListItem } from '@/services/types/supplyList'
import type { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import MatchRow from './MatchRow'
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface ReceiptMatchReviewModalProps {
  isOpen: boolean
  onClose: () => void
  receiptId: string
  supplyListId: string
  receiptLineItems: ReceiptLineItem[]
  supplyListItems: SupplyListItem[]
  initialSuggestions?: ScanReceiptMatch[] | null
  onApply: (mapping: ConfirmedMapping[], deletedLineItemIds: string[]) => Promise<void>
}

export default function ReceiptMatchReviewModal({
  isOpen,
  onClose,
  receiptId,
  supplyListId,
  receiptLineItems,
  supplyListItems,
  initialSuggestions,
  onApply,
}: ReceiptMatchReviewModalProps) {
  const {
    rows,
    loading,
    duplicateIds,
    fetchSuggestions,
    setRowMatch,
    setRowNew,
    updateRowField,
    deleteRow,
    undeleteRow,
    buildMapping,
    deletedLineItemIds,
    reset,
  } = useReceiptMatchReview(receiptLineItems, initialSuggestions)

  const [applying, setApplying] = useState(false)

  // Fetch suggestions on mount if no initial suggestions provided
  useEffect(() => {
    if (isOpen && !initialSuggestions && receiptId && supplyListId) {
      fetchSuggestions(receiptId, supplyListId)
    }
  }, [isOpen, receiptId, supplyListId, initialSuggestions, fetchSuggestions])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset()
      setApplying(false)
    }
  }, [isOpen, reset])

  const supplyListOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      supplyListItems.map((item) => ({
        value: item.id,
        label: item.name,
        secondaryLabel: `Qty: ${item.quantity}${item.unitCost != null ? ` · $${item.unitCost.toFixed(2)}` : ''}`,
      })),
    [supplyListItems]
  )

  const activeRows = rows.filter((r) => !r.isDeleted)
  const deletedRows = rows.filter((r) => r.isDeleted)
  const matchedCount = activeRows.filter((r) => !r.isNew && r.assignedItemId).length
  const newCount = activeRows.filter((r) => r.isNew).length
  const unmatchedCount = activeRows.filter((r) => !r.isNew && !r.assignedItemId).length
  const duplicateCount = duplicateIds.size

  const handleApply = async () => {
    setApplying(true)
    try {
      await onApply(buildMapping(), deletedLineItemIds)
    } finally {
      setApplying(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-4xl w-11/12 max-h-[85vh] overflow-hidden">
      <div className="flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Review Supply List Matches</h2>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {matchedCount} matched
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {newCount} new
            </span>
            {unmatchedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                {unmatchedCount} unmatched
              </span>
            )}
            {deletedRows.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                {deletedRows.length} removed
              </span>
            )}
            {duplicateCount > 0 && (
              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500">Loading match suggestions...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active rows */}
              {activeRows.map((row) => (
                <MatchRow
                  key={row.receiptLineItemId}
                  row={row}
                  supplyListOptions={supplyListOptions}
                  isDuplicate={duplicateIds.has(row.receiptLineItemId)}
                  onMatchChange={(id) => setRowMatch(row.receiptLineItemId, id)}
                  onMarkNew={() => setRowNew(row.receiptLineItemId)}
                  onFieldChange={(field, value) => updateRowField(row.receiptLineItemId, field, value)}
                  onDelete={() => deleteRow(row.receiptLineItemId)}
                  onUndelete={() => undeleteRow(row.receiptLineItemId)}
                />
              ))}

              {/* Deleted rows */}
              {deletedRows.length > 0 && (
                <>
                  <div className="text-xs text-gray-400 font-medium pt-2">Removed items</div>
                  {deletedRows.map((row) => (
                    <MatchRow
                      key={row.receiptLineItemId}
                      row={row}
                      supplyListOptions={supplyListOptions}
                      isDuplicate={false}
                      onMatchChange={() => {}}
                      onMarkNew={() => {}}
                      onFieldChange={() => {}}
                      onDelete={() => {}}
                      onUndelete={() => undeleteRow(row.receiptLineItemId)}
                    />
                  ))}
                </>
              )}

              {rows.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No receipt line items to match
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {activeRows.length} item{activeRows.length !== 1 ? 's' : ''} will be applied
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={applying || loading || activeRows.length === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applying ? 'Applying...' : `Apply (${activeRows.length} items)`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
