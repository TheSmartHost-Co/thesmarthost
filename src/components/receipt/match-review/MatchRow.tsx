'use client'

import React, { useState } from 'react'
import { TrashIcon, ArrowUturnLeftIcon, PencilIcon, CheckIcon, PlusCircleIcon } from '@heroicons/react/24/outline'
import SearchableSelect from '@/components/shared/SearchableSelect'
import type { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import type { ReviewRow } from '@/hooks/useReceiptMatchReview'
import MatchConfidenceBadge from './MatchConfidenceBadge'

interface MatchRowProps {
  row: ReviewRow
  supplyListOptions: SearchableSelectOption<string>[]
  isDuplicate: boolean
  onMatchChange: (supplyListItemId: string | null) => void
  onMarkNew: () => void
  onFieldChange: (field: string, value: string | number) => void
  onDelete: () => void
  onUndelete: () => void
}

const fmt = (v: number) => `$${Number(v).toFixed(2)}`

export default function MatchRow({
  row,
  supplyListOptions,
  isDuplicate,
  onMatchChange,
  onMarkNew,
  onFieldChange,
  onDelete,
  onUndelete,
}: MatchRowProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (row.isDeleted) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl opacity-60">
        <div className="flex-1 line-through text-gray-400 text-sm">
          {row.name} &times; {row.quantity}
        </div>
        <button
          onClick={onUndelete}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
          Undo
        </button>
      </div>
    )
  }

  return (
    <div className={`border rounded-xl transition-colors ${isDuplicate ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-white'}`}>
      {/* Receipt line item info */}
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Left: receipt item details */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={row.name}
                onChange={(e) => onFieldChange('name', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Item name"
              />
              <div className="flex gap-2">
                <div className="w-20">
                  <label className="block text-xs text-gray-400 mb-0.5">Qty</label>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => onFieldChange('quantity', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={0}
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs text-gray-400 mb-0.5">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={row.unitPrice}
                    onChange={(e) => onFieldChange('unitPrice', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={0}
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs text-gray-400 mb-0.5">Total</label>
                  <div className="px-2 py-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
                    {fmt(row.totalPrice)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Done
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{row.name}</p>
                <p className="text-xs text-gray-500">
                  {row.quantity} &times; {fmt(row.unitPrice)} = {fmt(row.totalPrice)}
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit item"
              >
                <PencilIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Center: confidence badge */}
        <div className="flex-shrink-0 pt-0.5">
          <MatchConfidenceBadge score={row.matchScore} matchType={row.matchType} />
        </div>

        {/* Right: delete button */}
        <button
          onClick={onDelete}
          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove item"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Match assignment */}
      <div className="px-4 pb-3 border-t border-gray-100 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 flex-shrink-0 w-16">Match to:</span>
          {row.isNew ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                <PlusCircleIcon className="w-3.5 h-3.5" />
                New Item
              </span>
              <button
                onClick={() => onMatchChange(null)}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="flex-1">
              <SearchableSelect
                options={supplyListOptions}
                value={row.assignedItemId}
                onChange={onMatchChange}
                placeholder="Select supply list item..."
                clearable
                headerAction={{
                  label: 'Create as New Item',
                  onClick: onMarkNew,
                }}
              />
            </div>
          )}
        </div>
        {isDuplicate && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Duplicate match — another item is also matched to this supply list item
          </div>
        )}
      </div>
    </div>
  )
}
