'use client'

import React, { useEffect, useRef, useState } from 'react'
import { BarsArrowDownIcon, BarsArrowUpIcon } from '@heroicons/react/24/outline'
import type { ExpenseSortField, ExpenseSortState } from '@/services/types/expenseFilterPreset'

const SORT_OPTIONS: {
  field: ExpenseSortField
  label: string
  ascLabel: string
  descLabel: string
}[] = [
  { field: 'expenseDate', label: 'Transaction date', ascLabel: 'Oldest first', descLabel: 'Newest first' },
  { field: 'createdAt',   label: 'Date added',       ascLabel: 'Oldest first', descLabel: 'Newest first' },
  { field: 'amount',      label: 'Amount',           ascLabel: 'Low to high',  descLabel: 'High to low' },
]

interface SortDropdownProps {
  value: ExpenseSortState
  onChange: (next: ExpenseSortState) => void
}

/**
 * Sort trigger + popover for /expenses. Same UX as the receipts page sort
 * control (receipts/page.tsx) but controlled over ExpenseSortState so the
 * choice travels through the URL, saved views, and export.
 */
export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const current = SORT_OPTIONS.find((o) => o.field === value.field) ?? SORT_OPTIONS[0]
  const currentLabel = `${current.label}: ${value.direction === 'desc' ? current.descLabel : current.ascLabel}`

  const select = (field: ExpenseSortField, direction: 'asc' | 'desc') => {
    onChange({ field, direction })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
        title="Sort"
      >
        {value.direction === 'desc' ? (
          <BarsArrowDownIcon className="w-4 h-4" />
        ) : (
          <BarsArrowUpIcon className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{currentLabel}</span>
        <span className="sm:hidden">Sort</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 space-y-3">
          <span className="text-sm font-semibold text-gray-900">Sort by</span>
          {SORT_OPTIONS.map((option) => {
            const isSelected = value.field === option.field
            return (
              <div key={option.field} className="space-y-1">
                <div className="text-xs font-medium text-gray-500">{option.label}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => select(option.field, 'desc')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected && value.direction === 'desc'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.descLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => select(option.field, 'asc')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected && value.direction === 'asc'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.ascLabel}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
