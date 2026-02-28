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
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import type { ViewMode } from './TurnoverCalendar'

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
}: CalendarHeaderProps) {
  const [showChecklistMenu, setShowChecklistMenu] = useState(false)
  const checklistMenuRef = useRef<HTMLDivElement>(null)
  const { profile } = useUserStore()
  const smsEnabled = profile?.smsNotificationsEnabled ?? true
  const emailEnabled = profile?.emailNotificationsEnabled ?? true

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (checklistMenuRef.current && !checklistMenuRef.current.contains(event.target as Node)) {
        setShowChecklistMenu(false)
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

  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Date Navigation */}
        <div className="flex items-center gap-3">
          {/* Today Button */}
          <motion.button
            onClick={onToday}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isCurrentWeek()}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${isCurrentWeek()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer'
              }
            `}
          >
            <CalendarIcon className="w-4 h-4" />
            Today
          </motion.button>

          {/* Navigation */}
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

            <span className="px-3 py-1.5 min-w-[180px] text-center font-semibold text-gray-900">
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
        </div>

        {/* Right: Notification Status + Create Buttons + View Mode Toggle */}
        <div className="flex items-center gap-3 self-start lg:self-auto">
          {/* Notification Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100" title="Notification preferences (manage in Settings)">
            <span className="text-xs text-gray-400 mr-0.5">Alerts:</span>
            <div className={`flex items-center gap-0.5 ${emailEnabled ? 'text-blue-500' : 'text-gray-300'}`} title={emailEnabled ? 'Email notifications enabled' : 'Email notifications disabled'}>
              <EnvelopeIcon className="w-3.5 h-3.5" />
            </div>
            <div className={`flex items-center gap-0.5 ${smsEnabled ? 'text-amber-500' : 'text-gray-300'}`} title={smsEnabled ? 'SMS notifications enabled' : 'SMS notifications disabled'}>
              <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          {(onCreateChecklist || onDuplicateChecklist) && (
            <div ref={checklistMenuRef} className="relative">
              <motion.button
                onClick={() => setShowChecklistMenu((prev) => !prev)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 border border-emerald-200 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <ClipboardDocumentListIcon className="w-4 h-4" />
                New Checklist
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showChecklistMenu ? 'rotate-180' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {showChecklistMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 overflow-hidden z-50"
                  >
                    {onCreateChecklist && (
                      <button
                        onClick={() => {
                          setShowChecklistMenu(false)
                          onCreateChecklist()
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium">Create from Scratch</div>
                          <div className="text-xs text-gray-400">Build a new checklist</div>
                        </div>
                      </button>
                    )}
                    {onDuplicateChecklist && (
                      <button
                        onClick={() => {
                          setShowChecklistMenu(false)
                          onDuplicateChecklist()
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-t border-gray-100 cursor-pointer"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium">Copy from Existing</div>
                          <div className="text-xs text-gray-400">Duplicate a checklist</div>
                        </div>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {onCreateProject && (
            <motion.button
              onClick={onCreateProject}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/25 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              New Project
            </motion.button>
          )}

          {viewMode === 'property' && onToggleBookings && (
            <button
              onClick={() => onToggleBookings(!showBookings)}
              disabled={bookingsLoading}
              className={`
                inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 cursor-pointer border
                ${showBookings
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
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

          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => onViewModeChange('property')}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 cursor-pointer
              ${viewMode === 'property'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <HomeModernIcon className="w-4 h-4" />
            By Property
          </button>
          <button
            onClick={() => onViewModeChange('cleaner')}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 cursor-pointer
              ${viewMode === 'cleaner'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <UserCircleIcon className="w-4 h-4" />
            By Cleaner
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
