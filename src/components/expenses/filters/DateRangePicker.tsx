'use client'

import React, { useEffect, useRef, useState } from 'react'
import { CalendarDaysIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import type { DateRangePreset, ExpenseDateBasis, ExpenseFilterState } from '@/services/types/expenseFilterPreset'
import { resolveDateRange } from '@/services/types/expenseFilterPreset'

const BASIS_CHOICES: { value: ExpenseDateBasis; label: string }[] = [
  { value: 'expenseDate', label: 'Transaction date' },
  { value: 'createdAt',   label: 'Date added' },
]

const PRESET_CHOICES: { value: DateRangePreset; label: string }[] = [
  { value: 'allTime',     label: 'All time' },
  { value: 'thisMonth',   label: 'This month' },
  { value: 'lastMonth',   label: 'Last month' },
  { value: 'thisQuarter', label: 'This quarter' },
  { value: 'ytd',         label: 'Year to date' },
  { value: 'custom',      label: 'Custom range' },
]

interface DateRangePickerProps {
  value: ExpenseFilterState['dateRange']
  onChange: (next: ExpenseFilterState['dateRange']) => void
}

/**
 * Date-range trigger + popover. Stores the preset choice (not resolved dates)
 * so that saved views re-resolve "Last month" correctly each time.
 *
 * Pattern adapted from src/components/analytics/shared/AnalyticsFilters.tsx
 * but kept self-contained — analytics uses its own Zustand store, expenses
 * use a plain controlled-component prop.
 */
export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [draftStart, setDraftStart] = useState(value.customStart || '')
  const [draftEnd, setDraftEnd] = useState(value.customEnd || '')

  useEffect(() => {
    setDraftStart(value.customStart || '')
    setDraftEnd(value.customEnd || '')
  }, [value.customStart, value.customEnd])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const formatTriggerLabel = () => {
    // Non-default basis is called out in the trigger so it's obvious the range
    // applies to when the expense was added, not when it happened.
    const basisSuffix = value.basis === 'createdAt' ? ' · Date added' : ''
    if (value.preset !== 'custom') {
      return (PRESET_CHOICES.find((p) => p.value === value.preset)?.label || 'This month') + basisSuffix
    }
    const { startDate, endDate } = resolveDateRange(value)
    if (!startDate && !endDate) return `Custom range${basisSuffix}`
    if (startDate && endDate) return `${startDate} → ${endDate}${basisSuffix}`
    return (startDate || endDate || 'Custom range') + basisSuffix
  }

  const handlePresetClick = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      onChange({ ...value, preset: 'custom', customStart: draftStart || null, customEnd: draftEnd || null })
    } else {
      onChange({ ...value, preset, customStart: null, customEnd: null })
      setOpen(false)
    }
  }

  const handleApplyCustom = () => {
    onChange({ ...value, preset: 'custom', customStart: draftStart || null, customEnd: draftEnd || null })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
          open
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <CalendarDaysIcon className="w-4 h-4" />
        <span className="font-medium">{formatTriggerLabel()}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2">
          <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Filter by</p>
          <div className="px-3 pb-2 flex gap-2">
            {BASIS_CHOICES.map((choice) => (
              <button
                key={choice.value}
                type="button"
                onClick={() => onChange({ ...value, basis: choice.value })}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                  value.basis === choice.value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {choice.label}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-2">
            <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Quick select</p>
            {PRESET_CHOICES.filter((p) => p.value !== 'custom').map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetClick(preset.value)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  value.preset === preset.value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 mt-2 pt-2">
            <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Custom range</p>
            <div className="px-3 space-y-2">
              <div>
                <label className="text-xs text-gray-500">Start</label>
                <input
                  type="date"
                  value={draftStart}
                  onChange={(e) => setDraftStart(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">End</label>
                <input
                  type="date"
                  value={draftEnd}
                  onChange={(e) => setDraftEnd(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!draftStart && !draftEnd}
                className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
