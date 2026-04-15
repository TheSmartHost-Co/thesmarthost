'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  HomeModernIcon,
  UserCircleIcon,
  XMarkIcon,
  CheckIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import MobileFilterDrawer from '@/components/shared/MobileFilterDrawer'
import { DATE_PRESETS } from '@/services/analyticsService'
import type { Property } from '@/services/types/property'
import type {
  DateRange,
  CleanerGranularity,
  CleanerProjectStatus,
  InvoiceStatus,
} from '@/services/types/cleanerAnalytics'
import { STATUS_OPTIONS, INVOICE_STATUS_OPTIONS } from './constants'

export interface CleanerOption {
  id: string
  name: string
}

interface CleanerTimelineFiltersProps {
  dateRange: DateRange
  cleanerId: string | null
  propertyIds: string[]
  statuses: CleanerProjectStatus[]
  invoiceStatuses: InvoiceStatus[]
  granularity: CleanerGranularity
  properties: Property[]
  cleaners: CleanerOption[]
  hasActiveFilters: boolean
  onDateRangeChange: (range: DateRange) => void
  onCleanerIdChange: (id: string | null) => void
  onPropertyIdsChange: (ids: string[]) => void
  onStatusesChange: (statuses: CleanerProjectStatus[]) => void
  onInvoiceStatusesChange: (statuses: InvoiceStatus[]) => void
  onGranularityChange: (g: CleanerGranularity) => void
  onClearFilters: () => void
}

