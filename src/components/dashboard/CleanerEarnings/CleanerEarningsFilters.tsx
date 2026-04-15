'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import type { CleanerEarningEntry } from '@/services/types/cleanerEarnings'

interface DateRange {
  startDate: string
  endDate: string
}

type PresetKey = 'thisMonth' | 'thisAndNext' | 'last3Months' | 'thisQuarter' | 'custom'

interface CleanerEarningsFiltersProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  selectedCleanerId: string | null
  onCleanerChange: (cleanerId: string | null) => void
  cleaners: CleanerEarningEntry[]
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getPresetRange(preset: PresetKey): DateRange | null {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (preset) {
    case 'thisMonth':
      return {
        startDate: formatDate(new Date(year, month, 1)),
        endDate: formatDate(new Date(year, month + 1, 0)),
      }
    case 'thisAndNext':
      return {
        startDate: formatDate(new Date(year, month, 1)),
        endDate: formatDate(new Date(year, month + 2, 0)),
      }
    case 'last3Months':
      return {
        startDate: formatDate(new Date(year, month - 2, 1)),
        endDate: formatDate(new Date(year, month + 1, 0)),
      }
    case 'thisQuarter': {
      const quarterStart = Math.floor(month / 3) * 3
      return {
        startDate: formatDate(new Date(year, quarterStart, 1)),
        endDate: formatDate(new Date(year, quarterStart + 3, 0)),
      }
    }
    case 'custom':
      return null
  }
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CleanerEarningsFilters: React.FC<CleanerEarningsFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  selectedCleanerId,
  onCleanerChange,
  cleaners,
}) => {
  const { t } = useTranslation('dashboard')
  const [activePreset, setActivePreset] = useState<PresetKey>('thisAndNext')
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [showCleanerDropdown, setShowCleanerDropdown] = useState(false)
  const [customStart, setCustomStart] = useState(dateRange.startDate)
  const [customEnd, setCustomEnd] = useState(dateRange.endDate)
  const dateRef = useRef<HTMLDivElement>(null)
  const cleanerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setShowDateDropdown(false)
      }
      if (cleanerRef.current && !cleanerRef.current.contains(e.target as Node)) {
        setShowCleanerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const presets: { key: PresetKey; label: string }[] = [
    { key: 'thisMonth', label: t('cleanerEarnings.thisMonth') },
    { key: 'thisAndNext', label: t('cleanerEarnings.thisAndNextMonth') },
    { key: 'last3Months', label: t('cleanerEarnings.last3Months') },
    { key: 'thisQuarter', label: t('cleanerEarnings.thisQuarter') },
    { key: 'custom', label: t('cleanerEarnings.custom') },
  ]

  const handlePresetClick = (preset: PresetKey) => {
    setActivePreset(preset)
    const range = getPresetRange(preset)
    if (range) {
      onDateRangeChange(range)
      setShowDateDropdown(false)
    }
  }

  const handleCustomApply = () => {
    onDateRangeChange({ startDate: customStart, endDate: customEnd })
    setShowDateDropdown(false)
  }

  const selectedCleanerName = selectedCleanerId
    ? cleaners.find((c) => c.cleanerId === selectedCleanerId)?.cleanerName
    : null

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Filter */}
      <div ref={dateRef} className="relative">
        <button
          onClick={() => setShowDateDropdown(!showDateDropdown)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
            showDateDropdown
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          <CalendarDaysIcon className="w-4 h-4" />
          <span>{formatDisplayDate(dateRange.startDate)} - {formatDisplayDate(dateRange.endDate)}</span>
          <ChevronDownIcon className="w-3.5 h-3.5" />
        </button>

        <AnimatePresence>
          {showDateDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50 min-w-[260px]"
            >
              <div className="space-y-1 mb-2">
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handlePresetClick(preset.key)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                      activePreset === preset.key
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {activePreset === 'custom' && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
                    />
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
                    />
                  </div>
                  <button
                    onClick={handleCustomApply}
                    className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    {t('cleanerEarnings.apply')}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cleaner Filter */}
      <div ref={cleanerRef} className="relative">
        <button
          onClick={() => setShowCleanerDropdown(!showCleanerDropdown)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
            selectedCleanerId
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : showCleanerDropdown
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          <FunnelIcon className="w-4 h-4" />
          <span>{selectedCleanerName || t('cleanerEarnings.allCleaners')}</span>
          <ChevronDownIcon className="w-3.5 h-3.5" />
        </button>

        <AnimatePresence>
          {showCleanerDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-50 min-w-[200px] max-h-[300px] overflow-y-auto"
            >
              <button
                onClick={() => { onCleanerChange(null); setShowCleanerDropdown(false) }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                  !selectedCleanerId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('cleanerEarnings.allCleaners')}
              </button>
              {cleaners.map((cleaner) => (
                <button
                  key={cleaner.cleanerId}
                  onClick={() => { onCleanerChange(cleaner.cleanerId); setShowCleanerDropdown(false) }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                    selectedCleanerId === cleaner.cleanerId
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {cleaner.cleanerName}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default CleanerEarningsFilters
