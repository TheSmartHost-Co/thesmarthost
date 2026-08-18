'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  PlusIcon,
  WrenchScrewdriverIcon,
  WrenchIcon,
  ClockIcon,
  CalendarDaysIcon,
  PlayCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  UserIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'
import { getMaintenanceTasks, getMaintenanceTaskById } from '@/services/maintenanceTaskService'
import { getContractors } from '@/services/contractorService'
import { getProperties } from '@/services/propertyService'
import { getIssueTypeDisplay } from '@/services/projectIssueService'
import { ISSUE_TYPE_ICONS } from '@/components/turnover/issues/issueTypeUi'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { useTaskProjectFlow } from '@/hooks/useTaskProjectFlow'
import SearchableSelect from '@/components/shared/SearchableSelect'
import ReportStandaloneIssueModal from '@/components/turnover/issues/ReportStandaloneIssueModal'
import CreateTaskModal from '@/components/turnover/tasks/CreateTaskModal'
import TaskDetailModal from '@/components/turnover/tasks/TaskDetailModal'
import type { MaintenanceTask, MaintenanceTaskStatus } from '@/services/types/maintenanceTask'
import type { Contractor } from '@/services/types/contractor'
import type { Property } from '@/services/types/property'
import type { IssueType } from '@/services/types/projectIssue'

const TASK_STATUSES: MaintenanceTaskStatus[] = [
  'pending',
  'assigned',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]

// Status chip/badge colors (shared convention)
const TASK_STATUS_COLORS: Record<MaintenanceTaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  assigned: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
}

const TASK_STATUS_LABEL_KEYS: Record<MaintenanceTaskStatus, string> = {
  pending: 'taskStatusPending',
  assigned: 'taskStatusAssigned',
  confirmed: 'taskStatusConfirmed',
  in_progress: 'taskStatusInProgress',
  completed: 'taskStatusCompleted',
  cancelled: 'taskStatusCancelled',
}

