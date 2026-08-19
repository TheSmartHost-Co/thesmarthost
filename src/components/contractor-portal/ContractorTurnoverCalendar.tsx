'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  CalendarIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getMyMaintenanceTasks } from '@/services/maintenanceTaskService'
import type { MaintenanceTask } from '@/services/types/maintenanceTask'
import type { Property } from '@/services/types/property'
import type { ZoomLevel } from '@/components/turnover/TurnoverCalendar'
import PropertyRowView from '@/components/turnover/PropertyRowView'
import { useActivatedItem } from '@/components/turnover/hooks/useActivatedItem'
import ContractorTaskModal from './ContractorTaskModal'

// Format a Date as YYYY-MM-DD in local time
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Contractor schedule calendar — a simplified mirror of the cleaner
 * turnover calendar. The contractor's only calendar data is their own
 * maintenance tasks (getMyMaintenanceTasks), so there are no booking bars,
 * no cleaning projects and no month caches: one fetch on mount, rows
 * derived from the tasks themselves.
 */
export default function ContractorTurnoverCalendar() {
  const { t } = useTranslation('contractorPortal')
  const { profile } = useUserStore()
  const isMobile = useIsMobile()

  // View state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(7)
  const [isWeekPreset, setIsWeekPreset] = useState(true)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [navigationEpoch, setNavigationEpoch] = useState(0)

  // Data state
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)

  // Sticky header / scroll refs (same wiring as the cleaner calendar)
  const stickyPortalRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Single fetch — the contractor's task list is small, no month caches needed
  const fetchTasks = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await getMyMaintenanceTasks()
      if (res.status !== 'success') {
        throw new Error(res.message || t('errorLoadingTasks'))
      }
      setTasks(res.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errorLoadingTasks')
      setError(message)
      console.error('Error loading contractor schedule:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, t])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Only non-cancelled tasks appear on the calendar
  const visibleTasks = useMemo(
    () => tasks.filter(tk => tk.status !== 'cancelled'),
    [tasks]
  )

  // Rows: unique properties derived from schedulable (dated) tasks,
  // shaped into the minimal Property the row view reads, sorted A-Z.
  const properties = useMemo(() => {
    const seen = new Map<string, Property>()
    for (const task of visibleTasks) {
      if (!task.scheduledDate) continue
      if (seen.has(task.propertyId)) continue
      seen.set(task.propertyId, {
        id: task.propertyId,
        listingName: task.propertyName || '',
        internalName: task.propertyName || '',
        address: task.propertyAddress || '',
        postalCode: '',
        province: '',
        propertyType: 'STR' as const,
        isActive: true,
        createdAt: '',
        updatedAt: '',
        owners: [],
        channels: [],
        licenses: [],
        cleaningManaged: true,
      } satisfies Property)
    }
    const getName = (p: Property) => p.listingName || p.internalName || p.address || ''
    return [...seen.values()].sort((a, b) => getName(a).localeCompare(getName(b)))
  }, [visibleTasks])

  // Date range for the current view (mirrors the cleaner calendar)
  const dateRange = useMemo(() => {
    if (zoomLevel === 'month') {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      return {
        start: formatLocalDate(new Date(year, month, 1)),
        end: formatLocalDate(new Date(year, month + 1, 0)),
      }
    }
    const start = new Date(currentDate)
    start.setHours(0, 0, 0, 0)
    if (isWeekPreset && zoomLevel === 7) {
      start.setDate(start.getDate() - start.getDay())
    }
    const end = new Date(start)
    end.setDate(end.getDate() + (zoomLevel as number) - 1)
    return { start: formatLocalDate(start), end: formatLocalDate(end) }
  }, [currentDate, zoomLevel, isWeekPreset])

  // ---- Modal open / merge ----

  const openTaskModal = useCallback((task: MaintenanceTask) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }, [])

  // Merge card updates back into local state. A decline clears the
  // contractor from the task, so it drops off this contractor's calendar.
  const handleTaskUpdated = useCallback((updated: MaintenanceTask) => {
    if (!updated.contractorId) {
      setTasks(prev => prev.filter(tk => tk.id !== updated.id))
      setShowTaskModal(false)
      setSelectedTask(null)
      return
    }
    setTasks(prev => prev.map(tk => (tk.id === updated.id ? updated : tk)))
    setSelectedTask(prev => (prev?.id === updated.id ? updated : prev))
  }, [])

  const { activatedItem, handleTaskClick, clearActivatedItem } = useActivatedItem({
    onOpenProjectModal: () => {},
    onOpenBookingModal: () => {},
    onOpenTaskModal: openTaskModal,
  })

  // Escape key deactivates
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') clearActivatedItem() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clearActivatedItem])

  // ---- Navigation handlers (mirroring the cleaner calendar) ----

  const handleZoomChange = useCallback((level: ZoomLevel, isWeek?: boolean) => {
    if (level === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), 1))
    }
    setExpandedDate(null)
    setZoomLevel(level)
    setIsWeekPreset(isWeek ?? false)
  }, [])

  const handlePrev = useCallback(() => {
    setExpandedDate(null)
    setCurrentDate(prev => {
      if (zoomLevel === 'month') return new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      const d = new Date(prev)
      if (isWeekPreset && zoomLevel === 7) {
        const daysToSaturday = (d.getDay() + 1) % 7
        d.setDate(d.getDate() - daysToSaturday - 7)
      } else {
        d.setDate(d.getDate() - (zoomLevel as number))
      }
      return d
    })
    setNavigationEpoch(e => e + 1)
  }, [zoomLevel, isWeekPreset])

  const handleNext = useCallback(() => {
    setExpandedDate(null)
    setCurrentDate(prev => {
      if (zoomLevel === 'month') return new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      const d = new Date(prev)
      if (isWeekPreset && zoomLevel === 7) {
        const daysToSaturday = (d.getDay() + 1) % 7
        d.setDate(d.getDate() - daysToSaturday + 7)
      } else {
        d.setDate(d.getDate() + (zoomLevel as number))
      }
      return d
    })
    setNavigationEpoch(e => e + 1)
  }, [zoomLevel, isWeekPreset])

  const handleToday = useCallback(() => {
    const today = new Date()
    if (isWeekPreset && zoomLevel === 7) {
      const daysToSaturday = (today.getDay() + 1) % 7
      today.setDate(today.getDate() - daysToSaturday)
    }
    setCurrentDate(today)
    setExpandedDate(null)
    setNavigationEpoch(e => e + 1)
  }, [isWeekPreset, zoomLevel])

  const handleRequestDateShift = useCallback((days: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + days)
      return d
    })
  }, [])

  const handleDayClick = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    setCurrentDate(new Date(y, m - 1, d))
    setZoomLevel(1)
    setIsWeekPreset(false)
    setExpandedDate(null)
  }, [])

  // ---- Header helpers ----

  const isCurrentRange = useMemo(() => {
    const today = new Date()
    return today >= parseLocalDate(dateRange.start) &&
      today <= new Date(parseLocalDate(dateRange.end).getTime() + 86399999)
  }, [dateRange])

  const formatDateRange = () => {
    const start = parseLocalDate(dateRange.start)
    const end = parseLocalDate(dateRange.end)
    if (zoomLevel === 'month') {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`
  }

  const zoomPresets: { label: string; value: ZoomLevel; isWeek?: boolean }[] = [
    { label: '1D', value: 1 },
    { label: '3D', value: 3 },
    { label: t('week'), value: 7, isWeek: true },
    { label: '2W', value: 14 },
    { label: t('month'), value: 'month' },
  ]

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
            <CalendarDaysIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-gray-500 font-medium">{t('loadingSchedule')}</p>
        </motion.div>
      </div>
    )
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">{t('errorLoadingSchedule')}</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTasks}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            {t('tryAgain')}
          </button>
        </motion.div>
      </div>
    )
  }

  // ---- Empty state ----
  if (properties.length === 0) {
    return (
      <div className="p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-amber-100 p-8 sm:p-12 text-center"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
            <WrenchScrewdriverIcon className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">{t('noScheduledTasks')}</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            {t('noScheduledTasksDescription')}
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-white flex flex-col" style={{ maxHeight: isMobile ? 'calc(100vh - 4rem)' : 'calc(100vh - 5rem)' }}>
        {/* Lightweight amber header: Today, prev/next, date range, zoom presets */}
        <div className="px-2 py-2 sm:px-4 sm:py-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <motion.button
              onClick={handleToday}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isCurrentRange}
              className={`
                inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all
                ${isCurrentRange
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-amber-50 text-amber-600 hover:bg-amber-100 cursor-pointer'
                }
              `}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('today')}</span>
            </motion.button>

            <div className="flex items-center gap-0.5">
              <motion.button
                onClick={handlePrev}
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
                onClick={handleNext}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                aria-label="Next"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Zoom presets */}
            <div className="flex items-center gap-1 ml-auto">
              {zoomPresets.map(preset => {
                const isActive = preset.value === 'month'
                  ? zoomLevel === 'month'
                  : preset.isWeek
                    ? zoomLevel === 7 && isWeekPreset
                    : zoomLevel === preset.value && !(preset.value === 7 && isWeekPreset)
                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      if (preset.value === 'month') {
                        handleZoomChange('month')
                      } else {
                        handleZoomChange(preset.value, preset.isWeek ?? false)
                      }
                    }}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Scroll container */}
        <div ref={scrollContainerRef} className="overflow-y-auto flex-1 min-h-0 relative" onClick={clearActivatedItem}>
          {/* Sticky header portal */}
          <div className="sticky top-0 z-20 h-0">
            <div ref={stickyPortalRef} />
          </div>

          {/* Calendar body — timeline for all zooms (MonthGridView has no
              task support, so month zoom also renders the row timeline) */}
          <div className="overflow-x-hidden" style={{ overscrollBehaviorX: 'none' }}>
            <PropertyRowView
              projects={[]}
              properties={properties}
              dateRange={dateRange}
              onProjectClick={() => {}}
              tasks={visibleTasks}
              onTaskClick={handleTaskClick}
              bookings={[]}
              zoomLevel={zoomLevel}
              onRequestDateShift={handleRequestDateShift}
              stickyPortal={stickyPortalRef}
              expandedDate={expandedDate}
              onExpandDate={setExpandedDate}
              onDayClick={handleDayClick}
              scrollContainer={scrollContainerRef}
              navigationEpoch={navigationEpoch}
              activatedItem={activatedItem}
              disableDnd
            />
          </div>
        </div>
      </div>

      {/* Task action modal */}
      {selectedTask && (
        <ContractorTaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false)
            setSelectedTask(null)
          }}
          task={selectedTask}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </motion.div>
  )
}
