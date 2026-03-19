'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeModernIcon,
  UserCircleIcon,
  CalendarIcon,
  CalendarDaysIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import { UNASSIGNED_FILTER_ID } from './TurnoverCalendar'
import type { ViewMode, ZoomLevel, SortOption } from './TurnoverCalendar'
import type { Property } from '@/services/types/property'
import type { Cleaner } from '@/services/types/cleaner'

interface CalendarHeaderProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  currentDate: Date
  dateRange: { start: string; end: string }
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onCreateProject?: () => void
  onCreateChecklist?: () => void
  onDuplicateChecklist?: () => void
  showBookings?: boolean
  onToggleBookings?: (enabled: boolean) => void
  bookingsLoading?: boolean
  properties?: Property[]
  selectedPropertyIds?: string[]
  onPropertyFilterChange?: (ids: string[]) => void
  cleaners?: Cleaner[]
  selectedCleanerIds?: string[]
  onCleanerFilterChange?: (ids: string[]) => void
  zoomLevel?: ZoomLevel
  onZoomChange?: (level: ZoomLevel, isWeek?: boolean) => void
  isWeekPreset?: boolean
  sortOption?: SortOption
  onSortChange?: (sort: SortOption) => void
  openIssueCount?: number
  onOpenAllIssues?: () => void
  excludedPropertyCount?: number
  onOpenExclusions?: () => void
  hideViewToggle?: boolean
}

