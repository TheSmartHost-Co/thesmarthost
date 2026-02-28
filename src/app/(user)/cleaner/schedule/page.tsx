'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ExclamationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeModernIcon,
  ClockIcon,
  Squares2X2Icon,
  ListBulletIcon,
  CalendarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getCleanerByAuthUserId } from '@/services/cleanerService'
import {
  getCleaningProjects,
  getStatusDisplay,
  formatTime,
  acceptProject,
  declineProject,
  startProject,
  completeProject,
} from '@/services/cleaningProjectService'
import { getOpenIssues } from '@/services/projectIssueService'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import ProjectCard from '@/components/cleaner-portal/ProjectCard'
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
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [issueCountsMap, setIssueCountsMap] = useState<Record<string, number>>({})

  // Modal state
  const [selectedProject, setSelectedProject] = useState<CleaningProject | null>(null)
  const [showChecklistModal, setShowChecklistModal] = useState(false)

  // Swipe gesture ref
  const touchStartX = useRef<number | null>(null)

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

        // 3. Fetch open issues for badge display
        const issuesRes = await getOpenIssues(cleanerData.userId)
        if (issuesRes.status === 'success') {
          const countsMap: Record<string, number> = {}
          issuesRes.data.forEach(issue => {
            if (myProjects.some(p => p.id === issue.projectId)) {
              countsMap[issue.projectId] = (countsMap[issue.projectId] || 0) + 1
            }
          })
          setIssueCountsMap(countsMap)
        }
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
    setSelectedDay(prev => {
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
    setSelectedDay(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + 7)
      return newDate
    })
  }

  const handleToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(new Date())
  }

  const handleViewModeChange = (mode: 'week' | 'day') => {
    setViewMode(mode)
    if (mode === 'day') {
      // Auto-select today if it falls within the current week, otherwise first day of week
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const inWeek = today >= dateRange.start && today <= dateRange.end
      setSelectedDay(inWeek ? new Date() : new Date(dateRange.start))
    }
  }

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Check if a date is the selected day
  const isSelectedDay = (date: Date) => {
    return date.toDateString() === selectedDay.toDateString()
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

  // Format compact date range for header
  const formatDateRange = () => {
    const startMonth = dateRange.start.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = dateRange.end.toLocaleDateString('en-US', { month: 'short' })
    const startDay = dateRange.start.getDate()
    const endDay = dateRange.end.getDate()
    const year = dateRange.end.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`
  }

  // Handle project click (week view)
  const handleProjectClick = (project: CleaningProject) => {
    setSelectedProject(project)
    setShowChecklistModal(true)
  }

  // Action handlers (same pattern as tasks page)
  const handleAccept = async (projectId: string) => {
    try {
      const res = await acceptProject(projectId)
      if (res.status === 'success') {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? res.data : p
        ))
        showNotification('Task accepted!', 'success')
      } else {
        showNotification(res.message || 'Failed to accept task', 'error')
      }
    } catch (err) {
      console.error('Error accepting task:', err)
      showNotification('Error accepting task', 'error')
    }
  }

  const handleDecline = async (projectId: string) => {
    try {
      const res = await declineProject(projectId)
      if (res.status === 'success') {
        setProjects(prev => prev.filter(p => p.id !== projectId))
        showNotification('Task declined', 'info')
      } else {
        showNotification(res.message || 'Failed to decline task', 'error')
      }
    } catch (err) {
      console.error('Error declining task:', err)
      showNotification('Error declining task', 'error')
    }
  }

  const handleStart = async (projectId: string) => {
    try {
      const res = await startProject(projectId)
      if (res.status === 'success') {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? res.data : p
        ))
        showNotification('Task started! Good luck!', 'success')
        setSelectedProject(res.data)
        setShowChecklistModal(true)
      } else {
        showNotification(res.message || 'Failed to start task', 'error')
      }
    } catch (err) {
      console.error('Error starting task:', err)
      showNotification('Error starting task', 'error')
    }
  }

  const handleComplete = async (projectId: string) => {
    try {
      const res = await completeProject(projectId)
      if (res.status === 'success') {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? res.data : p
        ))
        showNotification('Great job! Task completed!', 'success')
      } else {
        showNotification(res.message || 'Failed to complete task', 'error')
      }
    } catch (err) {
      console.error('Error completing task:', err)
      showNotification('Error completing task', 'error')
    }
  }

  const handleViewChecklist = (project: CleaningProject) => {
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

  // Get projects for selected day (day view)
  const selectedDayKey = selectedDay.toISOString().split('T')[0]
  const selectedDayProjects = projectsByDate[selectedDayKey] || []

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-500 mt-1">View your cleaning assignments by week</p>
      </div>

      {/* Calendar Container */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return
          const delta = e.changedTouches[0].clientX - touchStartX.current
          touchStartX.current = null
          if (delta < -50) handleNextWeek()
          else if (delta > 50) handlePrevWeek()
        }}
      >
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
          {/* Left: Nav arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Previous week"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Next week"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Center: Date range + task count */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-700">
              {formatDateRange()}
            </span>
            {projects.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-purple-600">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                {projects.length}
              </span>
            )}
          </div>

          {/* Right: Today + View toggle icons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleToday}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer text-gray-500 hover:text-gray-700"
              title="Today"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('week')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'
              }`}
              title="Week view"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('day')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'
              }`}
              title="Day view"
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day View */}
        {viewMode === 'day' && (
          <div>
            {/* Day Pill Row */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 overflow-x-auto">
              {weekDays.map(day => {
                const { dayName, dayNum } = formatDayHeader(day)
                const dateKey = day.toISOString().split('T')[0]
                const hasTasks = (projectsByDate[dateKey] || []).length > 0
                const selected = isSelectedDay(day)
                const today = isToday(day)

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDay(new Date(day))}
                    className={`
                      flex flex-col items-center px-3.5 py-2 rounded-xl transition-all cursor-pointer min-w-[52px]
                      ${selected
                        ? 'bg-purple-600 text-white shadow-sm'
                        : today
                          ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className={`text-[10px] font-medium uppercase ${selected ? 'text-purple-200' : ''}`}>
                      {dayName}
                    </span>
                    <span className={`text-lg font-bold leading-tight ${selected ? 'text-white' : ''}`}>
                      {dayNum}
                    </span>
                    {hasTasks && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        selected ? 'bg-white' : 'bg-purple-400'
                      }`} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Project List for Selected Day */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  {selectedDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </h3>
                {selectedDayProjects.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-full">
                    {selectedDayProjects.length}
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDayKey}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {selectedDayProjects.length > 0 ? (
                    selectedDayProjects.map(project => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        openIssueCount={issueCountsMap[project.id] || 0}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                        onStart={handleStart}
                        onComplete={handleComplete}
                        onViewChecklist={handleViewChecklist}
                      />
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto">
                        <CalendarDaysIcon className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 mt-3">
                        {isToday(selectedDay)
                          ? 'No tasks scheduled for today'
                          : selectedDay < new Date()
                            ? 'No tasks were scheduled for this day'
                            : 'No tasks scheduled yet'
                        }
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Week Grid */}
        {viewMode === 'week' && (
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
                  <div
                    className={`
                      px-2 py-3 text-center border-b border-gray-100 sticky top-0 bg-white z-10
                      cursor-pointer hover:bg-gray-50 transition-colors
                      ${today ? 'bg-purple-50 hover:bg-purple-100/70' : ''}
                    `}
                    onClick={() => { setSelectedDay(new Date(day)); setViewMode('day'); }}
                  >
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
        )}
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
