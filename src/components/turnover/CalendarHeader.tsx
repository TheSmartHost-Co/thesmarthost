'use client'

import { motion } from 'framer-motion'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeModernIcon,
  UserCircleIcon,
  CalendarIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
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
}: CalendarHeaderProps) {
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

        {/* Right: Create Buttons + View Mode Toggle */}
        <div className="flex items-center gap-3 self-start lg:self-auto">
          {onCreateChecklist && (
            <motion.button
              onClick={onCreateChecklist}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 border border-emerald-200 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              <ClipboardDocumentListIcon className="w-4 h-4" />
              New Checklist
            </motion.button>
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
