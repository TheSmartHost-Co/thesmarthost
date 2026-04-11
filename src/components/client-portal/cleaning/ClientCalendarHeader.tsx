'use client'

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface ClientCalendarHeaderProps {
  startDate: Date
  endDate: Date
  zoomDays: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onZoomChange: (days: number) => void
}

const ZOOM_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '28d', value: 28 },
]

function formatDateRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()

  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const endStr = end.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return `${startStr} - ${endStr}`
}

const ClientCalendarHeader: React.FC<ClientCalendarHeaderProps> = ({
  startDate,
  endDate,
  zoomDays,
  onPrev,
  onNext,
  onToday,
  onZoomChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-3">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Previous period"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <motion.span
          key={formatDateRange(startDate, endDate)}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-semibold text-gray-900 min-w-[180px] text-center"
        >
          {formatDateRange(startDate, endDate)}
        </motion.span>

        <button
          onClick={onNext}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Next period"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Center: Today button */}
      <button
        onClick={onToday}
        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
      >
        Today
      </button>

      {/* Right: Zoom toggles */}
      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
        {ZOOM_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onZoomChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              zoomDays === opt.value
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ClientCalendarHeader
