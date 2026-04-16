'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  HomeModernIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import MobileFilterDrawer from '@/components/shared/MobileFilterDrawer'
import { DATE_PRESETS } from '@/services/analyticsService'
import { getChannelDisplayName } from '@/services/channelUtils'
import type { Property } from '@/services/types/property'
import type { DateRange, BookingGranularity } from '@/services/types/bookingAnalytics'
import {
  BOOKING_STATUS_OPTIONS,
  FINANCIAL_READINESS_OPTIONS,
  SOURCE_OPTIONS,
} from './constants'

interface ClientOption {
  id: string
  name: string
}

interface BookingTimelineFiltersProps {
  dateRange: DateRange
  propertyIds: string[]
  channels: string[]
  clientIds: string[]
  sources: string[]
  financialReadiness: string[]
  bookingStatus: string[]
  granularity: BookingGranularity
  properties: Property[]
  clients?: ClientOption[]
  availableChannels?: string[]
  onDateRangeChange: (range: DateRange) => void
  onPropertyIdsChange: (ids: string[]) => void
  onChannelsChange: (channels: string[]) => void
  onClientIdsChange: (ids: string[]) => void
  onSourcesChange: (sources: string[]) => void
  onFinancialReadinessChange: (values: string[]) => void
  onBookingStatusChange: (values: string[]) => void
  onGranularityChange: (g: BookingGranularity) => void
}

