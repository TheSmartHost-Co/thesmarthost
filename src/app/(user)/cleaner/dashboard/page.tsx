'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getCleanerByAuthUserId } from '@/services/cleanerService'
import {
  getCleaningProjects,
  formatTime,
  getStatusDisplay,
} from '@/services/cleaningProjectService'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner, CleanerProperty } from '@/services/types/cleaner'

export default function CleanerDashboardPage() {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // State
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [projects, setProjects] = useState<CleaningProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firstName = profile?.fullName?.split(' ')[0] || 'there'

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

      // 2. Get projects for the next 30 days and past 30 days (for completed count)
      const today = new Date()
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 30)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 30)

      const projectsRes = await getCleaningProjects({
        userId: cleanerData.userId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      })

      if (projectsRes.status === 'success') {
        // Filter to only this cleaner's projects
        const myProjects = projectsRes.data.filter(
          p => p.cleanerId === cleanerData.id
        )
        setProjects(myProjects)
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    // Pending tasks: assigned (needs response) or confirmed (ready to start)
    const pendingTasks = projects.filter(
      p => p.status === 'assigned' || p.status === 'confirmed' || p.status === 'in_progress'
    ).length

    // Upcoming this week: non-completed projects in next 7 days
    const upcomingThisWeek = projects.filter(p => {
      if (p.status === 'completed' || p.status === 'cancelled') return false
      const dateStr = p.projectDate.split('T')[0]
      const projectDateObj = new Date(dateStr + 'T00:00:00')
      return projectDateObj >= today && projectDateObj <= endOfWeek
    }).length

    // Completed this month
    const completedThisMonth = projects.filter(p => {
      if (p.status !== 'completed') return false
      const dateStr = p.projectDate.split('T')[0]
      const projectDateObj = new Date(dateStr + 'T00:00:00')
      return projectDateObj >= startOfMonth
    }).length

    return {
      assignedProperties: cleaner?.assignedProperties?.length || 0,
      pendingTasks,
      upcomingThisWeek,
      completedThisMonth,
    }
  }, [projects, cleaner])

  // Today's tasks
  const todaysTasks = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return projects
      .filter(p => {
        if (p.status === 'completed' || p.status === 'cancelled') return false
        const dateStr = p.projectDate.split('T')[0]
        const projectDateObj = new Date(dateStr + 'T00:00:00')
        projectDateObj.setHours(0, 0, 0, 0)
        return projectDateObj.getTime() === today.getTime()
      })
      .sort((a, b) => {
        const timeA = a.projectStartTime || '00:00:00'
        const timeB = b.projectStartTime || '00:00:00'
        return timeA.localeCompare(timeB)
      })
  }, [projects])

  // Upcoming schedule (next 5, excluding today)
  const upcomingSchedule = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return projects
      .filter(p => {
        if (p.status === 'completed' || p.status === 'cancelled') return false
        const dateStr = p.projectDate.split('T')[0]
        const projectDateObj = new Date(dateStr + 'T00:00:00')
        projectDateObj.setHours(0, 0, 0, 0)
        return projectDateObj > today
      })
      .sort((a, b) => {
        const dateA = a.projectDate.split('T')[0]
        const dateB = b.projectDate.split('T')[0]
        if (dateA !== dateB) return dateA.localeCompare(dateB)
        const timeA = a.projectStartTime || '00:00:00'
        const timeB = b.projectStartTime || '00:00:00'
        return timeA.localeCompare(timeB)
      })
      .slice(0, 5)
  }, [projects])

  // Format date for display
  const formatDate = (dateStr: string) => {
    const justDate = dateStr.split('T')[0]
    const date = new Date(justDate + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-96 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-64 animate-pulse" />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-64 animate-pulse" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {firstName}!</h1>
          <p className="mt-1 text-gray-600">Here&apos;s an overview of your cleaning assignments and tasks.</p>
        </div>
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
              <h3 className="font-semibold text-red-800">Error loading dashboard</h3>
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
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {firstName}!
        </h1>
        <p className="mt-1 text-gray-600">
          Here&apos;s an overview of your cleaning assignments and tasks.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={HomeIcon}
          label="Assigned Properties"
          value={stats.assignedProperties.toString()}
          color="purple"
          href="/cleaner/properties"
        />
        <StatCard
          icon={ClipboardDocumentListIcon}
          label="Active Tasks"
          value={stats.pendingTasks.toString()}
          color="amber"
          href="/cleaner/tasks"
        />
        <StatCard
          icon={CalendarDaysIcon}
          label="Upcoming This Week"
          value={stats.upcomingThisWeek.toString()}
          color="blue"
          href="/cleaner/schedule"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Completed This Month"
          value={stats.completedThisMonth.toString()}
          color="green"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Tasks</h2>
            {todaysTasks.length > 0 && (
              <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg">
                {todaysTasks.length} task{todaysTasks.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {todaysTasks.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {todaysTasks.map((task, index) => (
                <TaskRow key={task.id} task={task} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-gray-500">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircleIcon className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">No tasks for today</p>
              <p className="text-xs text-gray-400 mt-1">Enjoy your day off!</p>
            </div>
          )}

          {todaysTasks.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
              <Link
                href="/cleaner/tasks"
                className="text-sm font-medium text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
              >
                View all tasks
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          )}
        </motion.div>

        {/* Upcoming Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Schedule</h2>
            {upcomingSchedule.length > 0 && (
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                Next {upcomingSchedule.length}
              </span>
            )}
          </div>

          {upcomingSchedule.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {upcomingSchedule.map((task, index) => (
                <ScheduleRow key={task.id} task={task} formatDate={formatDate} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-gray-500">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <CalendarDaysIcon className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">No upcoming cleanings</p>
              <p className="text-xs text-gray-400 mt-1">Your schedule will appear here</p>
            </div>
          )}

          {upcomingSchedule.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
              <Link
                href="/cleaner/schedule"
                className="text-sm font-medium text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
              >
                View full schedule
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* My Properties */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">My Assigned Properties</h2>
          {(cleaner?.assignedProperties?.length || 0) > 0 && (
            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg">
              {cleaner?.assignedProperties?.length} propert{cleaner?.assignedProperties?.length !== 1 ? 'ies' : 'y'}
            </span>
          )}
        </div>

        {(cleaner?.assignedProperties?.length || 0) > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
              {cleaner?.assignedProperties?.slice(0, 3).map((property, index) => (
                <PropertyMiniCard key={property.id} property={property} index={index} />
              ))}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
              <Link
                href="/cleaner/properties"
                className="text-sm font-medium text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
              >
                View all properties
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-gray-500">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <HomeIcon className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No properties assigned yet</p>
            <p className="text-xs text-gray-400 mt-1">Properties you&apos;re assigned to will appear here</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: string
  color: 'purple' | 'amber' | 'blue' | 'green'
  href?: string
}

function StatCard({ icon: Icon, label, value, color, href }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
  }

  const content = (
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer"
        >
          {content}
        </motion.div>
      </Link>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
    >
      {content}
    </motion.div>
  )
}

// Task Row Component (for Today's Tasks)
function TaskRow({ task, index }: { task: CleaningProject; index: number }) {
  const statusDisplay = getStatusDisplay(task.status)

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  return (
    <Link href="/cleaner/tasks">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 + index * 0.05 }}
        className="px-6 py-4 hover:bg-purple-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BuildingOfficeIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{task.propertyName || 'Unknown Property'}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ClockIcon className="w-3.5 h-3.5" />
                <span>{formatTime(task.projectStartTime) || 'No time set'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {task.status === 'in_progress' && (
              <PlayCircleIcon className="w-5 h-5 text-purple-500 animate-pulse" />
            )}
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${statusColors[task.status]}`}>
              {statusDisplay.label}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// Schedule Row Component (for Upcoming)
function ScheduleRow({
  task,
  formatDate,
  index,
}: {
  task: CleaningProject
  formatDate: (date: string) => string
  index: number
}) {
  return (
    <Link href="/cleaner/schedule">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 + index * 0.05 }}
        className="px-6 py-4 hover:bg-blue-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{task.propertyName || 'Unknown Property'}</p>
              <p className="text-sm text-gray-500">{formatDate(task.projectDate)}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium text-gray-700">{formatTime(task.projectStartTime) || '—'}</p>
            {task.isSameDayTurnover && (
              <span className="text-xs text-amber-600 font-medium">Same Day</span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// Property Mini Card Component
function PropertyMiniCard({ property, index }: { property: CleanerProperty; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05 }}
      className="bg-gray-50 rounded-xl p-4 border border-gray-100"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <BuildingOfficeIcon className="w-4.5 h-4.5 text-purple-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 text-sm truncate">
              {property.propertyName || 'Unnamed Property'}
            </p>
            {property.isDefault && (
              <StarIconSolid className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            )}
          </div>
          {property.propertyAddress && (
            <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1">
              <MapPinIcon className="w-3 h-3 flex-shrink-0" />
              {property.propertyAddress}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
