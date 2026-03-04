'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  PlusIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getCleaningProjects, getCleaningProjectStats } from '@/services/cleaningProjectService'
import { getCleaners } from '@/services/cleanerService'
import { getProperties } from '@/services/propertyService'
import { getOpenIssues } from '@/services/projectIssueService'
import { getPendingSupplyLists } from '@/services/supplyListService'
import { getBookings } from '@/services/bookingService'
import type { CleaningProject, CleaningProjectStats } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import CalendarHeader from './CalendarHeader'
import PropertyRowView from './PropertyRowView'
import CleanerRowView from './CleanerRowView'
import ProjectDetailModal from './ProjectDetailModal'
import CreateProjectModal from './create/CreateProjectModal'
import CreateChecklistModal from '@/components/checklist/create/CreateChecklistModal'
import DuplicateChecklistModal from '@/components/checklist/duplicate/DuplicateChecklistModal'
import PreviewBookingModal from '@/components/booking/preview/previewBookingModal'
import UpdateBookingModal from '@/components/booking/update/updateBookingModal'

export type ViewMode = 'property' | 'cleaner'

interface TurnoverCalendarProps {
  initialProperties?: Property[]
  initialCleaners?: Cleaner[]
}

export default function TurnoverCalendar({
  initialProperties,
  initialCleaners,
}: TurnoverCalendarProps) {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('property')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Data state
  const [projects, setProjects] = useState<CleaningProject[]>([])
  const [properties, setProperties] = useState<Property[]>(initialProperties || [])
  const [cleaners, setCleaners] = useState<Cleaner[]>(initialCleaners || [])
  const [stats, setStats] = useState<CleaningProjectStats | null>(null)
  const [issueCountsMap, setIssueCountsMap] = useState<Record<string, number>>({})
  const [supplyListCountsMap, setSupplyListCountsMap] = useState<Record<string, number>>({})

  // Bookings overlay state
  const [showBookings, setShowBookings] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsFetched, setBookingsFetched] = useState(false)

  // Loading state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [selectedProject, setSelectedProject] = useState<CleaningProject | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateChecklistModal, setShowCreateChecklistModal] = useState(false)
  const [showDuplicateChecklistModal, setShowDuplicateChecklistModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingPreview, setShowBookingPreview] = useState(false)
  const [showBookingUpdate, setShowBookingUpdate] = useState(false)

  // Format date as YYYY-MM-DD in local time (avoid timezone issues)
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Calculate date range for the current week view (Saturday-Friday)
  const dateRange = useMemo(() => {
    const start = new Date(currentDate)
    const day = start.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Go back to Saturday (start of week)
    // Saturday=0 back, Sunday=1 back, Monday=2 back, ..., Friday=6 back
    const daysToSaturday = (day + 1) % 7
    start.setDate(start.getDate() - daysToSaturday)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(end.getDate() + 6) // Friday
    end.setHours(23, 59, 59, 999)

    return {
      start: formatLocalDate(start),
      end: formatLocalDate(end),
    }
  }, [currentDate])

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return

      setLoading(true)
      setError(null)

      try {
        // Fetch projects, properties, cleaners, and stats in parallel
        const [projectsRes, propertiesRes, cleanersRes, statsRes] = await Promise.all([
          getCleaningProjects({
            userId: profile.id,
            startDate: dateRange.start,
            endDate: dateRange.end,
          }),
          initialProperties ? Promise.resolve({ status: 'success' as const, data: initialProperties }) : getProperties(profile.id),
          initialCleaners ? Promise.resolve({ status: 'success' as const, data: initialCleaners }) : getCleaners(profile.id),
          getCleaningProjectStats(profile.id, dateRange.start, dateRange.end),
        ])

        if (projectsRes.status === 'success') {
          setProjects(projectsRes.data)
        } else {
          throw new Error(projectsRes.message || 'Failed to fetch projects')
        }

        if (propertiesRes.status === 'success') {
          setProperties(propertiesRes.data)
        }

        if (cleanersRes.status === 'success') {
          setCleaners(cleanersRes.data)
        }

        if (statsRes.status === 'success') {
          setStats(statsRes.data)
        }

        // Fetch open issues and pending supply lists to show on calendar badges
        const [issuesRes, supplyRes] = await Promise.all([
          getOpenIssues(profile.id),
          getPendingSupplyLists(profile.id),
        ])
        if (issuesRes.status === 'success') {
          const countsMap: Record<string, number> = {}
          issuesRes.data.forEach(issue => {
            countsMap[issue.projectId] = (countsMap[issue.projectId] || 0) + 1
          })
          setIssueCountsMap(countsMap)
        }
        if (supplyRes.status === 'success') {
          const countsMap: Record<string, number> = {}
          supplyRes.data.forEach(list => {
            countsMap[list.projectId] = (countsMap[list.projectId] || 0) + 1
          })
          setSupplyListCountsMap(countsMap)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load calendar data'
        setError(message)
        showNotification(message, 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile?.id, dateRange.start, dateRange.end, initialProperties, initialCleaners, showNotification])

  // Refresh issue counts (call after issues are modified)
  const refreshIssueCounts = async () => {
    if (!profile?.id) return
    try {
      const issuesRes = await getOpenIssues(profile.id)
      if (issuesRes.status === 'success') {
        const countsMap: Record<string, number> = {}
        issuesRes.data.forEach(issue => {
          countsMap[issue.projectId] = (countsMap[issue.projectId] || 0) + 1
        })
        setIssueCountsMap(countsMap)
      }
    } catch (err) {
      console.error('Error refreshing issue counts:', err)
    }
  }

  // Refresh supply list counts (call after supply lists are modified)
  const refreshSupplyListCounts = async () => {
    if (!profile?.id) return
    try {
      const supplyRes = await getPendingSupplyLists(profile.id)
      if (supplyRes.status === 'success') {
        const countsMap: Record<string, number> = {}
        supplyRes.data.forEach(list => {
          countsMap[list.projectId] = (countsMap[list.projectId] || 0) + 1
        })
        setSupplyListCountsMap(countsMap)
      }
    } catch (err) {
      console.error('Error refreshing supply list counts:', err)
    }
  }

  // Handle bookings toggle
  const handleToggleBookings = async (enabled: boolean) => {
    setShowBookings(enabled)
    if (enabled && !bookingsFetched && profile?.id) {
      setBookingsLoading(true)
      try {
        const res = await getBookings({ userId: profile.id })
        if (res.status === 'success') {
          setBookings(res.data)
          setBookingsFetched(true)
        } else {
          showNotification(res.message || 'Failed to fetch bookings', 'error')
          setShowBookings(false)
        }
      } catch (err) {
        console.error('Error fetching bookings:', err)
        showNotification('Failed to fetch bookings', 'error')
        setShowBookings(false)
      } finally {
        setBookingsLoading(false)
      }
    }
  }

  // Filter bookings to those visible in the current week
  const visibleBookings = useMemo(() => {
    if (!showBookings || bookings.length === 0) return []
    return bookings.filter(b =>
      b.checkOutDate &&
      b.checkInDate <= dateRange.end &&
      b.checkOutDate >= dateRange.start
    )
  }, [showBookings, bookings, dateRange.start, dateRange.end])

  // Handle project click
  const handleProjectClick = (project: CleaningProject) => {
    setSelectedProject(project)
    setShowDetailModal(true)
  }

  // Handle booking click
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowBookingPreview(true)
  }

  // Handle project update (after editing in modal)
  const handleProjectUpdate = (updatedProject: CleaningProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p))
    setShowDetailModal(false)
    setSelectedProject(null)
    // Also refresh issue counts in case issues were modified
    refreshIssueCounts()
  }

  // Handle new project created
  const handleProjectCreate = (newProject: CleaningProject) => {
    setProjects(prev => [...prev, newProject])
    setShowCreateModal(false)
    // Refresh stats
    if (profile?.id) {
      getCleaningProjectStats(profile.id, dateRange.start, dateRange.end)
        .then(res => {
          if (res.status === 'success') setStats(res.data)
        })
    }
  }

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

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <CalendarDaysIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading turnover calendar...</p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
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
            <h3 className="font-semibold text-red-800">Error loading calendar</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard label="Pending" value={stats.pending} color="yellow" />
          <StatCard label="Assigned" value={stats.assigned} color="blue" />
          <StatCard label="Confirmed" value={stats.confirmed} color="indigo" />
          <StatCard label="In Progress" value={stats.inProgress} color="purple" />
          <StatCard label="Completed" value={stats.completed} color="green" />
          <StatCard label="Unassigned" value={stats.unassigned} color="amber" highlight />
          <StatCard
            label="Awaiting"
            value={projects.filter(p => p.status === 'assigned' && p.cleanerAccepted === null).length}
            color="amber"
            highlight
          />
        </div>
      )}

      {/* Calendar Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header with navigation and view toggle */}
        <CalendarHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentDate={currentDate}
          dateRange={dateRange}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
          onCreateProject={() => setShowCreateModal(true)}
          onCreateChecklist={() => setShowCreateChecklistModal(true)}
          onDuplicateChecklist={() => setShowDuplicateChecklistModal(true)}
          showBookings={showBookings}
          onToggleBookings={handleToggleBookings}
          bookingsLoading={bookingsLoading}
        />

        {/* Calendar View */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'property' ? (
              <PropertyRowView
                projects={projects}
                properties={properties}
                dateRange={dateRange}
                onProjectClick={handleProjectClick}
                onBookingClick={handleBookingClick}
                issueCountsMap={issueCountsMap}
                supplyListCountsMap={supplyListCountsMap}
                bookings={showBookings ? visibleBookings : []}
              />
            ) : (
              <CleanerRowView
                projects={projects}
                cleaners={cleaners}
                dateRange={dateRange}
                onProjectClick={handleProjectClick}
                issueCountsMap={issueCountsMap}
                supplyListCountsMap={supplyListCountsMap}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedProject(null)
            // Refresh counts when modal closes (in case issues/supply lists were modified)
            refreshIssueCounts()
            refreshSupplyListCounts()
          }}
          project={selectedProject}
          cleaners={cleaners}
          properties={properties}
          onUpdate={handleProjectUpdate}
        />
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleProjectCreate}
        properties={properties}
        cleaners={cleaners}
        initialDate={dateRange.start}
      />

      {/* Create Checklist Modal */}
      <CreateChecklistModal
        isOpen={showCreateChecklistModal}
        onClose={() => setShowCreateChecklistModal(false)}
        onAdd={() => {
          setShowCreateChecklistModal(false)
          showNotification('Checklist created successfully', 'success')
        }}
        properties={properties}
      />

      {/* Duplicate Checklist Modal */}
      <DuplicateChecklistModal
        isOpen={showDuplicateChecklistModal}
        onClose={() => setShowDuplicateChecklistModal(false)}
        onDuplicate={() => {
          setShowDuplicateChecklistModal(false)
          showNotification('Checklist duplicated successfully', 'success')
        }}
        properties={properties}
      />

      {/* Booking Preview Modal */}
      {selectedBooking && (
        <PreviewBookingModal
          isOpen={showBookingPreview}
          onClose={() => {
            setShowBookingPreview(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
          onEditBooking={() => {
            setShowBookingPreview(false)
            setShowBookingUpdate(true)
          }}
        />
      )}

      {/* Booking Update Modal */}
      {selectedBooking && (
        <UpdateBookingModal
          isOpen={showBookingUpdate}
          onClose={() => {
            setShowBookingUpdate(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
          onUpdate={(updatedBooking) => {
            setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b))
            setShowBookingUpdate(false)
            setSelectedBooking(null)
          }}
        />
      )}
    </motion.div>
  )
}

// Stat Card Component
function StatCard({
  label,
  value,
  color,
  highlight,
}: {
  label: string
  value: number
  color: string
  highlight?: boolean
}) {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  }

  const classes = colorClasses[color] || colorClasses.blue

  return (
    <div
      className={`
        ${classes.bg} ${classes.border} border rounded-xl p-3
        ${highlight && value > 0 ? 'ring-2 ring-amber-300 ring-offset-1' : ''}
      `}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold ${classes.text} mt-1`}>{value}</p>
    </div>
  )
}