const GRANULARITY_OPTIONS: { value: BookingGranularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const DEFAULT_CHANNELS = ['airbnb', 'vrbo', 'booking.com', 'direct', 'expedia', 'google']

// --- Reusable Dropdown ---
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

export default function BookingTimelineFilters({
  dateRange,
  propertyIds,
  channels,
  clientIds,
  sources,
  financialReadiness,
  bookingStatus,
  granularity,
  properties,
  clients = [],
  availableChannels,
  onDateRangeChange,
  onPropertyIdsChange,
  onChannelsChange,
  onClientIdsChange,
  onSourcesChange,
  onFinancialReadinessChange,
  onBookingStatusChange,
  onGranularityChange,
}: BookingTimelineFiltersProps) {
  const [dateOpen, setDateOpen] = useState(false)
  const [propOpen, setPropOpen] = useState(false)
  const [channelOpen, setChannelOpen] = useState(false)
  const [clientOpen, setClientOpen] = useState(false)
  const [customStart, setCustomStart] = useState(dateRange.startDate)
  const [customEnd, setCustomEnd] = useState(dateRange.endDate)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const channelList = availableChannels || DEFAULT_CHANNELS

  const hasPropertyFilter = propertyIds.length > 0
  const hasChannelFilter = channels.length > 0
  const hasClientFilter = clientIds.length > 0
  const hasSourceFilter = sources.length > 0
  const hasReadinessFilter = financialReadiness.length > 0
  const hasStatusFilter = bookingStatus.length > 0

  const hasActiveFilters = hasPropertyFilter || hasChannelFilter || hasClientFilter || hasSourceFilter || hasReadinessFilter || hasStatusFilter
  const activeFilterCount = [hasPropertyFilter, hasChannelFilter, hasClientFilter, hasSourceFilter, hasReadinessFilter, hasStatusFilter].filter(Boolean).length

  const clearAllFilters = () => {
    onPropertyIdsChange([])
    onChannelsChange([])
    onClientIdsChange([])
    onSourcesChange([])
    onFinancialReadinessChange([])
    onBookingStatusChange([])
  }

  // Toggle helper for multi-select arrays
  const toggle = <T extends string>(arr: T[], value: T, setter: (v: T[]) => void) => {
    setter(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value])
  }

  // Mobile filter content
  const mobileFilterContent = (
    <div className="space-y-4">
      {/* Date Range */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Date Range</p>
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map(preset => (
            <button key={preset.label} onClick={() => { onDateRangeChange(preset.getValue()); setMobileDrawerOpen(false) }}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50">{preset.label}</button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
        </div>
        {customStart && customEnd && (
          <button onClick={() => { onDateRangeChange({ startDate: customStart, endDate: customEnd }); setMobileDrawerOpen(false) }}
            className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">Apply Custom</button>
        )}
      </div>

      {/* Properties */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Properties</p>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {properties.map(prop => {
            const selected = propertyIds.includes(prop.id)
            return (
              <button key={prop.id} onClick={() => toggle(propertyIds, prop.id, onPropertyIdsChange)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${selected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="truncate">{prop.listingName || prop.externalName || prop.address || prop.id}</span>
                {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Channels */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Channels</p>
        <div className="flex flex-wrap gap-1.5">
          {channelList.map(ch => {
            const selected = channels.includes(ch)
            return (
              <button key={ch} onClick={() => toggle(channels, ch, onChannelsChange)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${selected ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                {getChannelDisplayName(ch)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sources */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Source</p>
        <div className="flex flex-wrap gap-1.5">
          {SOURCE_OPTIONS.map(opt => {
            const selected = sources.includes(opt.value)
            return (
              <button key={opt.value} onClick={() => toggle(sources, opt.value, onSourcesChange)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${selected ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Status chips */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Booking Status</p>
        <div className="flex flex-wrap gap-1.5">
          {BOOKING_STATUS_OPTIONS.map(opt => {
            const selected = bookingStatus.includes(opt.value)
            return (
              <button key={opt.value} onClick={() => toggle(bookingStatus, opt.value, onBookingStatusChange)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${selected ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Financial readiness */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Financial Readiness</p>
        <div className="flex flex-wrap gap-1.5">
          {FINANCIAL_READINESS_OPTIONS.map(opt => {
            const selected = financialReadiness.includes(opt.value)
            return (
              <button key={opt.value} onClick={() => toggle(financialReadiness, opt.value, onFinancialReadinessChange)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${selected ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
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
    <div className="space-y-2 px-4 py-3">
      {/* Mobile filter trigger */}
      <div className="flex items-center gap-2 sm:hidden">
        <MobileFilterDrawer
          isOpen={mobileDrawerOpen}
          onOpenChange={setMobileDrawerOpen}
          activeCount={activeFilterCount}
          onClear={clearAllFilters}
        >
          {mobileFilterContent}
        </MobileFilterDrawer>
        <span className="text-xs text-gray-500">{formatDateDisplay(dateRange)}</span>
      </div>

      {/* Desktop: Primary filter row */}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {/* Date Range */}
        <Dropdown isOpen={dateOpen} onOpenChange={setDateOpen} trigger={
          <button className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
            dateOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}>
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            {formatDateDisplay(dateRange)}
            <ChevronDownIcon className="h-3 w-3" />
          </button>
        }>
          <div className="p-2">
            <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">Presets</p>
            {DATE_PRESETS.map(preset => (
              <button key={preset.label} onClick={() => { onDateRangeChange(preset.getValue()); setDateOpen(false) }}
                className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50">{preset.label}</button>
            ))}
            <div className="mt-2 border-t border-gray-100 pt-2">
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">Custom</p>
              <div className="flex items-center gap-2 px-2">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs" />
              </div>
              <button onClick={() => { if (customStart && customEnd) { onDateRangeChange({ startDate: customStart, endDate: customEnd }); setDateOpen(false) } }}
                className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">Apply</button>
            </div>
          </div>
        </Dropdown>

        {/* Property Multi-Select */}
        <Dropdown isOpen={propOpen} onOpenChange={setPropOpen} trigger={
          <button className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
            hasPropertyFilter ? 'border-blue-300 bg-blue-50 text-blue-700'
              : propOpen ? 'border-gray-300 bg-gray-50 text-gray-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}>
            <HomeModernIcon className="h-3.5 w-3.5" />
            {hasPropertyFilter ? `${propertyIds.length} properties` : 'All Properties'}
            <ChevronDownIcon className="h-3 w-3" />
          </button>
        }>
          <div className="max-h-60 overflow-y-auto p-2">
            {properties.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No properties found</p>
            ) : (
              properties.map(prop => {
                const selected = propertyIds.includes(prop.id)
                return (
                  <button key={prop.id} onClick={() => toggle(propertyIds, prop.id, onPropertyIdsChange)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${selected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <span className="truncate">{prop.listingName || prop.externalName || prop.address || prop.id}</span>
                    {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </Dropdown>

        {/* Channel Multi-Select */}
        <Dropdown isOpen={channelOpen} onOpenChange={setChannelOpen} trigger={
          <button className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
            hasChannelFilter ? 'border-violet-300 bg-violet-50 text-violet-700'
              : channelOpen ? 'border-gray-300 bg-gray-50 text-gray-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}>
            <GlobeAltIcon className="h-3.5 w-3.5" />
            {hasChannelFilter ? `${channels.length} channels` : 'All Channels'}
            <ChevronDownIcon className="h-3 w-3" />
          </button>
        }>
          <div className="p-2">
            {channelList.map(ch => {
              const selected = channels.includes(ch)
              return (
                <button key={ch} onClick={() => toggle(channels, ch, onChannelsChange)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${selected ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {getChannelDisplayName(ch)}
                  {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                </button>
              )
            })}
          </div>
        </Dropdown>

        {/* Client Multi-Select */}
        {clients.length > 0 && (
          <Dropdown isOpen={clientOpen} onOpenChange={setClientOpen} trigger={
            <button className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
              hasClientFilter ? 'border-teal-300 bg-teal-50 text-teal-700'
                : clientOpen ? 'border-gray-300 bg-gray-50 text-gray-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}>
              <UserGroupIcon className="h-3.5 w-3.5" />
              {hasClientFilter ? `${clientIds.length} clients` : 'All Clients'}
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          }>
            <div className="max-h-60 overflow-y-auto p-2">
              {clients.map(client => {
                const selected = clientIds.includes(client.id)
                return (
                  <button key={client.id} onClick={() => toggle(clientIds, client.id, onClientIdsChange)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${selected ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <span className="truncate">{client.name}</span>
                    {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </Dropdown>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Granularity */}
        <div className="flex items-center gap-0.5 rounded-xl bg-gray-100 p-0.5">
          {GRANULARITY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onGranularityChange(opt.value)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                granularity === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Secondary filter row — source, status, readiness chips */}
      <div className="hidden flex-wrap items-center gap-1 sm:flex">
        {/* Source chips */}
        {SOURCE_OPTIONS.map(opt => {
          const selected = sources.includes(opt.value)
          return (
            <button key={opt.value} onClick={() => toggle(sources, opt.value, onSourcesChange)}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all ${
                selected ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}>
              <CloudArrowUpIcon className="mb-0.5 inline h-3 w-3" /> {opt.label}
            </button>
          )
        })}

        <div className="h-4 w-px bg-gray-200" />

        {/* Booking Status chips */}
        {BOOKING_STATUS_OPTIONS.map(opt => {
          const selected = bookingStatus.includes(opt.value)
          return (
            <button key={opt.value} onClick={() => toggle(bookingStatus, opt.value, onBookingStatusChange)}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all ${
                selected ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}>{opt.label}</button>
          )
        })}

        <div className="h-4 w-px bg-gray-200" />

        {/* Financial Readiness chips */}
        {FINANCIAL_READINESS_OPTIONS.map(opt => {
          const selected = financialReadiness.includes(opt.value)
          return (
            <button key={opt.value} onClick={() => toggle(financialReadiness, opt.value, onFinancialReadinessChange)}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all ${
                selected ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}>{opt.label}</button>
          )
        })}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap items-center gap-1.5"
        >
          {propertyIds.map(id => {
            const prop = properties.find(p => p.id === id)
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                {prop?.listingName || prop?.externalName || prop?.address || 'Property'}
                <button onClick={() => onPropertyIdsChange(propertyIds.filter(i => i !== id))} className="rounded-full p-0.5 hover:bg-blue-200">
                  <XMarkIcon className="h-2.5 w-2.5" />
                </button>
              </span>
            )
          })}

          {channels.map(ch => (
            <span key={ch} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
              {getChannelDisplayName(ch)}
              <button onClick={() => onChannelsChange(channels.filter(c => c !== ch))} className="rounded-full p-0.5 hover:bg-violet-200">
                <XMarkIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}

          {clientIds.map(id => {
            const client = clients.find(c => c.id === id)
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                {client?.name || 'Client'}
                <button onClick={() => onClientIdsChange(clientIds.filter(i => i !== id))} className="rounded-full p-0.5 hover:bg-teal-200">
                  <XMarkIcon className="h-2.5 w-2.5" />
                </button>
              </span>
            )
          })}

          {sources.map(src => (
            <span key={src} className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
              {SOURCE_OPTIONS.find(o => o.value === src)?.label || src}
              <button onClick={() => onSourcesChange(sources.filter(s => s !== src))} className="rounded-full p-0.5 hover:bg-teal-200">
                <XMarkIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}

          {bookingStatus.map(status => (
            <span key={status} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {BOOKING_STATUS_OPTIONS.find(o => o.value === status)?.label || status}
              <button onClick={() => onBookingStatusChange(bookingStatus.filter(s => s !== status))} className="rounded-full p-0.5 hover:bg-amber-200">
                <XMarkIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}

          {financialReadiness.map(fr => (
            <span key={fr} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
              {FINANCIAL_READINESS_OPTIONS.find(o => o.value === fr)?.label || fr}
              <button onClick={() => onFinancialReadinessChange(financialReadiness.filter(f => f !== fr))} className="rounded-full p-0.5 hover:bg-indigo-200">
                <XMarkIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
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
    const fmtY = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    return `${fmtY(start)} – ${fmtY(end)}`
  }

  return `${fmt(start)} – ${fmt(end)}`
}
