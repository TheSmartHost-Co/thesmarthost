'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  HomeModernIcon,
  SignalIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { DATE_PRESETS, type DatePreset } from '@/services/analyticsService'
import { useAnalyticsStore, type AnalyticsFilters as FiltersType } from '@/store/useAnalyticsStore'
import type { Property } from '@/services/types/property'
import type { Granularity } from '@/services/types/analytics'

interface AnalyticsFiltersProps {
  properties: Property[]
  channels?: string[]
  onFiltersChange: () => void
  compact?: boolean
  className?: string
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const DEFAULT_CHANNELS = ['Airbnb', 'VRBO', 'Booking.com', 'Direct', 'Expedia', 'Google']

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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
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
            className={`absolute top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[200px] ${
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

export function AnalyticsFilters({
  properties,
  channels = DEFAULT_CHANNELS,
  onFiltersChange,
  compact = false,
  className = '',
}: AnalyticsFiltersProps) {
  const {
    filters,
    granularity,
    setFilters,
    setDateRange,
    setGranularity,
  } = useAnalyticsStore()

  const [dateOpen, setDateOpen] = useState(false)
  const [propertyOpen, setPropertyOpen] = useState(false)
  const [channelOpen, setChannelOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | 'Custom'>('This Month')

  const [customStart, setCustomStart] = useState(filters.dateRange.startDate)
  const [customEnd, setCustomEnd] = useState(filters.dateRange.endDate)

  const handlePresetSelect = (preset: typeof DATE_PRESETS[number]) => {
    const range = preset.getValue()
    setDateRange(range)
    setSelectedPreset(preset.label)
    setDateOpen(false)
    onFiltersChange()
  }

  const handleCustomDateApply = () => {
    setDateRange({ startDate: customStart, endDate: customEnd })
    setSelectedPreset('Custom')
    setDateOpen(false)
    onFiltersChange()
  }

  const toggleProperty = (propertyId: string) => {
    const current = filters.propertyIds
    const updated = current.includes(propertyId)
      ? current.filter((id) => id !== propertyId)
      : [...current, propertyId]
    setFilters({ propertyIds: updated })
    onFiltersChange()
  }

  const toggleChannel = (channel: string) => {
    const current = filters.channels
    const updated = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel]
    setFilters({ channels: updated })
    onFiltersChange()
  }

  const clearPropertyFilters = () => {
    setFilters({ propertyIds: [] })
    onFiltersChange()
  }

  const clearChannelFilters = () => {
    setFilters({ channels: [] })
    onFiltersChange()
  }

  const handleGranularityChange = (value: Granularity) => {
    setGranularity(value)
    onFiltersChange()
  }

  const formatDateRange = () => {
    const start = new Date(filters.dateRange.startDate)
    const end = new Date(filters.dateRange.endDate)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <div className={`${className}`}>
      <div className={`flex flex-wrap items-center gap-3 ${compact ? 'py-3' : 'py-4'}`}>
        {/* Date Range Selector */}
        <Dropdown
          isOpen={dateOpen}
          onOpenChange={setDateOpen}
          trigger={
            <button
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all
                ${dateOpen
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <CalendarDaysIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{formatDateRange()}</span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${dateOpen ? 'rotate-180' : ''}`} />
            </button>
          }
        >
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Quick Select</p>
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetSelect(preset)}
                className={`
                  w-full text-left px-3 py-2 text-sm rounded-lg transition-colors
                  ${selectedPreset === preset.label
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {preset.label}
              </button>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2">
              <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Range</p>
              <div className="px-3 space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Start</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">End</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleCustomDateApply}
                  className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </Dropdown>

        {/* Property Filter */}
        <Dropdown
          isOpen={propertyOpen}
          onOpenChange={setPropertyOpen}
          trigger={
            <button
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all
                ${filters.propertyIds.length > 0
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : propertyOpen
                    ? 'border-gray-300 bg-gray-50 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <HomeModernIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {filters.propertyIds.length > 0
                  ? `${filters.propertyIds.length} ${filters.propertyIds.length === 1 ? 'Property' : 'Properties'}`
                  : 'All Properties'
                }
              </span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${propertyOpen ? 'rotate-180' : ''}`} />
            </button>
          }
        >
          <div className="p-2 max-h-64 overflow-y-auto">
            {filters.propertyIds.length > 0 && (
              <button
                onClick={clearPropertyFilters}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                Clear selection
              </button>
            )}
            {properties.map((property) => {
              const isSelected = filters.propertyIds.includes(property.id)
              return (
                <button
                  key={property.id}
                  onClick={() => toggleProperty(property.id)}
                  className={`
                    w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between
                    ${isSelected ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  <span className="truncate">{property.listingName}</span>
                  {isSelected && <CheckIcon className="w-4 h-4 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </Dropdown>

        {/* Channel Filter */}
        <Dropdown
          isOpen={channelOpen}
          onOpenChange={setChannelOpen}
          trigger={
            <button
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all
                ${filters.channels.length > 0
                  ? 'border-violet-300 bg-violet-50 text-violet-700'
                  : channelOpen
                    ? 'border-gray-300 bg-gray-50 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <SignalIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {filters.channels.length > 0
                  ? `${filters.channels.length} ${filters.channels.length === 1 ? 'Channel' : 'Channels'}`
                  : 'All Channels'
                }
              </span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${channelOpen ? 'rotate-180' : ''}`} />
            </button>
          }
        >
          <div className="p-2">
            {filters.channels.length > 0 && (
              <button
                onClick={clearChannelFilters}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                Clear selection
              </button>
            )}
            {channels.map((channel) => {
              const isSelected = filters.channels.includes(channel)
              return (
                <button
                  key={channel}
                  onClick={() => toggleChannel(channel)}
                  className={`
                    w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between
                    ${isSelected ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  <span>{channel}</span>
                  {isSelected && <CheckIcon className="w-4 h-4" />}
                </button>
              )
            })}
          </div>
        </Dropdown>

        {/* Granularity */}
        {!compact && (
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl ml-auto">
            {GRANULARITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleGranularityChange(option.value)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                  ${granularity === option.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {(filters.propertyIds.length > 0 || filters.channels.length > 0) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap items-center gap-2 pb-3"
        >
          <span className="text-xs text-gray-500">Active filters:</span>
          {filters.propertyIds.map((id) => {
            const property = properties.find((p) => p.id === id)
            return property ? (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full"
              >
                {property.listingName}
                <button
                  onClick={() => toggleProperty(id)}
                  className="hover:bg-emerald-200 rounded-full p-0.5"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ) : null
          })}
          {filters.channels.map((channel) => (
            <span
              key={channel}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-violet-100 text-violet-700 rounded-full"
            >
              {channel}
              <button
                onClick={() => toggleChannel(channel)}
                className="hover:bg-violet-200 rounded-full p-0.5"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </motion.div>
      )}
    </div>
  )
}