const GRANULARITY_OPTIONS: { value: CleanerGranularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function Dropdown({
  trigger,
  children,
  isOpen,
  onOpenChange,
  align = 'left',
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onOpenChange])

  return (
    <div ref={ref} className="relative">
      <div onClick={() => onOpenChange(!isOpen)}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CleanerTimelineFilters({
  dateRange,
  cleanerId,
  propertyIds,
  statuses,
  invoiceStatuses,
  granularity,
  properties,
  cleaners,
  hasActiveFilters,
  onDateRangeChange,
  onCleanerIdChange,
  onPropertyIdsChange,
  onStatusesChange,
  onInvoiceStatusesChange,
  onGranularityChange,
  onClearFilters,
}: CleanerTimelineFiltersProps) {
  const [dateOpen, setDateOpen] = useState(false)
  const [cleanerOpen, setCleanerOpen] = useState(false)
  const [propOpen, setPropOpen] = useState(false)
  const [customStart, setCustomStart] = useState(dateRange.startDate)
  const [customEnd, setCustomEnd] = useState(dateRange.endDate)

  const selectedCleaner = cleaners.find(c => c.id === cleanerId)

  const toggleStatus = (s: CleanerProjectStatus) => {
    if (statuses.includes(s)) {
      onStatusesChange(statuses.filter(x => x !== s))
    } else {
      onStatusesChange([...statuses, s])
    }
  }

  const toggleInvoiceStatus = (s: InvoiceStatus) => {
    if (invoiceStatuses.includes(s)) {
      onInvoiceStatusesChange(invoiceStatuses.filter(x => x !== s))
    } else {
      onInvoiceStatusesChange([...invoiceStatuses, s])
    }
  }

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const activeFilterCount = (cleanerId ? 1 : 0) + (propertyIds.length > 0 ? 1 : 0) + (statuses.length > 0 ? 1 : 0) + (invoiceStatuses.length > 0 ? 1 : 0)

  const mobileFilterContent = (
    <div className="space-y-4">
      {/* Date Range */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Date Range</p>
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map(preset => (
            <button key={preset.label} onClick={() => { onDateRangeChange(preset.getValue()); setMobileDrawerOpen(false) }}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
        </div>
      </div>

      {/* Cleaner */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Cleaner</p>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          <button onClick={() => onCleanerIdChange(null)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${!cleanerId ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'}`}>
            <span>All Cleaners</span>
            {!cleanerId && <CheckIcon className="h-3.5 w-3.5" />}
          </button>
          {cleaners.map(c => {
            const selected = cleanerId === c.id
            return (
              <button key={c.id} onClick={() => onCleanerIdChange(c.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${selected ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="truncate">{c.name}</span>
                {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Properties */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Properties</p>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {properties.map(prop => {
            const selected = propertyIds.includes(prop.id)
            return (
              <button key={prop.id} onClick={() => onPropertyIdsChange(selected ? propertyIds.filter(id => id !== prop.id) : [...propertyIds, prop.id])}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${selected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="truncate">{prop.listingName || prop.externalName || prop.address || prop.id}</span>
                {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Project Status */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Project Status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map(opt => {
            const selected = statuses.includes(opt.value)
            return (
              <button key={opt.value} onClick={() => toggleStatus(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all ${selected ? 'border-transparent text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600'}`}
                style={selected ? { backgroundColor: opt.color } : undefined}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selected ? '#fff' : opt.color }} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Invoice Status */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Invoice Status</p>
        <div className="flex flex-wrap gap-1.5">
          {INVOICE_STATUS_OPTIONS.map(opt => {
            const selected = invoiceStatuses.includes(opt.value)
            return (
              <button key={opt.value} onClick={() => toggleInvoiceStatus(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all ${selected ? 'border-transparent text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600'}`}
                style={selected ? { backgroundColor: opt.color } : undefined}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selected ? '#fff' : opt.color }} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Granularity */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Granularity</p>
        <div className="flex items-center gap-0.5 rounded-xl bg-gray-100 p-0.5">
          {GRANULARITY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onGranularityChange(opt.value)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${granularity === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-2 border-b border-gray-100 px-4 py-3">
      {/* Mobile filter trigger */}
      <div className="flex items-center gap-2 sm:hidden">
        <MobileFilterDrawer
          isOpen={mobileDrawerOpen}
          onOpenChange={setMobileDrawerOpen}
          activeCount={activeFilterCount}
          onClear={onClearFilters}
        >
          {mobileFilterContent}
        </MobileFilterDrawer>
        <span className="text-xs text-gray-500">{formatDateDisplay(dateRange)}</span>
      </div>

      {/* Desktop filters */}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {/* Date Range */}
        <Dropdown
          isOpen={dateOpen}
          onOpenChange={setDateOpen}
          trigger={
            <button
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                dateOpen
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <CalendarDaysIcon className="h-3.5 w-3.5" />
              {formatDateDisplay(dateRange)}
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          }
        >
          <div className="p-2">
            <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Presets
            </p>
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  onDateRangeChange(preset.getValue())
                  setDateOpen(false)
                }}
                className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                {preset.label}
              </button>
            ))}
            <div className="mt-2 border-t border-gray-100 pt-2">
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Custom
              </p>
              <div className="flex items-center gap-2 px-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                />
              </div>
              <button
                onClick={() => {
                  if (customStart && customEnd) {
                    onDateRangeChange({ startDate: customStart, endDate: customEnd })
                    setDateOpen(false)
                  }
                }}
                className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
              >
                Apply
              </button>
            </div>
          </div>
        </Dropdown>

        {/* Cleaner select */}
        <Dropdown
          isOpen={cleanerOpen}
          onOpenChange={setCleanerOpen}
          trigger={
            <button
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                cleanerId
                  ? 'border-teal-300 bg-teal-50 text-teal-700'
                  : cleanerOpen
                    ? 'border-gray-300 bg-gray-50 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserCircleIcon className="h-3.5 w-3.5" />
              {selectedCleaner ? selectedCleaner.name : 'All Cleaners'}
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          }
        >
          <div className="max-h-60 overflow-y-auto p-2">
            <button
              onClick={() => {
                onCleanerIdChange(null)
                setCleanerOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${
                !cleanerId ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>All Cleaners</span>
              {!cleanerId && <CheckIcon className="h-3.5 w-3.5" />}
            </button>
            {cleaners.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No cleaners found</p>
            ) : (
              cleaners.map(c => {
                const selected = cleanerId === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onCleanerIdChange(c.id)
                      setCleanerOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${
                      selected ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </Dropdown>

        {/* Property multi-select */}
        <Dropdown
          isOpen={propOpen}
          onOpenChange={setPropOpen}
          trigger={
            <button
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                propertyIds.length > 0
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : propOpen
                    ? 'border-gray-300 bg-gray-50 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <HomeModernIcon className="h-3.5 w-3.5" />
              {propertyIds.length > 0 ? `${propertyIds.length} properties` : 'All Properties'}
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          }
        >
          <div className="max-h-60 overflow-y-auto p-2">
            {properties.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No properties found</p>
            ) : (
              properties.map(prop => {
                const selected = propertyIds.includes(prop.id)
                return (
                  <button
                    key={prop.id}
                    onClick={() => {
                      onPropertyIdsChange(
                        selected
                          ? propertyIds.filter(id => id !== prop.id)
                          : [...propertyIds, prop.id]
                      )
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${
                      selected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{prop.listingName || prop.externalName || prop.address || prop.id}</span>
                    {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </Dropdown>

        {/* Project status chips */}
        <div className="flex flex-wrap items-center gap-1">
          {STATUS_OPTIONS.map(opt => {
            const selected = statuses.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleStatus(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  selected
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                style={selected ? { backgroundColor: opt.color } : undefined}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: selected ? '#fff' : opt.color }}
                />
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Invoice status chips */}
        <div className="flex flex-wrap items-center gap-1">
          {INVOICE_STATUS_OPTIONS.map(opt => {
            const selected = invoiceStatuses.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleInvoiceStatus(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  selected
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                style={selected ? { backgroundColor: opt.color } : undefined}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: selected ? '#fff' : opt.color }}
                />
                {opt.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <FunnelIcon className="h-3.5 w-3.5" />
            Clear
          </button>
        )}

        {/* Granularity */}
        <div className="flex items-center gap-0.5 rounded-xl bg-gray-100 p-0.5">
          {GRANULARITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onGranularityChange(opt.value)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                granularity === opt.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active filter chips row */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap items-center gap-1.5"
        >
          {cleanerId && selectedCleaner && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
              {selectedCleaner.name}
              <button
                onClick={() => onCleanerIdChange(null)}
                className="rounded-full p-0.5 hover:bg-teal-200"
              >
                <XMarkIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          )}

          {propertyIds.map(id => {
            const prop = properties.find(p => p.id === id)
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700"
              >
                {prop?.listingName || prop?.externalName || prop?.address || 'Property'}
                <button
                  onClick={() => onPropertyIdsChange(propertyIds.filter(i => i !== id))}
                  className="rounded-full p-0.5 hover:bg-indigo-200"
                >
                  <XMarkIcon className="h-2.5 w-2.5" />
                </button>
              </span>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}

// --- Helpers ---

function formatDateDisplay(range: DateRange): string {
  const start = new Date(range.startDate + 'T00:00:00')
  const end = new Date(range.endDate + 'T00:00:00')
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (start.getFullYear() !== end.getFullYear()) {
    const fmtY = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    return `${fmtY(start)} – ${fmtY(end)}`
  }

  return `${fmt(start)} – ${fmt(end)}`
}
