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
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import type { ViewMode } from './TurnoverCalendar'
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
  zoomLevel?: 7 | 14
  onZoomChange?: (level: 7 | 14) => void
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
}: CalendarHeaderProps) {
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [showChecklistSub, setShowChecklistSub] = useState(false)
  const [showPropertyFilter, setShowPropertyFilter] = useState(false)
  const [propertySearch, setPropertySearch] = useState('')
  const [showCleanerFilter, setShowCleanerFilter] = useState(false)
  const [cleanerSearch, setCleanerSearch] = useState('')
  const newMenuRef = useRef<HTMLDivElement>(null)
  const propertyFilterRef = useRef<HTMLDivElement>(null)
  const cleanerFilterRef = useRef<HTMLDivElement>(null)
  const { profile } = useUserStore()
  const smsEnabled = profile?.smsNotificationsEnabled ?? true
  const emailEnabled = profile?.emailNotificationsEnabled ?? true

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
        setShowNewMenu(false)
        setShowChecklistSub(false)
      }
      if (propertyFilterRef.current && !propertyFilterRef.current.contains(event.target as Node)) {
        setShowPropertyFilter(false)
        setPropertySearch('')
      }
      if (cleanerFilterRef.current && !cleanerFilterRef.current.contains(event.target as Node)) {
        setShowCleanerFilter(false)
        setCleanerSearch('')
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
      const search = propertySearch.toLowerCase()
      return getPropertyName(p).toLowerCase().includes(search)
    })

  // Property filter label
  const propertyFilterLabel = selectedPropertyIds.length === 0
    ? 'All Properties'
    : `${selectedPropertyIds.length} of ${properties.length} properties`

  const handleToggleProperty = (id: string) => {
    if (!onPropertyFilterChange) return
    if (selectedPropertyIds.includes(id)) {
      onPropertyFilterChange(selectedPropertyIds.filter(pid => pid !== id))
    } else {
      onPropertyFilterChange([...selectedPropertyIds, id])
    }
  }

  const handleSelectAll = () => {
    onPropertyFilterChange?.([])
  }

  const handleClearAll = () => {
    onPropertyFilterChange?.(properties.map(p => p.id))
  }

  // Cleaner display name helper
  const getCleanerName = (c: Cleaner) => c.name || c.email || 'Unnamed Cleaner'

  // Filtered cleaners for search
  const filteredCleaners = cleaners
    .slice()
    .sort((a, b) => getCleanerName(a).localeCompare(getCleanerName(b)))
    .filter(c => {
      if (!cleanerSearch) return true
      const search = cleanerSearch.toLowerCase()
      return getCleanerName(c).toLowerCase().includes(search)
    })

  // Cleaner filter label
  const cleanerFilterLabel = selectedCleanerIds.length === 0
    ? 'All Cleaners'
    : `${selectedCleanerIds.length} of ${cleaners.length} cleaners`

  const handleToggleCleaner = (id: string) => {
    if (!onCleanerFilterChange) return
    if (selectedCleanerIds.includes(id)) {
      onCleanerFilterChange(selectedCleanerIds.filter(cid => cid !== id))
    } else {
      onCleanerFilterChange([...selectedCleanerIds, id])
    }
  }

  const handleSelectAllCleaners = () => {
    onCleanerFilterChange?.([])
  }

  const handleClearAllCleaners = () => {
    onCleanerFilterChange?.(cleaners.map(c => c.id))
  }

  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: Date Navigation + Property Filter + Bookings Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Today Button */}
          <motion.button
            onClick={onToday}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isCurrentWeek()}
            className={`
              inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all
              ${isCurrentWeek()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer'
              }
            `}
          >
            <CalendarIcon className="w-4 h-4" />
            Today
          </motion.button>

          {/* Week Navigation */}
          <div className="flex items-center gap-1">
            <motion.button
              onClick={onPrevWeek}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              aria-label="Previous week"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </motion.button>

            <span className="px-2 py-1.5 min-w-[170px] text-center font-semibold text-gray-900 text-sm">
              {formatDateRange()}
            </span>

            <motion.button
              onClick={onNextWeek}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              aria-label="Next week"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Property Filter */}
          {properties.length > 0 && onPropertyFilterChange && (
            <div ref={propertyFilterRef} className="relative">
              <button
                onClick={() => {
                  setShowPropertyFilter(prev => !prev)
                  setPropertySearch('')
                }}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                  transition-all cursor-pointer border
                  ${selectedPropertyIds.length > 0
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }
                `}
              >
                <FunnelIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{propertyFilterLabel}</span>
                <span className="sm:hidden">
                  {selectedPropertyIds.length > 0 ? `${selectedPropertyIds.length}` : 'Filter'}
                </span>
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showPropertyFilter ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showPropertyFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 overflow-hidden z-50"
                  >
                    {/* Search */}
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search properties..."
                          value={propertySearch}
                          onChange={e => setPropertySearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Select All / Clear */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50/50">
                      <button
                        onClick={handleSelectAll}
                        className="text-xs font-medium text-purple-600 hover:text-purple-700 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-xs text-gray-400">
                        {selectedPropertyIds.length === 0 ? 'All' : selectedPropertyIds.length} selected
                      </span>
                      <button
                        onClick={handleClearAll}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Property List */}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredProperties.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-gray-400">
                          No properties found
                        </div>
                      ) : (
                        filteredProperties.map(p => {
                          const isSelected = selectedPropertyIds.length === 0 || !selectedPropertyIds.includes(p.id)
                          // When selectedPropertyIds is empty, all are shown (= all selected)
                          // When selectedPropertyIds has items, only those are shown
                          const isChecked = selectedPropertyIds.length === 0
                            ? true
                            : selectedPropertyIds.includes(p.id)
                          return (
                            <label
                              key={p.id}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (selectedPropertyIds.length === 0) {
                                    // Going from "all" to "all except this one"
                                    onPropertyFilterChange?.(properties.filter(prop => prop.id !== p.id).map(prop => prop.id))
                                  } else {
                                    handleToggleProperty(p.id)
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                              />
                              <span className="text-sm text-gray-700 truncate">
                                {getPropertyName(p)}
                              </span>
                            </label>
                          )
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Cleaner Filter */}
          {cleaners.length > 0 && onCleanerFilterChange && (
            <div ref={cleanerFilterRef} className="relative">
              <button
                onClick={() => {
                  setShowCleanerFilter(prev => !prev)
                  setCleanerSearch('')
                }}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                  transition-all cursor-pointer border
                  ${selectedCleanerIds.length > 0
                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }
                `}
              >
                <UserCircleIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{cleanerFilterLabel}</span>
                <span className="sm:hidden">
                  {selectedCleanerIds.length > 0 ? `${selectedCleanerIds.length}` : 'Cleaners'}
                </span>
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showCleanerFilter ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showCleanerFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 overflow-hidden z-50"
                  >
                    {/* Search */}
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search cleaners..."
                          value={cleanerSearch}
                          onChange={e => setCleanerSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Select All / Clear */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50/50">
                      <button
                        onClick={handleSelectAllCleaners}
                        className="text-xs font-medium text-teal-600 hover:text-teal-700 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-xs text-gray-400">
                        {selectedCleanerIds.length === 0 ? 'All' : selectedCleanerIds.length} selected
                      </span>
                      <button
                        onClick={handleClearAllCleaners}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Cleaner List */}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCleaners.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-gray-400">
                          No cleaners found
                        </div>
                      ) : (
                        filteredCleaners.map(c => {
                          const isChecked = selectedCleanerIds.length === 0
                            ? true
                            : selectedCleanerIds.includes(c.id)
                          return (
                            <label
                              key={c.id}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (selectedCleanerIds.length === 0) {
                                    // Going from "all" to "all except this one"
                                    onCleanerFilterChange?.(cleaners.filter(cl => cl.id !== c.id).map(cl => cl.id))
                                  } else {
                                    handleToggleCleaner(c.id)
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20 cursor-pointer"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm text-gray-700 truncate">
                                  {getCleanerName(c)}
                                </span>
                                {c.status !== 'active' && (
                                  <span className={`text-xs ${c.status === 'invited' ? 'text-amber-500' : 'text-gray-400'}`}>
                                    {c.status}
                                  </span>
                                )}
                              </div>
                            </label>
                          )
                        })
                      )}
                    </div>
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
                inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                transition-all duration-200 cursor-pointer border
                ${showBookings
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                }
                ${bookingsLoading ? 'opacity-70 cursor-wait' : ''}
              `}
            >
              {bookingsLoading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <CalendarDaysIcon className="w-4 h-4" />
              )}
              Bookings
            </button>
          )}

          {/* Notification Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-100" title="Notification preferences (manage in Settings)">
            <span className="text-xs text-gray-400 mr-0.5">Alerts:</span>
            <div className={`flex items-center ${emailEnabled ? 'text-blue-500' : 'text-gray-300'}`} title={emailEnabled ? 'Email enabled' : 'Email disabled'}>
              <EnvelopeIcon className="w-3.5 h-3.5" />
            </div>
            <div className={`flex items-center ${smsEnabled ? 'text-amber-500' : 'text-gray-300'}`} title={smsEnabled ? 'SMS enabled' : 'SMS disabled'}>
              <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Right: New Dropdown + View Mode Toggle */}
        <div className="flex items-center gap-3 self-start lg:self-auto">
          {/* Consolidated New Dropdown */}
          {(onCreateProject || onCreateChecklist || onDuplicateChecklist) && (
            <div ref={newMenuRef} className="relative">
              <motion.button
                onClick={() => {
                  setShowNewMenu(prev => !prev)
                  setShowChecklistSub(false)
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/25 cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                New
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showNewMenu ? 'rotate-180' : ''}`} />
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

          {/* Zoom Toggle */}
          {onZoomChange && (
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => onZoomChange(7)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                  ${zoomLevel === 7
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                7d
              </button>
              <button
                onClick={() => onZoomChange(14)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                  ${zoomLevel === 14
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                14d
              </button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => onViewModeChange('property')}
              className={`
                inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 cursor-pointer
                ${viewMode === 'property'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <HomeModernIcon className="w-4 h-4" />
              <span className="hidden sm:inline">By Property</span>
            </button>
            <button
              onClick={() => onViewModeChange('cleaner')}
              className={`
                inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 cursor-pointer
                ${viewMode === 'cleaner'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <UserCircleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">By Cleaner</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
