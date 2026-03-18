'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { getSchedules, deleteSchedule, toggleSchedule, runScheduleNow, formatScheduleFrequency, formatNextRun } from '@/services/scheduleService'
import type { Schedule } from '@/services/types/schedule'
import { FORMAT_LABELS, REPORT_MODE_LABELS } from '@/services/types/schedule'
import {
  PlusIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  PencilSquareIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import CreateScheduleModal from '@/components/scheduled-reports/create/createScheduleModal'
import ScheduleRunsModal from '@/components/scheduled-reports/runs/scheduleRunsModal'
import ScheduleActionsModal from '@/components/scheduled-reports/actions/scheduleActionsModal'

export default function ScheduledReportsPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()
  usePermissionGuard('scheduled_reports')
  const { effectiveUserId, canWrite } = usePermissions()

  // Data state
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Search
  const [searchTerm, setSearchTerm] = useState('')

  // UI state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [showRunsModal, setShowRunsModal] = useState<boolean>(false)
  const [showActionsModal, setShowActionsModal] = useState<boolean>(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    if (profile?.id) {
      loadSchedules()
    }
  }, [profile])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await getSchedules()
      if (res.status === 'success') {
        setSchedules(res.data || [])
      } else {
        setError(res.message || 'Failed to load schedules')
      }
    } catch (err) {
      console.error('Error loading schedules:', err)
      setError('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (schedule: Schedule) => {
    try {
      setTogglingId(schedule.id)
      const res = await toggleSchedule(schedule.id)
      if (res.status === 'success') {
        showNotification(
          schedule.isActive ? 'Schedule paused' : 'Schedule activated',
          'success'
        )
        await loadSchedules()
      } else {
        showNotification(res.message || 'Failed to toggle schedule', 'error')
      }
    } catch (err) {
      console.error('Error toggling schedule:', err)
      showNotification('Failed to toggle schedule', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleRunNow = async (schedule: Schedule) => {
    try {
      setRunningId(schedule.id)
      const res = await runScheduleNow(schedule.id)
      if (res.status === 'success') {
        showNotification('Schedule execution started', 'success')
        await loadSchedules()
      } else {
        showNotification(res.message || 'Failed to run schedule', 'error')
      }
    } catch (err) {
      console.error('Error running schedule:', err)
      showNotification('Failed to run schedule', 'error')
    } finally {
      setRunningId(null)
    }
  }

  const handleDelete = async (schedule: Schedule) => {
    if (!confirm(`Are you sure you want to delete "${schedule.name}"?`)) return

    try {
      setDeletingId(schedule.id)
      const res = await deleteSchedule(schedule.id)
      if (res.status === 'success') {
        showNotification('Schedule deleted', 'success')
        await loadSchedules()
      } else {
        showNotification(res.message || 'Failed to delete schedule', 'error')
      }
    } catch (err) {
      console.error('Error deleting schedule:', err)
      showNotification('Failed to delete schedule', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setShowCreateModal(true)
  }

  const handleViewRuns = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setShowRunsModal(true)
  }

  const handleRowClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setShowActionsModal(true)
  }

  // Refresh schedules and update selectedSchedule to prevent stale data
  const handleScheduleUpdatedFromModal = async () => {
    await loadSchedules()
    // Note: selectedSchedule will be refreshed on next modal open
    // or cleared when modal closes
  }

  const handleScheduleCreated = async () => {
    await loadSchedules()
    setShowCreateModal(false)
    setSelectedSchedule(null)
  }

  const getScheduleActions = (schedule: Schedule): ActionItem[] => {
    const actions: ActionItem[] = []

    if (canWrite('scheduled_reports')) {
      actions.push(
        {
          label: schedule.isActive ? 'Pause' : 'Activate',
          icon: schedule.isActive ? PauseIcon : PlayIcon,
          onClick: () => handleToggle(schedule),
          variant: 'default'
        },
        {
          label: 'Run Now',
          icon: BoltIcon,
          onClick: () => handleRunNow(schedule),
          variant: 'default'
        },
      )
    }

    actions.push({
      label: 'View Runs',
      icon: ChartBarIcon,
      onClick: () => handleViewRuns(schedule),
      variant: 'default'
    })

    if (canWrite('scheduled_reports')) {
      actions.push(
        {
          label: 'Edit',
          icon: PencilSquareIcon,
          onClick: () => handleEdit(schedule),
          variant: 'default'
        },
        {
          label: 'Delete',
          icon: TrashIcon,
          onClick: () => handleDelete(schedule),
          variant: 'danger'
        }
      )
    }

    return actions
  }

  // Filter schedules by search
  const filteredSchedules = schedules.filter(schedule =>
    schedule.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate stats
  const stats = {
    total: schedules.length,
    active: schedules.filter(s => s.isActive).length,
    paused: schedules.filter(s => !s.isActive).length,
  }

  const statCards = [
    {
      label: 'Total Schedules',
      value: stats.total,
      icon: ClockIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      label: 'Active',
      value: stats.active,
      icon: PlayIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      label: 'Paused',
      value: stats.paused,
      icon: PauseIcon,
      bgColor: 'bg-gray-50',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      borderColor: 'border-gray-100'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
            <p className="text-gray-500 mt-1">Automate report generation and distribution</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading schedules...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
            <p className="text-gray-500 mt-1">Automate report generation and distribution</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading schedules</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <ClockIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
            <p className="text-gray-500">Automate report generation and distribution</p>
          </div>
        </div>
        {canWrite('scheduled_reports') && (
          <motion.button
            onClick={() => {
              setSelectedSchedule(null)
              setShowCreateModal(true)
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Schedule
          </motion.button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Search */}
        <div className="p-5 border-b border-gray-100">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:bg-white transition-all"
              placeholder="Search schedules..."
            />
          </div>
        </div>

        {/* Schedules List */}
        {filteredSchedules.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {searchTerm ? 'No schedules found' : 'No schedules yet'}
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {searchTerm
                ? 'Try adjusting your search.'
                : 'Create your first schedule to automate report generation and distribution.'}
            </p>
            {!searchTerm && (
              <motion.button
                onClick={() => setShowCreateModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Schedule
              </motion.button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredSchedules.map((schedule, index) => (
              <motion.div
                key={schedule.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleRowClick(schedule)}
                className="p-6 hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Schedule Info */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Status Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      schedule.isActive
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                    }`}>
                      {togglingId === schedule.id || runningId === schedule.id ? (
                        <ArrowPathIcon className="w-6 h-6 text-gray-500 animate-spin" />
                      ) : schedule.isActive ? (
                        <PlayIcon className="w-6 h-6 text-green-600" />
                      ) : (
                        <PauseIcon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{schedule.name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          schedule.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {schedule.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mb-3">
                        {formatScheduleFrequency(schedule)}
                      </p>

                      {/* Meta Info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <DocumentTextIcon className="w-3.5 h-3.5" />
                          {schedule.properties?.length || 0} properties
                        </span>
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="w-3.5 h-3.5" />
                          {schedule.recipients?.length || 0} recipients
                        </span>
                        <span className="flex items-center gap-1">
                          <Cog6ToothIcon className="w-3.5 h-3.5" />
                          {FORMAT_LABELS[schedule.format]} &middot; {REPORT_MODE_LABELS[schedule.reportMode]}
                        </span>
                        {schedule.ccSelf && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            CC to self
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Next Run & Actions */}
                  <div className="flex items-start gap-4 flex-shrink-0">
                    {/* Next Run Info */}
                    <div className="text-right min-w-[120px]">
                      <div className="text-xs text-gray-500 mb-1">Next run</div>
                      <div className={`text-sm font-medium ${
                        schedule.isActive ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {schedule.isActive
                          ? formatNextRun(schedule.nextRunAt)
                          : 'Paused'}
                      </div>
                      {schedule.lastRunAt && (
                        <div className="text-xs text-gray-400 mt-1">
                          Last: {new Date(schedule.lastRunAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {deletingId === schedule.id ? (
                        <div className="w-8 h-8 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <TableActionsDropdown
                          actions={getScheduleActions(schedule)}
                          itemId={schedule.id}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Create/Edit Schedule Modal */}
      <CreateScheduleModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedSchedule(null)
        }}
        onSave={handleScheduleCreated}
        schedule={selectedSchedule}
      />

      {/* Schedule Runs Modal */}
      {selectedSchedule && (
        <ScheduleRunsModal
          isOpen={showRunsModal}
          onClose={() => {
            setShowRunsModal(false)
            setSelectedSchedule(null)
          }}
          schedule={selectedSchedule}
        />
      )}

      {/* Schedule Actions Modal */}
      {selectedSchedule && (
        <ScheduleActionsModal
          isOpen={showActionsModal}
          onClose={() => {
            setShowActionsModal(false)
            setSelectedSchedule(null)
          }}
          schedule={selectedSchedule}
          onEdit={() => {
            setShowActionsModal(false)
            setShowCreateModal(true)
          }}
          onViewAllRuns={() => {
            setShowActionsModal(false)
            setShowRunsModal(true)
          }}
          onScheduleUpdated={handleScheduleUpdatedFromModal}
        />
      )}
    </div>
  )
}
