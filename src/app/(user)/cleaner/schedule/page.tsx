'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ExclamationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeModernIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getCleanerByAuthUserId } from '@/services/cleanerService'
import { getCleaningProjects, getStatusDisplay, formatTime } from '@/services/cleaningProjectService'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import ChecklistModal from '@/components/cleaner-portal/ChecklistModal'

export default function CleanerSchedulePage() {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // State
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [projects, setProjects] = useState<CleaningProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Modal state
  const [selectedProject, setSelectedProject] = useState<CleaningProject | null>(null)
  const [showChecklistModal, setShowChecklistModal] = useState(false)

  // Calculate date range for the current week view
  const dateRange = useMemo(() => {
    const start = new Date(currentDate)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Monday
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(end.getDate() + 6) // Sunday
    end.setHours(23, 59, 59, 999)

    return {
      start,
      end,
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
    }
  }, [currentDate])

  // Generate week days
  const weekDays = useMemo(() => {
    const days = []
    const current = new Date(dateRange.start)
    for (let i = 0; i < 7; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }, [dateRange.start])

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      // 1. Get cleaner record
      const cleanerRes = await getCleanerByAuthUserId(profile.id)
      if (cleanerRes.status !== 'success') {
        throw new Error(cleanerRes.message || 'Could not find your cleaner profile')
      }

      const cleanerData = cleanerRes.data
      setCleaner(cleanerData)

      // 2. Get projects for the week
      const projectsRes = await getCleaningProjects({
        userId: cleanerData.userId,
        startDate: dateRange.startStr,
        endDate: dateRange.endStr,
      })

      if (projectsRes.status === 'success') {
        // Filter projects assigned to this cleaner
        const myProjects = projectsRes.data.filter(
          p => p.cleanerId === cleanerData.id
        )
        setProjects(myProjects)
      } else {
        throw new Error(projectsRes.message || 'Failed to fetch schedule')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load schedule'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, dateRange.startStr, dateRange.endStr])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Group projects by date
  const projectsByDate = useMemo(() => {
    const grouped: Record<string, CleaningProject[]> = {}
    projects.forEach(project => {
      // Handle both ISO timestamp (2026-02-01T05:00:00.000Z) and date string (2026-02-01) formats
      const dateKey = project.scheduledDate.split('T')[0]
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(project)
    })
    // Sort each day's projects by checkout time
    Object.values(grouped).forEach(dayProjects => {
      dayProjects.sort((a, b) => {
        const timeA = a.checkoutTime || '00:00:00'
        const timeB = b.checkoutTime || '00:00:00'
        return timeA.localeCompare(timeB)
      })
    })
    return grouped
  }, [projects])

  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() - 7)
      return newDate
    })
  }

  const handleNextWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + 7)
      return newDate
    })
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Format day header
  const formatDayHeader = (date: Date) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return {
      dayName: dayNames[date.getDay()],
      dayNum: date.getDate(),
      monthName: date.toLocaleDateString('en-US', { month: 'short' }),
    }
  }

  // Handle project click
  const handleProjectClick = (project: CleaningProject) => {
    setSelectedProject(project)
    setShowChecklistModal(true)
  }

  const handleProjectComplete = (completedProject: CleaningProject) => {
    setProjects(prev => prev.map(p =>
      p.id === completedProject.id ? completedProject : p
    ))
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-16 bg-gray-100 animate-pulse" />
          <div className="h-96 bg-gray-50 animate-pulse" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
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
              <h3 className="font-semibold text-red-800">Error loading schedule</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-500 mt-1">View your cleaning assignments by week</p>
      </div>

      {/* Calendar Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {dateRange.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-sm text-gray-500">
              {dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' - '}
              {dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarDaysIcon className="w-5 h-5" />
            <span>{projects.length} task{projects.length !== 1 ? 's' : ''} this week</span>
          </div>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDays.map((day, idx) => {
            const dateKey = day.toISOString().split('T')[0]
            const dayProjects = projectsByDate[dateKey] || []
            const { dayName, dayNum, monthName } = formatDayHeader(day)
            const today = isToday(day)

            return (
              <div
                key={dateKey}
                className={`
                  border-r border-gray-100 last:border-r-0
                  ${today ? 'bg-purple-50/50' : ''}
                `}
              >
                {/* Day Header */}
                <div className={`
                  px-2 py-3 text-center border-b border-gray-100 sticky top-0 bg-white z-10
                  ${today ? 'bg-purple-50' : ''}
                `}>
                  <p className={`text-xs font-medium uppercase ${today ? 'text-purple-600' : 'text-gray-500'}`}>
                    {dayName}
                  </p>
                  <p className={`
                    text-lg font-bold mt-0.5
                    ${today
                      ? 'w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center mx-auto'
                      : 'text-gray-900'
                    }
                  `}>
                    {dayNum}
                  </p>
                  {idx === 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">{monthName}</p>
                  )}
                </div>

                {/* Day Content */}
                <div className="p-1.5 space-y-1.5">
                  {dayProjects.map(project => {
                    const statusDisplay = getStatusDisplay(project.status)
                    return (
                      <button
                        key={project.id}
                        onClick={() => handleProjectClick(project)}
                        className={`
                          w-full text-left p-2 rounded-lg border-l-3 transition-all hover:shadow-md
                          cursor-pointer
                          ${getProjectBgClass(project.status)}
                        `}
                      >
                        <div className="flex items-start gap-1.5">
                          <HomeModernIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {project.propertyName || 'Unknown'}
                            </p>
                            {project.checkoutTime && (
                              <p className="text-[10px] text-gray-500 flex items-center gap-0.5 mt-0.5">
                                <ClockIcon className="w-3 h-3" />
                                {formatTime(project.checkoutTime)}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`
                          inline-block mt-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded
                          ${getStatusBadgeClass(project.status)}
                        `}>
                          {statusDisplay.label}
                        </span>
                      </button>
                    )
                  })}

                  {dayProjects.length === 0 && (
                    <div className="py-6 text-center text-gray-300">
                      <CalendarDaysIcon className="w-6 h-6 mx-auto" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Checklist Modal */}
      {selectedProject && (
        <ChecklistModal
          isOpen={showChecklistModal}
          onClose={() => {
            setShowChecklistModal(false)
            setSelectedProject(null)
          }}
          project={selectedProject}
          onProjectComplete={handleProjectComplete}
        />
      )}
    </div>
  )
}

// Helper functions for styling
function getProjectBgClass(status: string): string {
  const classes: Record<string, string> = {
    pending: 'bg-gray-50 border-gray-300',
    assigned: 'bg-blue-50 border-blue-400',
    confirmed: 'bg-indigo-50 border-indigo-400',
    in_progress: 'bg-purple-50 border-purple-400',
    completed: 'bg-green-50 border-green-400',
    cancelled: 'bg-gray-50 border-gray-300',
  }
  return classes[status] || classes.pending
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    assigned: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return classes[status] || classes.pending
}
