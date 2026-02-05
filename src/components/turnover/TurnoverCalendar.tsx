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
import type { CleaningProject, CleaningProjectStats } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import type { Property } from '@/services/types/property'
import CalendarHeader from './CalendarHeader'
import PropertyRowView from './PropertyRowView'
import CleanerRowView from './CleanerRowView'
import ProjectDetailModal from './ProjectDetailModal'
import CreateProjectModal from './create/CreateProjectModal'
import CreateChecklistModal from '@/components/checklist/create/CreateChecklistModal'

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

  // Loading state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [selectedProject, setSelectedProject] = useState<CleaningProject | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateChecklistModal, setShowCreateChecklistModal] = useState(false)

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
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
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

  // Handle project click
  const handleProjectClick = (project: CleaningProject) => {
    setSelectedProject(project)
    setShowDetailModal(true)
  }

  // Handle project update (after editing in modal)
  const handleProjectUpdate = (updatedProject: CleaningProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p))
    setShowDetailModal(false)
    setSelectedProject(null)
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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard label="Pending" value={stats.pending} color="yellow" />
          <StatCard label="Assigned" value={stats.assigned} color="blue" />
          <StatCard label="Confirmed" value={stats.confirmed} color="indigo" />
          <StatCard label="In Progress" value={stats.inProgress} color="purple" />
          <StatCard label="Completed" value={stats.completed} color="green" />
          <StatCard label="Unassigned" value={stats.unassigned} color="amber" highlight />
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
              />
            ) : (
              <CleanerRowView
                projects={projects}
                cleaners={cleaners}
                dateRange={dateRange}
                onProjectClick={handleProjectClick}
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