function formatTaskDate(dateStr?: string | null): string | null {
  if (!dateStr) return null
  const datePart = dateStr.split('T')[0]
  const [y, m, d] = datePart.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTaskTime(time?: string | null): string | null {
  if (!time) return null
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr, 10)
  if (isNaN(h)) return null
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mStr ?? '00'} ${suffix}`
}

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function MaintenancePageContent() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [allTasks, setAllTasks] = useState<MaintenanceTask[]>([]) // unfiltered, for stat cards
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [properties, setProperties] = useState<Property[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])

  // Filters (all server-side)
  const [statusFilter, setStatusFilter] = useState<MaintenanceTaskStatus | 'all'>('all')
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null)
  const [contractorFilter, setContractorFilter] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null)

  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)
  usePermissionGuard('maintenance')
  const { effectiveUserId, canWrite } = usePermissions()
  const canWriteMaintenance = canWrite('maintenance')

  const searchParams = useSearchParams()
  const deepLinkTaskId = searchParams.get('taskId')
  const deepLinkHandled = useRef(false)

  // "Create Task" two-step flow: report issue -> create task
  const handleTaskCreated = useCallback((task: MaintenanceTask) => {
    setTasks(prev => [task, ...prev])
    setAllTasks(prev => [task, ...prev])
  }, [])

  const taskFlow = useTaskProjectFlow({ onTaskCreated: handleTaskCreated })

  // Filtered list (server-side filters)
  const fetchTasks = useCallback(async () => {
    if (!effectiveUserId) return
    setLoading(true)
    setError(null)
    try {
      const res = await getMaintenanceTasks({
        userId: effectiveUserId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        contractorId: contractorFilter || undefined,
        propertyId: propertyFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      if (res.status === 'success') {
        setTasks(res.data)
      } else {
        setError(res.message || t('errorLoadingTasks'))
      }
    } catch (err) {
      console.error('Error fetching maintenance tasks:', err)
      setError(err instanceof Error ? err.message : t('errorLoadingTasks'))
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId, statusFilter, contractorFilter, propertyFilter, startDate, endDate, t])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Unfiltered list for the stat cards + supporting data
  useEffect(() => {
    if (!effectiveUserId) return
    const fetchSupportingData = async () => {
      try {
        const [tasksRes, propertiesRes, contractorsRes] = await Promise.all([
          getMaintenanceTasks({ userId: effectiveUserId }),
          getProperties(effectiveUserId),
          getContractors(effectiveUserId),
        ])
        if (tasksRes.status === 'success') setAllTasks(tasksRes.data)
        if (propertiesRes.status === 'success') setProperties(propertiesRes.data)
        if (contractorsRes.status === 'success') setContractors(contractorsRes.data)
      } catch (err) {
        console.error('Error fetching maintenance page data:', err)
      }
    }
    fetchSupportingData()
  }, [effectiveUserId])

  // Deep link: ?taskId= opens the detail modal once tasks are loaded
  useEffect(() => {
    if (!deepLinkTaskId || deepLinkHandled.current || loading) return
    deepLinkHandled.current = true
    const found = tasks.find(task => task.id === deepLinkTaskId)
      || allTasks.find(task => task.id === deepLinkTaskId)
    if (found) {
      setSelectedTask(found)
      return
    }
    getMaintenanceTaskById(deepLinkTaskId)
      .then((res) => {
        if (res.status === 'success') {
          setSelectedTask(res.data)
        }
      })
      .catch((err) => console.error('Error fetching deep-linked task:', err))
  }, [deepLinkTaskId, loading, tasks, allTasks])

  const handleTaskUpdated = (updated: MaintenanceTask) => {
    setTasks(prev => prev.map(task => task.id === updated.id ? updated : task))
    setAllTasks(prev => prev.map(task => task.id === updated.id ? updated : task))
    setSelectedTask(updated)
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
    setAllTasks(prev => prev.filter(task => task.id !== taskId))
    setSelectedTask(null)
  }

  // Stats (from the unfiltered list)
  const stats = useMemo(() => {
    const now = new Date()
    const isThisMonth = (dateStr?: string | null) => {
      if (!dateStr) return false
      const d = new Date(dateStr)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }
    return {
      total: allTasks.filter(task => task.status !== 'cancelled').length,
      awaitingResponse: allTasks.filter(task => task.status === 'assigned' && task.priceStatus !== 'agreed').length,
      scheduled: allTasks.filter(task => task.status === 'confirmed').length,
      inProgress: allTasks.filter(task => task.status === 'in_progress').length,
      completedThisMonth: allTasks.filter(task =>
        task.status === 'completed' && isThisMonth(task.actualEnd ?? task.updatedAt ?? task.createdAt)
      ).length,
    }
  }, [allTasks])

  const propertyOptions = useMemo(
    () =>
      properties.map((prop) => ({
        value: prop.id,
        label: prop.listingName || prop.internalName || prop.address,
        secondaryLabel: prop.address,
      })),
    [properties]
  )

  const contractorOptions = useMemo(
    () => [
      { value: 'unassigned', label: t('unassigned') },
      ...contractors.map((c) => ({
        value: c.id,
        label: c.name,
        secondaryLabel: c.trade || undefined,
      })),
    ],
    [contractors, t]
  )

  const hasActiveFilters =
    statusFilter !== 'all' || !!propertyFilter || !!contractorFilter || !!startDate || !!endDate

  const statCards = [
    {
      label: t('totalTasksStat'),
      value: stats.total,
      icon: WrenchScrewdriverIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: t('awaitingResponseStat'),
      value: stats.awaitingResponse,
      icon: ClockIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
    },
    {
      label: t('scheduledStat'),
      value: stats.scheduled,
      icon: CalendarDaysIcon,
      bgColor: 'bg-sky-50',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      borderColor: 'border-sky-100',
    },
    {
      label: t('inProgressStat'),
      value: stats.inProgress,
      icon: PlayCircleIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
    },
    {
      label: t('completedThisMonthStat'),
      value: stats.completedThisMonth,
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100',
    },
  ]

  const renderPrice = (task: MaintenanceTask) => {
    const suffix = task.pricingType === 'hourly' ? '/hr' : ''
    if (task.priceStatus === 'agreed' && task.agreedAmount != null) {
      return (
        <span className="text-sm font-semibold text-green-600">
          {formatAmount(task.agreedAmount)}{suffix}
          <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-green-500">
            {t('priceAgreedLabel')}
          </span>
        </span>
      )
    }
    if (task.priceStatus === 'offered' && task.offeredAmount != null) {
      return (
        <span className="text-sm font-semibold text-amber-600">
          {formatAmount(task.offeredAmount)}{suffix}
          <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-amber-500">
            {t('priceOfferedLabel')}
          </span>
        </span>
      )
    }
    return <span className="text-sm text-gray-400">—</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('maintenanceTitle')}</h1>
          <p className="text-gray-500 mt-1">{t('maintenanceSubtitle')}</p>
        </div>
        {canWriteMaintenance && (
          <motion.button
            onClick={taskFlow.startTaskProjectFlow}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {t('createTaskButton')}
          </motion.button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} border ${stat.borderColor} rounded-2xl p-5 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters + Task List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible"
      >
        {/* Filters */}
        <div className="p-5 border-b border-gray-100 space-y-4">
          {/* Status chips */}
          <div className="flex flex-wrap gap-2">
            {(['all', ...TASK_STATUSES] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${statusFilter === status
                    ? status === 'all'
                      ? 'bg-gray-900 text-white'
                      : TASK_STATUS_COLORS[status]
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {status === 'all' ? t('all') : t(TASK_STATUS_LABEL_KEYS[status])}
              </button>
            ))}
          </div>

          {/* Property / contractor / date range */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-2 text-gray-500">
              <FunnelIcon className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">{t('filterLabel')}</span>
            </div>
            <div className="w-full lg:w-56">
              <SearchableSelect
                options={propertyOptions}
                value={propertyFilter}
                onChange={(value) => setPropertyFilter(value)}
                placeholder={t('allProperties')}
                clearable
              />
            </div>
            <div className="w-full lg:w-56">
              <SearchableSelect
                options={contractorOptions}
                value={contractorFilter}
                onChange={(value) => setContractorFilter(value)}
                placeholder={t('allContractors')}
                clearable
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label={t('filterStartDate')}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
              <span className="text-gray-400 text-sm">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label={t('filterEndDate')}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">{t('loadingTasks')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <XCircleIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">{t('errorLoadingTasks')}</h3>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <WrenchIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('noMaintenanceTasks')}</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {hasActiveFilters ? t('tryAdjustingFilters') : t('noMaintenanceTasksHint')}
            </p>
            {!hasActiveFilters && canWriteMaintenance && (
              <motion.button
                onClick={taskFlow.startTaskProjectFlow}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {t('createTaskButton')}
              </motion.button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task, index) => {
              const issueType = (task.issueType || 'other') as IssueType
              const Icon = ISSUE_TYPE_ICONS[issueType] || WrenchScrewdriverIcon
              const typeInfo = getIssueTypeDisplay(issueType)
              const dateLabel = formatTaskDate(task.scheduledDate)
              const timeLabel = formatTaskTime(task.scheduledStartTime)

              return (
                <motion.button
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  onClick={() => setSelectedTask(task)}
                  className="w-full text-left px-5 py-4 hover:bg-blue-50/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Issue type icon */}
                    <div className={`
                      p-2.5 rounded-xl flex-shrink-0
                      ${typeInfo.color === 'red' ? 'bg-red-100 text-red-600' : ''}
                      ${typeInfo.color === 'amber' ? 'bg-amber-100 text-amber-600' : ''}
                      ${typeInfo.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                      ${typeInfo.color === 'purple' ? 'bg-purple-100 text-purple-600' : ''}
                      ${typeInfo.color === 'gray' ? 'bg-gray-100 text-gray-600' : ''}
                    `}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{task.title}</span>
                        {task.duringBookingId && (
                          <span
                            className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500"
                            title={t('duringGuestStay')}
                          />
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                        {task.propertyName && (
                          <span className="flex items-center gap-1">
                            <BuildingOfficeIcon className="w-3.5 h-3.5 text-gray-400" />
                            {task.propertyName}
                          </span>
                        )}
                        {dateLabel && (
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400" />
                            {dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                          {task.contractorName || t('unassigned')}
                        </span>
                      </div>
                    </div>

                    {/* Price + status */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {renderPrice(task)}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${TASK_STATUS_COLORS[task.status]}`}>
                        {t(TASK_STATUS_LABEL_KEYS[task.status])}
                      </span>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}

        {/* Results count */}
        {!loading && !error && tasks.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <p className="text-sm text-gray-500">
              {t('maintenanceResultsCount', { count: tasks.length })}
            </p>
          </div>
        )}
      </motion.div>

      {/* Create Task flow: step 1 — report a property issue */}
      <ReportStandaloneIssueModal
        isOpen={taskFlow.showReportIssueModal}
        onClose={taskFlow.closeAll}
        properties={properties}
        onCreated={taskFlow.handleIssueCreated}
      />

      {/* Create Task flow: step 2 — create the task from the issue */}
      {taskFlow.pendingTaskIssue && (
        <CreateTaskModal
          isOpen={taskFlow.showCreateTaskModal}
          onClose={taskFlow.closeAll}
          issue={taskFlow.pendingTaskIssue}
          onCreated={taskFlow.handleTaskCreated}
        />
      )}

      {/* Task detail */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      )}
    </div>
  )
}

export default function PropertyManagerMaintenancePage() {
  // useSearchParams (deep-link ?taskId=) requires a Suspense boundary
  return (
    <Suspense fallback={null}>
      <MaintenancePageContent />
    </Suspense>
  )
}
