'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import {
  WrenchScrewdriverIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InboxArrowDownIcon,
  ClockIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { getMyMaintenanceTasks } from '@/services/maintenanceTaskService'
import type { MaintenanceTask } from '@/services/types/maintenanceTask'
import MaintenanceTaskCard from '@/components/contractor-portal/MaintenanceTaskCard'
import { needsContractorResponse, isWaitingOnManager } from '@/constants/maintenanceTaskUi'

// Shared negotiation-turn predicates (src/constants/maintenanceTaskUi.ts)
const needsResponse = needsContractorResponse
const waitingOnManager = isWaitingOnManager

// Group tasks into the page's sections
function groupTasks(tasks: MaintenanceTask[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const groups = {
    needsResponse: [] as MaintenanceTask[],
    today: [] as MaintenanceTask[],
    tomorrow: [] as MaintenanceTask[],
    thisWeek: [] as MaintenanceTask[],
    upcoming: [] as MaintenanceTask[],
    waitingOnManager: [] as MaintenanceTask[],
    completed: [] as MaintenanceTask[],
  }

  tasks.forEach(task => {
    if (task.status === 'completed' || task.status === 'cancelled') {
      groups.completed.push(task)
      return
    }
    if (needsResponse(task)) {
      groups.needsResponse.push(task)
      return
    }
    if (waitingOnManager(task)) {
      groups.waitingOnManager.push(task)
      return
    }

    // Remaining active tasks (confirmed / in_progress / any other) group by date
    if (!task.scheduledDate) {
      groups.upcoming.push(task)
      return
    }
    const dateStr = task.scheduledDate.split('T')[0]
    const taskDate = new Date(dateStr + 'T00:00:00')
    taskDate.setHours(0, 0, 0, 0)

    if (taskDate.getTime() === today.getTime()) {
      groups.today.push(task)
    } else if (taskDate.getTime() === tomorrow.getTime()) {
      groups.tomorrow.push(task)
    } else if (taskDate > today && taskDate < nextWeek) {
      groups.thisWeek.push(task)
    } else if (taskDate >= nextWeek) {
      groups.upcoming.push(task)
    } else {
      // Past date, not completed — surface for attention
      groups.today.push(task)
    }
  })

  // Sort by scheduled date/time (unscheduled last)
  const sortByDateTime = (a: MaintenanceTask, b: MaintenanceTask) => {
    const keyOf = (t: MaintenanceTask) => {
      if (!t.scheduledDate) return '9999-12-31T23:59'
      return `${t.scheduledDate.split('T')[0]}T${t.scheduledStartTime || '00:00'}`
    }
    return keyOf(a).localeCompare(keyOf(b))
  }

  groups.needsResponse.sort(sortByDateTime)
  groups.today.sort(sortByDateTime)
  groups.tomorrow.sort(sortByDateTime)
  groups.thisWeek.sort(sortByDateTime)
  groups.upcoming.sort(sortByDateTime)
  groups.waitingOnManager.sort(sortByDateTime)
  groups.completed.sort((a, b) => sortByDateTime(b, a)) // Most recent first

  return groups
}

/**
 * Deep-link handler (renders nothing).
 * Reads ?taskId from URL; when tasks are loaded, scrolls to and
 * highlights the matching card, then cleans the URL.
 */
function ContractorDeepLinkHandler({
  tasks,
  loading,
  onHighlight,
}: {
  tasks: MaintenanceTask[]
  loading: boolean
  onHighlight: (taskId: string) => void
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const taskId = searchParams.get('taskId')
    if (!taskId) return

    if (tasks.some(t => t.id === taskId)) {
      onHighlight(taskId)
      // Give the DOM a tick to render (completed section may need expanding)
      setTimeout(() => {
        document.getElementById(`task-${taskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
    }

    // Clean the URL so Back doesn't re-trigger
    router.replace(pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  return null
}

export default function ContractorTasksPage() {
  const { t } = useTranslation('contractorPortal')
  const { profile } = useUserStore()

  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      const res = await getMyMaintenanceTasks()
      if (res.status !== 'success') {
        throw new Error(res.message || 'Could not load tasks')
      }
      setTasks(res.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks'
      setError(message)
      console.error('Error loading tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const groupedTasks = useMemo(() => groupTasks(tasks), [tasks])

  // Optimistic merge after card actions. A decline clears the contractor
  // from the task, so it drops off this contractor's list.
  const handleTaskUpdated = useCallback((updated: MaintenanceTask) => {
    if (!updated.contractorId) {
      setTasks(prev => prev.filter(t => t.id !== updated.id))
      return
    }
    setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)))
  }, [])

  const handleHighlight = useCallback((taskId: string) => {
    setHighlightedTaskId(taskId)
    setTimeout(() => setHighlightedTaskId(null), 4000)
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
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
              <h3 className="font-semibold text-red-800">{t('errorLoadingTasks')}</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            {t('tryAgain')}
          </button>
        </motion.div>
      </div>
    )
  }

  const activeCount =
    groupedTasks.needsResponse.length +
    groupedTasks.today.length +
    groupedTasks.tomorrow.length +
    groupedTasks.thisWeek.length +
    groupedTasks.upcoming.length +
    groupedTasks.waitingOnManager.length

  // Empty state
  if (activeCount === 0 && groupedTasks.completed.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('myTasks')}</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">{t('yourMaintenanceTasks')}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
            <WrenchScrewdriverIcon className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">{t('noTasksAssigned')}</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            {t('noTasksAssignedDescription')}
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Deep-link handler (requires Suspense for useSearchParams) */}
      <Suspense fallback={null}>
        <ContractorDeepLinkHandler
          tasks={tasks}
          loading={loading}
          onHighlight={handleHighlight}
        />
      </Suspense>

      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('myTasks')}</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">
          {activeCount > 0
            ? t('activeTaskCount', { count: activeCount })
            : t('allCaughtUp')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
        <StatCard
          icon={InboxArrowDownIcon}
          label={t('needsYourResponse')}
          value={groupedTasks.needsResponse.length}
          color="amber"
          highlight={groupedTasks.needsResponse.length > 0}
        />
        <StatCard
          icon={ClockIcon}
          label={t('today')}
          value={groupedTasks.today.length}
          color="purple"
        />
        <StatCard
          icon={CalendarDaysIcon}
          label={t('thisWeek')}
          value={groupedTasks.tomorrow.length + groupedTasks.thisWeek.length}
          color="blue"
        />
        <StatCard
          icon={CheckCircleIcon}
          label={t('completed')}
          value={groupedTasks.completed.length}
          color="green"
        />
      </div>

      {/* Task Groups */}
      <div className="space-y-6">
        {groupedTasks.needsResponse.length > 0 && (
          <TaskGroup
            title={t('needsYourResponse')}
            titleColor="text-amber-700"
            bgColor="bg-amber-50"
            tasks={groupedTasks.needsResponse}
            onTaskUpdated={handleTaskUpdated}
            highlightedTaskId={highlightedTaskId}
          />
        )}

        {groupedTasks.today.length > 0 && (
          <TaskGroup
            title={t('today')}
            titleColor="text-purple-700"
            bgColor="bg-purple-50"
            tasks={groupedTasks.today}
            onTaskUpdated={handleTaskUpdated}
            highlightedTaskId={highlightedTaskId}
          />
        )}

        {groupedTasks.tomorrow.length > 0 && (
          <TaskGroup
            title={t('tomorrow')}
            titleColor="text-blue-700"
            bgColor="bg-blue-50"
            tasks={groupedTasks.tomorrow}
            onTaskUpdated={handleTaskUpdated}
            highlightedTaskId={highlightedTaskId}
          />
        )}

        {groupedTasks.thisWeek.length > 0 && (
          <TaskGroup
            title={t('thisWeek')}
            titleColor="text-indigo-700"
            bgColor="bg-indigo-50"
            tasks={groupedTasks.thisWeek}
            onTaskUpdated={handleTaskUpdated}
            highlightedTaskId={highlightedTaskId}
          />
        )}

        {groupedTasks.upcoming.length > 0 && (
          <TaskGroup
            title={t('upcoming')}
            titleColor="text-gray-700"
            bgColor="bg-gray-50"
            tasks={groupedTasks.upcoming}
            onTaskUpdated={handleTaskUpdated}
            highlightedTaskId={highlightedTaskId}
          />
        )}

        {groupedTasks.waitingOnManager.length > 0 && (
          <TaskGroup
            title={t('waitingOnManager')}
            titleColor="text-sky-700"
            bgColor="bg-sky-50"
            tasks={groupedTasks.waitingOnManager}
            onTaskUpdated={handleTaskUpdated}
            highlightedTaskId={highlightedTaskId}
          />
        )}

        {groupedTasks.completed.length > 0 && (
          <CompletedSection
            tasks={groupedTasks.completed}
            onTaskUpdated={handleTaskUpdated}
            highlightedTaskId={highlightedTaskId}
          />
        )}
      </div>
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: number
  color: 'amber' | 'purple' | 'blue' | 'green'
  highlight?: boolean
}

function StatCard({ icon: Icon, label, value, color, highlight }: StatCardProps) {
  const colorClasses = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
  }

  return (
    <div className={`
      rounded-xl border p-3 sm:p-3 ${colorClasses[color]}
      ${highlight ? 'ring-2 ring-amber-300 ring-offset-1' : ''}
    `}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 opacity-70" />
        <span className="text-[11px] sm:text-xs font-medium opacity-70">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{value}</p>
    </div>
  )
}

// Task Group Component
interface TaskGroupProps {
  title: string
  titleColor: string
  bgColor: string
  tasks: MaintenanceTask[]
  onTaskUpdated: (task: MaintenanceTask) => void
  highlightedTaskId: string | null
}

function TaskGroup({ title, titleColor, bgColor, tasks, onTaskUpdated, highlightedTaskId }: TaskGroupProps) {
  return (
    <div>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${bgColor} mb-3`}>
        <span className={`text-sm font-semibold ${titleColor}`}>{title}</span>
        <span className={`text-xs font-medium ${titleColor} opacity-70`}>
          ({tasks.length})
        </span>
      </div>
      <div className="space-y-3">
        {tasks.map(task => (
          <div
            key={task.id}
            id={`task-${task.id}`}
            className={highlightedTaskId === task.id ? 'ring-2 ring-amber-400 ring-offset-2 rounded-xl transition-shadow' : ''}
          >
            <MaintenanceTaskCard task={task} onTaskUpdated={onTaskUpdated} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Completed Section (collapsible)
function CompletedSection({
  tasks,
  onTaskUpdated,
  highlightedTaskId,
}: {
  tasks: MaintenanceTask[]
  onTaskUpdated: (task: MaintenanceTask) => void
  highlightedTaskId: string | null
}) {
  const { t } = useTranslation('contractorPortal')
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer"
      >
        <CheckCircleIcon className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {t('recentlyCompleted', { count: tasks.length })}
        </span>
        <span className="text-xs">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 space-y-3"
        >
          {tasks.slice(0, 5).map(task => (
            <div
              key={task.id}
              id={`task-${task.id}`}
              className={highlightedTaskId === task.id ? 'ring-2 ring-amber-400 ring-offset-2 rounded-xl' : ''}
            >
              <MaintenanceTaskCard task={task} onTaskUpdated={onTaskUpdated} />
            </div>
          ))}
          {tasks.length > 5 && (
            <p className="text-sm text-gray-500 text-center py-2">
              {t('moreCompletedTasks', { count: tasks.length - 5 })}
            </p>
          )}
        </motion.div>
      )}
    </div>
  )
}
