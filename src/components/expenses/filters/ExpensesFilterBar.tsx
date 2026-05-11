'use client'

import React, { useEffect, useRef, useState } from 'react'
import { FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import SearchableSelect, { type SearchableSelectOption } from '@/components/shared/SearchableSelect'
import MultiSelectChips from './MultiSelectChips'
import DateRangePicker from './DateRangePicker'
import type {
  ExpenseFilterState,
  HasReceiptFilter,
} from '@/services/types/expenseFilterPreset'
import { countActiveFilters } from '@/services/types/expenseFilterPreset'
import type {
  PaymentStatus,
  QbSyncStatus,
  ReceiptStatus,
} from '@/services/types/expense'
import type { Property } from '@/services/types/property'
import type { ExpenseCategory } from '@/services/types/expenseCategories'

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'paid',       label: 'Paid' },
  { value: 'pending',    label: 'Pending' },
  { value: 'reimbursed', label: 'Reimbursed' },
  { value: 'cancelled',  label: 'Cancelled' },
]

const QB_SYNC_STATUS_OPTIONS: { value: QbSyncStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'synced',  label: 'Synced' },
  { value: 'failed',  label: 'Failed' },
]

const RECEIPT_STATUS_OPTIONS: { value: ReceiptStatus; label: string }[] = [
  { value: 'pending',  label: 'Pending' },
  { value: 'matched',  label: 'Matched' },
  { value: 'failed',   label: 'Failed' },
  { value: 'applied',  label: 'Applied' },
  { value: 'archived', label: 'Archived' },
]

const HAS_RECEIPT_OPTIONS: { value: HasReceiptFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'yes', label: 'Has receipt' },
  { value: 'no',  label: 'Missing receipt' },
]

interface ExpensesFilterBarProps {
  state: ExpenseFilterState
  onChange: (next: ExpenseFilterState) => void
  properties: Property[]
  categories: ExpenseCategory[]
}

/**
 * The redesigned filter bar for /expenses. Pure controlled component over
 * ExpenseFilterState — owns no fetching state, just emits changes.
 */
export default function ExpensesFilterBar({
  state,
  onChange,
  properties,
  categories,
}: ExpensesFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersRef = useRef<HTMLDivElement>(null)
  const activeCount = countActiveFilters(state)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false)
      }
    }
    if (filtersOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [filtersOpen])

  const propertyOptions: SearchableSelectOption<string>[] = properties.map((p) => ({
    value: p.id,
    label: [p.address, p.postalCode].filter(Boolean).join(', ') || p.id,
  }))

  // Category options come straight from the API-fetched list. The backend
  // lazy-seeds canonical defaults, so this list contains them automatically.
  const categoryOptions = categories.map((cat) => ({
    value: cat.code,
    label: cat.label,
    colorHex: cat.colorHex || '#6B7280',
  }))

  const update = (patch: Partial<ExpenseFilterState>) => onChange({ ...state, ...patch })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={state.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search vendor or description…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date range */}
        <DateRangePicker
          value={state.dateRange}
          onChange={(dateRange) => update({ dateRange })}
        />

        {/* Property multi-select */}
        <div className="min-w-[220px]">
          <SearchableSelect<string>
            multiSelect
            options={propertyOptions}
            value={state.propertyIds}
            onChange={(propertyIds) => update({ propertyIds })}
            placeholder="All properties"
            clearable
          />
        </div>

        {/* Filter popover */}
        <div ref={filtersRef} className="relative">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
              filtersOpen || activeCount > 0
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            <span className="font-medium">More filters</span>
            {activeCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                {activeCount}
              </span>
            )}
          </button>

          {filtersOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">More filters</span>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange({
                      ...state,
                      categories: [],
                      paymentStatuses: [],
                      qbSyncStatuses: [],
                      hasReceipt: 'any',
                      receiptStatuses: [],
                    })}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Category</label>
                <MultiSelectChips
                  options={categoryOptions}
                  value={state.categories}
                  onChange={(categories) => update({ categories })}
                  ariaLabel="Filter by category"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Payment status</label>
                <MultiSelectChips
                  options={PAYMENT_STATUS_OPTIONS}
                  value={state.paymentStatuses}
                  onChange={(paymentStatuses) => update({ paymentStatuses })}
                  ariaLabel="Filter by payment status"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">QuickBooks sync</label>
                <MultiSelectChips
                  options={QB_SYNC_STATUS_OPTIONS}
                  value={state.qbSyncStatuses}
                  onChange={(qbSyncStatuses) => update({ qbSyncStatuses })}
                  ariaLabel="Filter by QuickBooks sync status"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Has receipt</label>
                <MultiSelectChips
                  options={HAS_RECEIPT_OPTIONS}
                  value={[state.hasReceipt]}
                  onChange={(arr) => {
                    // Behave as single-select tri-state: keep the most recent click.
                    const next = (arr.find((v) => v !== state.hasReceipt) ?? state.hasReceipt) as HasReceiptFilter
                    update({ hasReceipt: next, receiptStatuses: next === 'no' ? [] : state.receiptStatuses })
                  }}
                  ariaLabel="Filter by receipt presence"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Receipt status
                  {state.hasReceipt === 'no' && (
                    <span className="ml-2 text-[10px] font-normal text-gray-400 normal-case tracking-normal">
                      (disabled — set Has receipt to "Has receipt" first)
                    </span>
                  )}
                </label>
                <div className={state.hasReceipt === 'no' ? 'opacity-50 pointer-events-none' : ''}>
                  <MultiSelectChips
                    options={RECEIPT_STATUS_OPTIONS}
                    value={state.receiptStatuses}
                    onChange={(receiptStatuses) => update({ receiptStatuses })}
                    ariaLabel="Filter by linked receipt status"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active-filters indicator + reset (shown in main row when there are any) */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({
              ...state,
              propertyIds: [],
              categories: [],
              paymentStatuses: [],
              qbSyncStatuses: [],
              hasReceipt: 'any',
              receiptStatuses: [],
              search: '',
              dateRange: { preset: 'thisMonth', customStart: null, customEnd: null },
            })}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            title="Clear all filters"
          >
            <XMarkIcon className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>
    </div>
  )
}