export default function CalendarHeader({
  viewMode,
  onViewModeChange,
  currentDate,
  dateRange,
  onPrevWeek,
  onNextWeek,
  onToday,
  onCreateProject,
  onCreateChecklist,
  onDuplicateChecklist,
  showBookings,
  onToggleBookings,
  bookingsLoading,
  properties = [],
  selectedPropertyIds = [],
  onPropertyFilterChange,
  cleaners = [],
  selectedCleanerIds = [],
  onCleanerFilterChange,
  zoomLevel = 7,
  onZoomChange,
  isWeekPreset = true,
  sortOption = 'next-project',
  onSortChange,
  openIssueCount,
  onOpenAllIssues,
  excludedPropertyCount,
  onOpenExclusions,
  hideViewToggle = false,
}: CalendarHeaderProps) {
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [showChecklistSub, setShowChecklistSub] = useState(false)
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false)
  const [propertySearch, setPropertySearch] = useState('')
  const [cleanerSearch, setCleanerSearch] = useState('')
  const [showZoomDropdown, setShowZoomDropdown] = useState(false)
  const newMenuRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  const zoomDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
        setShowNewMenu(false)
        setShowChecklistSub(false)
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFiltersDropdown(false)
        setPropertySearch('')
        setCleanerSearch('')
      }
      if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(event.target as Node)) {
        setShowZoomDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Parse date string as local time (not UTC)
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Format the date range for display
  const formatDateRange = () => {
    const start = parseLocalDate(dateRange.start)
    const end = parseLocalDate(dateRange.end)

    if (zoomLevel === 'month') {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
    const startDay = start.getDate()
    const endDay = end.getDate()
    const year = start.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
  }

  // Check if current view is today's week
  const isCurrentWeek = () => {
    const today = new Date()
    const start = parseLocalDate(dateRange.start)
    const end = parseLocalDate(dateRange.end)
    return today >= start && today <= end
  }

  // Property display name helper
  const getPropertyName = (p: Property) =>
    p.listingName || p.internalName || p.externalName || p.address || 'Unnamed Property'

  // Filtered properties for search
  const filteredProperties = properties
    .slice()
    .sort((a, b) => getPropertyName(a).localeCompare(getPropertyName(b)))
    .filter(p => {
      if (!propertySearch) return true
      return getPropertyName(p).toLowerCase().includes(propertySearch.toLowerCase())
    })

  const handleToggleProperty = (id: string) => {
    if (!onPropertyFilterChange) return
    if (selectedPropertyIds.includes(id)) {
      onPropertyFilterChange(selectedPropertyIds.filter(pid => pid !== id))
    } else {
      onPropertyFilterChange([...selectedPropertyIds, id])
    }
  }

  const handleSelectAllProperties = () => onPropertyFilterChange?.(properties.map(p => p.id))
  const handleClearAllProperties = () => onPropertyFilterChange?.([])

  // Cleaner display name helper
  const getCleanerName = (c: Cleaner) => c.name || c.email || 'Unnamed Cleaner'

  // Filtered cleaners for search
  const filteredCleaners = cleaners
    .slice()
    .sort((a, b) => getCleanerName(a).localeCompare(getCleanerName(b)))
    .filter(c => {
      if (!cleanerSearch) return true
      return getCleanerName(c).toLowerCase().includes(cleanerSearch.toLowerCase())
    })

  const handleToggleCleaner = (id: string) => {
    if (!onCleanerFilterChange) return
    if (selectedCleanerIds.includes(id)) {
      onCleanerFilterChange(selectedCleanerIds.filter(cid => cid !== id))
    } else {
      onCleanerFilterChange([...selectedCleanerIds, id])
    }
  }

  const handleSelectAllCleaners = () => onCleanerFilterChange?.([UNASSIGNED_FILTER_ID, ...cleaners.map(c => c.id)])
  const handleClearAllCleaners = () => onCleanerFilterChange?.([])

  // Active filter count for badge
  const allCleanerCount = cleaners.length + 1 // +1 for unassigned
  const activeFilterCount =
    (selectedPropertyIds.length > 0 && selectedPropertyIds.length < properties.length ? 1 : 0) +
    (selectedCleanerIds.length > 0 && selectedCleanerIds.length < allCleanerCount ? 1 : 0) +
    (sortOption !== 'alpha-asc' ? 1 : 0)

  // Zoom dropdown label
  const zoomLabel = zoomLevel === 'month'
    ? 'Month'
    : zoomLevel === 7 && isWeekPreset
      ? 'Week'
      : `${zoomLevel}d`

  // Whether hour labels are auto-shown (1-2 day zoom)

  // Sort options
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'alpha-asc', label: 'Alphabetical (A-Z)' },
    { value: 'alpha-desc', label: 'Alphabetical (Z-A)' },
    { value: 'projects-desc', label: 'Most projects first' },
    { value: 'next-project', label: 'Next project soonest' },
  ]

  // Build flat zoom list: 1-6, Week, 8-14, divider, Month
  const zoomItems: { label: string; value: ZoomLevel; isWeek?: boolean; dividerBefore?: boolean }[] = []
  for (let d = 1; d <= 14; d++) {
    if (d === 7) {
      zoomItems.push({ label: 'Week', value: 7, isWeek: true })
    } else {
      zoomItems.push({ label: `${d} ${d === 1 ? 'day' : 'days'}`, value: d })
    }
  }
  zoomItems.push({ label: 'Month', value: 'month', dividerBefore: true })

  return (
    <div className="px-2 py-2 sm:px-4 sm:py-3 border-b border-gray-100">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {/* Today Button */}
        <motion.button
          onClick={onToday}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isCurrentWeek()}
          className={`
            inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all
            ${isCurrentWeek()
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer'
            }
          `}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Today</span>
        </motion.button>

        {/* Date Navigation */}
        <div className="flex items-center gap-0.5">
          <motion.button
            onClick={onPrevWeek}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </motion.button>

          <span className="px-1.5 py-1 min-w-[150px] text-center font-semibold text-gray-900 text-sm">
            {formatDateRange()}
          </span>

          <motion.button
            onClick={onNextWeek}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            aria-label="Next"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Filters Dropdown */}
        {(onPropertyFilterChange || onCleanerFilterChange) && (
          <div ref={filtersRef} className="relative">
            <button
              onClick={() => {
                setShowFiltersDropdown(prev => !prev)
                setPropertySearch('')
                setCleanerSearch('')
              }}
              className={`
                inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium
                transition-all cursor-pointer border
                ${activeFilterCount > 0
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              <FunnelIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-purple-600 text-white rounded-full leading-none">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${showFiltersDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showFiltersDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="fixed sm:absolute left-2 right-2 sm:left-0 sm:right-auto top-auto sm:top-full mt-1.5 sm:w-80 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 overflow-hidden z-50"
                >
                  {/* Sort By */}
                  {onSortChange && (
                    <div>
                      <div className="px-3 pt-2.5 pb-1.5">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sort By</span>
                      </div>
                      <div className="px-2 pb-2">
                        {sortOptions.map(opt => (
                          <label
                            key={opt.value}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="radio"
                              name="sort"
                              checked={sortOption === opt.value}
                              onChange={() => onSortChange(opt.value)}
                              className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Properties */}
                  {onPropertyFilterChange && properties.length > 0 && (
                    <div className="border-t border-gray-100">
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Properties</span>
                        <div className="flex items-center gap-2">
                          <button onClick={handleSelectAllProperties} className="text-[10px] font-medium text-purple-600 hover:text-purple-700 cursor-pointer">Select All</button>
                          <span className="text-[10px] text-gray-300">&middot;</span>
                          <button onClick={handleClearAllProperties} className="text-[10px] font-medium text-gray-500 hover:text-gray-700 cursor-pointer">Clear</button>
                        </div>
                      </div>
                      <div className="px-2 pb-1">
                        <div className="relative">
                          <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={propertySearch}
                            onChange={e => setPropertySearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                          />
                        </div>
                      </div>
                      <div className="max-h-36 overflow-y-auto">
                        {filteredProperties.length === 0 ? (
                          <div className="px-3 py-3 text-center text-sm text-gray-400">No properties found</div>
                        ) : (
                          filteredProperties.map(p => {
                            const isChecked = selectedPropertyIds.includes(p.id)
                            return (
                              <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleProperty(p.id)}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                                />
                                <span className="text-sm text-gray-700 truncate">{getPropertyName(p)}</span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cleaners */}
                  {onCleanerFilterChange && cleaners.length > 0 && (
                    <div className="border-t border-gray-100">
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Cleaners</span>
                        <div className="flex items-center gap-2">
                          <button onClick={handleSelectAllCleaners} className="text-[10px] font-medium text-teal-600 hover:text-teal-700 cursor-pointer">Select All</button>
                          <span className="text-[10px] text-gray-300">&middot;</span>
                          <button onClick={handleClearAllCleaners} className="text-[10px] font-medium text-gray-500 hover:text-gray-700 cursor-pointer">Clear</button>
                        </div>
                      </div>
                      <div className="px-2 pb-1">
                        <div className="relative">
                          <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={cleanerSearch}
                            onChange={e => setCleanerSearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300"
                          />
                        </div>
                      </div>
                      <div className="max-h-36 overflow-y-auto">
                        {/* Unassigned checkbox */}
                        <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedCleanerIds.includes(UNASSIGNED_FILTER_ID)}
                            onChange={() => {
                              if (selectedCleanerIds.includes(UNASSIGNED_FILTER_ID)) {
                                onCleanerFilterChange?.(selectedCleanerIds.filter(id => id !== UNASSIGNED_FILTER_ID))
                              } else {
                                onCleanerFilterChange?.([...selectedCleanerIds, UNASSIGNED_FILTER_ID])
                              }
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500/20 cursor-pointer"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-amber-700 font-medium">Unassigned</span>
                            <span className="text-[10px] text-amber-500">(no cleaner)</span>
                          </div>
                        </label>
                        {filteredCleaners.length === 0 ? (
                          <div className="px-3 py-3 text-center text-sm text-gray-400">No cleaners found</div>
                        ) : (
                          filteredCleaners.map(c => {
                            const isChecked = selectedCleanerIds.includes(c.id)
                            return (
                              <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleCleaner(c.id)}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20 cursor-pointer"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm text-gray-700 truncate">{getCleanerName(c)}</span>
                                  {c.status !== 'active' && (
                                    <span className={`text-xs ${c.status === 'invited' ? 'text-amber-500' : 'text-gray-400'}`}>{c.status}</span>
                                  )}
                                </div>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Global Clear All Filters */}
                  {activeFilterCount > 0 && (
                    <div className="border-t border-gray-100 px-3 py-2">
                      <button
                        onClick={() => {
                          onPropertyFilterChange?.(properties.map(p => p.id))
                          onCleanerFilterChange?.([UNASSIGNED_FILTER_ID, ...cleaners.map(c => c.id)])
                          onSortChange?.('alpha-asc')
                        }}
                        className="w-full text-center text-xs font-medium text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Bookings Toggle */}
        {onToggleBookings && (
          <button
            onClick={() => onToggleBookings(!showBookings)}
            disabled={bookingsLoading}
            className={`
              inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 cursor-pointer border
              ${showBookings
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
              }
              ${bookingsLoading ? 'opacity-70 cursor-wait' : ''}
            `}
          >
            {bookingsLoading ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <CalendarDaysIcon className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Bookings</span>
          </button>
        )}

        {/* Zoom Dropdown — flat list */}
        {onZoomChange && (
          <div ref={zoomDropdownRef} className="relative">
            <button
              onClick={() => setShowZoomDropdown(prev => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all cursor-pointer"
            >
              <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-500" />
              {zoomLabel}
              <ChevronDownIcon className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showZoomDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showZoomDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 overflow-hidden z-50 max-h-80 overflow-y-auto"
                >
                  {zoomItems.map((item) => {
                    const isActive = item.value === 'month'
                      ? zoomLevel === 'month'
                      : item.isWeek
                        ? zoomLevel === 7 && isWeekPreset
                        : zoomLevel === item.value && !(item.value === 7 && isWeekPreset)

                    return (
                      <div key={item.label}>
                        {item.dividerBefore && <div className="border-t border-gray-100" />}
                        <button
                          onClick={() => {
                            if (item.value === 'month') {
                              onZoomChange('month')
                            } else if (item.isWeek) {
                              onZoomChange(7, true)
                            } else {
                              onZoomChange(item.value as number, false)
                            }
                            setShowZoomDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-purple-50 text-purple-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Issues Button */}
        {onOpenAllIssues && (
          <button
            onClick={onOpenAllIssues}
            className={`
              inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 cursor-pointer border
              ${openIssueCount && openIssueCount > 0
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
              }
            `}
          >
            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Issues</span>
            {openIssueCount !== undefined && openIssueCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full leading-none">
                {openIssueCount}
              </span>
            )}
          </button>
        )}

        {/* Exclusions Button */}
        {onOpenExclusions && (
          <button
            onClick={onOpenExclusions}
            className={`
              inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 cursor-pointer border
              ${excludedPropertyCount && excludedPropertyCount > 0
                ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
              }
            `}
          >
            <NoSymbolIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exclusions</span>
            {excludedPropertyCount !== undefined && excludedPropertyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-gray-600 text-white rounded-full leading-none">
                {excludedPropertyCount}
              </span>
            )}
          </button>
        )}

        {/* New Dropdown */}
        {(onCreateProject || onCreateChecklist || onDuplicateChecklist) && (
          <div ref={newMenuRef} className="relative">
            <motion.button
              onClick={() => {
                setShowNewMenu(prev => !prev)
                setShowChecklistSub(false)
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm shadow-purple-500/25 cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              New
              <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${showNewMenu ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {showNewMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 overflow-hidden z-50"
                >
                  {onCreateProject && (
                    <button
                      onClick={() => {
                        setShowNewMenu(false)
                        onCreateProject()
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <div className="text-left">
                        <div className="font-medium">New Project</div>
                        <div className="text-xs text-gray-400">Create a cleaning project</div>
                      </div>
                    </button>
                  )}
                  {(onCreateChecklist || onDuplicateChecklist) && (
                    <div className="relative border-t border-gray-100">
                      <button
                        onClick={() => setShowChecklistSub(prev => !prev)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <ClipboardDocumentListIcon className="w-4 h-4" />
                          <div className="text-left">
                            <div className="font-medium">New Checklist</div>
                            <div className="text-xs text-gray-400">Create or duplicate</div>
                          </div>
                        </div>
                        <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showChecklistSub ? 'rotate-90' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {showChecklistSub && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden bg-gray-50/50"
                          >
                            {onCreateChecklist && (
                              <button
                                onClick={() => {
                                  setShowNewMenu(false)
                                  setShowChecklistSub(false)
                                  onCreateChecklist()
                                }}
                                className="w-full flex items-center gap-3 pl-11 pr-4 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                                <span className="font-medium">Create from Scratch</span>
                              </button>
                            )}
                            {onDuplicateChecklist && (
                              <button
                                onClick={() => {
                                  setShowNewMenu(false)
                                  setShowChecklistSub(false)
                                  onDuplicateChecklist()
                                }}
                                className="w-full flex items-center gap-3 pl-11 pr-4 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                              >
                                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                                <span className="font-medium">Copy from Existing</span>
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* View Mode Toggle */}
        {!hideViewToggle && <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-lg">
          <button
            onClick={() => onViewModeChange('property')}
            className={`
              inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium
              transition-all duration-200 cursor-pointer
              ${viewMode === 'property'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <HomeModernIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Property</span>
          </button>
          <button
            onClick={() => onViewModeChange('cleaner')}
            className={`
              inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium
              transition-all duration-200 cursor-pointer
              ${viewMode === 'cleaner'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <UserCircleIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cleaner</span>
          </button>
        </div>}
      </div>
    </div>
  )
}
