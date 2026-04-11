'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  toggleSchedule,
  runScheduleNow,
  deleteSchedule,
  getScheduleRuns,
  formatScheduleFrequency,
  formatNextRun,
  formatRunDate,
  getRunStatusColor,
} from '@/services/scheduleService'
import type { Schedule, ScheduleRun } from '@/services/types/schedule'
import { FORMAT_LABELS, REPORT_MODE_LABELS, RUN_STATUS_CONFIG } from '@/services/types/schedule'
import {
  PlayIcon,
  PauseIcon,
  BoltIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'

interface ScheduleActionsModalProps {
  isOpen: boolean
  onClose: () => void
  schedule: Schedule
  onEdit: () => void
  onViewAllRuns: () => void
  onScheduleUpdated: () => Promise<void>
}

// Reusable loading spinner component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }
  return <ArrowPathIcon className={`${sizeClasses[size]} animate-spin ${className}`} />
}

const ScheduleActionsModal: React.FC<ScheduleActionsModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onEdit,
  onViewAllRuns,
  onScheduleUpdated,
}) => {
  const { t } = useTranslation('reports')
  const { showNotification } = useNotificationStore()

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)

  // Loading states
  const [toggling, setToggling] = useState(false)
  const [running, setRunning] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Recent runs
  const [recentRuns, setRecentRuns] = useState<ScheduleRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load recent runs - memoized to use in dependency array
  const loadRecentRuns = useCallback(async () => {
    if (!schedule?.id) return

    try {
      setLoadingRuns(true)
      const res = await getScheduleRuns(schedule.id, 5)
      if (isMountedRef.current && res.status === 'success') {
        setRecentRuns(res.data || [])
      }
    } catch (err) {
      console.error('Error loading recent runs:', err)
    } finally {
      if (isMountedRef.current) {
        setLoadingRuns(false)
      }
    }
  }, [schedule?.id])

  // Load recent runs when modal opens
  useEffect(() => {
    if (isOpen && schedule?.id) {
      loadRecentRuns()
    }
  }, [isOpen, schedule?.id, loadRecentRuns])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false)
      setRecentRuns([])
    }
  }, [isOpen])

  const handleToggle = async () => {
    if (!schedule?.id) return

    try {
      setToggling(true)
      const res = await toggleSchedule(schedule.id)

      if (!isMountedRef.current) return

      if (res.status === 'success') {
        showNotification(
          schedule.isActive ? 'Schedule paused' : 'Schedule activated',
          'success'
        )
        await onScheduleUpdated()
        if (isMountedRef.current) {
          onClose()
        }
      } else {
        showNotification(res.message || 'Failed to toggle schedule', 'error')
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error('Error toggling schedule:', err)
      showNotification('Failed to toggle schedule', 'error')
    } finally {
      if (isMountedRef.current) {
        setToggling(false)
      }
    }
  }

  const handleRunNow = async () => {
    if (!schedule?.id) return

    try {
      setRunning(true)
      const res = await runScheduleNow(schedule.id)

      if (!isMountedRef.current) return

      if (res.status === 'success') {
        showNotification('Schedule execution started', 'success')
        await onScheduleUpdated()
        if (isMountedRef.current) {
          await loadRecentRuns() // Refresh runs list
        }
      } else {
        showNotification(res.message || 'Failed to run schedule', 'error')
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error('Error running schedule:', err)
      showNotification('Failed to run schedule', 'error')
    } finally {
      if (isMountedRef.current) {
        setRunning(false)
      }
    }
  }

  const handleDelete = async () => {
    if (!schedule?.id) return

    try {
      setDeleting(true)
      const res = await deleteSchedule(schedule.id)

      if (!isMountedRef.current) return

      if (res.status === 'success') {
        showNotification('Schedule deleted', 'success')
        await onScheduleUpdated()
        if (isMountedRef.current) {
          onClose()
        }
      } else {
        showNotification(res.message || 'Failed to delete schedule', 'error')
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error('Error deleting schedule:', err)
      showNotification('Failed to delete schedule', 'error')
    } finally {
      if (isMountedRef.current) {
        setDeleting(false)
        setShowDeleteConfirm(false)
      }
    }
  }

  // Don't call onClose() when transitioning to another modal
  // The parent handles closing this modal and opening the next one
  // Calling onClose() first would clear selectedSchedule and cause jank
  const handleEdit = () => {
    onEdit()
  }

  const handleViewAllRuns = () => {
    onViewAllRuns()
  }

  const getRunStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-500" />
      case 'partial_failure':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
      case 'running':
        return <LoadingSpinner size="sm" className="text-blue-500" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />
    }
  }

  // Format last run date consistently using a helper
  const formatLastRunDate = (dateString: string | null): string => {
    if (!dateString) return 'Never'
    return formatRunDate(dateString)
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-2xl w-11/12">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
              schedule.isActive
                ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/25'
                : 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-lg shadow-gray-500/25'
            }`}>
              {schedule.isActive ? (
                <PlayIcon className="w-7 h-7 text-white" />
              ) : (
                <PauseIcon className="w-7 h-7 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-gray-900 truncate">{schedule.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  schedule.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    schedule.isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`}></span>
                  {schedule.isActive ? 'Active' : 'Paused'}
                </span>
                <span className="text-sm text-gray-500">
                  {formatScheduleFrequency(schedule)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-6 border-b border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">Properties</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {schedule.properties?.length || 0}
              </div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <EnvelopeIcon className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-600 font-medium">Recipients</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {(schedule.recipients?.length || 0) + (schedule.ccSelf ? 1 : 0)}
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600 font-medium">Next Run</span>
              </div>
              <div className="text-sm font-semibold text-green-900 truncate">
                {schedule.isActive ? formatNextRun(schedule.nextRunAt) : 'Paused'}
              </div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-600 font-medium">Last Run</span>
              </div>
              <div className="text-sm font-semibold text-amber-900 truncate">
                {formatLastRunDate(schedule.lastRunAt)}
              </div>
            </div>
          </div>

          {/* Format & Mode Info */}
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Cog6ToothIcon className="w-4 h-4" />
              {FORMAT_LABELS[schedule.format]} &middot; {REPORT_MODE_LABELS[schedule.reportMode]}
            </span>
            {schedule.ccSelf && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <CheckCircleIcon className="w-4 h-4" />
                CC to self
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Quick Actions
          </h3>
          <div className="flex gap-3">
            <button
              onClick={handleRunNow}
              disabled={running || toggling}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {running ? (
                <LoadingSpinner />
              ) : (
                <BoltIcon className="w-5 h-5" />
              )}
              {running ? 'Running...' : 'Run Now'}
            </button>
            <button
              onClick={handleToggle}
              disabled={toggling || running}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                schedule.isActive
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {toggling ? (
                <LoadingSpinner />
              ) : schedule.isActive ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5" />
              )}
              {toggling ? 'Updating...' : schedule.isActive ? 'Pause Schedule' : 'Activate Schedule'}
            </button>
          </div>
        </div>

        {/* Recent Runs */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Recent Runs
            </h3>
            {recentRuns.length > 0 && (
              <button
                onClick={handleViewAllRuns}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All Runs
              </button>
            )}
          </div>

          {loadingRuns ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" className="text-gray-400" />
            </div>
          ) : recentRuns.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <ChartBarIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No runs yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Click &quot;Run Now&quot; to execute this schedule
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    {getRunStatusIcon(run.status)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatRunDate(run.startedAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {run.triggerType === 'manual' ? 'Manual' : run.triggerType === 'test' ? 'Test' : 'Scheduled'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {run.reportsGenerated} report{run.reportsGenerated !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs">
                        {run.emailsFailed > 0 ? (
                          <span className="text-red-600">{run.emailsFailed} failed</span>
                        ) : run.emailsSent > 0 ? (
                          <span className="text-green-600">{run.emailsSent} sent</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRunStatusColor(run.status || 'pending')}`}>
                      {RUN_STATUS_CONFIG[run.status as keyof typeof RUN_STATUS_CONFIG]?.label || run.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 flex items-center justify-between gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors font-medium"
            >
              <TrashIcon className="w-4 h-4 inline-block mr-1.5" />
              Delete
            </button>
            <button
              onClick={handleEdit}
              className="px-4 py-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <PencilSquareIcon className="w-4 h-4 inline-block mr-1.5" />
              Edit Schedule
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        style="p-6 max-w-md w-11/12"
        zIndex={70}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationCircleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Schedule?</h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete &quot;{schedule.name}&quot;? This action cannot be undone.
            All run history will be permanently removed.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="w-4 h-4" />
                  Delete Schedule
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default ScheduleActionsModal
