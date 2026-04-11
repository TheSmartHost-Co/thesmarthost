'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getScheduleRuns, getRunDetails, formatRunDate, getRunStatusColor, getDeliveryStatusColor } from '@/services/scheduleService'
import type { Schedule, ScheduleRun, ScheduleDelivery } from '@/services/types/schedule'
import { RUN_STATUS_CONFIG, DELIVERY_STATUS_CONFIG } from '@/services/types/schedule'
import {
  XMarkIcon,
  ClockIcon,
  ChartBarIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'

interface ScheduleRunsModalProps {
  isOpen: boolean
  onClose: () => void
  schedule: Schedule
}

const ScheduleRunsModal: React.FC<ScheduleRunsModalProps> = ({
  isOpen,
  onClose,
  schedule
}) => {
  const { t } = useTranslation('reports')
  const { showNotification } = useNotificationStore()

  // State
  const [runs, setRuns] = useState<ScheduleRun[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [runDetails, setRunDetails] = useState<{ run: ScheduleRun; deliveries: ScheduleDelivery[] } | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Load runs when modal opens
  useEffect(() => {
    if (isOpen && schedule) {
      loadRuns()
    }
  }, [isOpen, schedule])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedRunId(null)
      setRunDetails(null)
    }
  }, [isOpen])

  const loadRuns = async () => {
    try {
      setLoading(true)
      const res = await getScheduleRuns(schedule.id, 20)
      if (res.status === 'success') {
        setRuns(res.data || [])
      } else {
        showNotification(res.message || 'Failed to load runs', 'error')
      }
    } catch (err) {
      console.error('Error loading runs:', err)
      showNotification('Failed to load runs', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadRunDetails = async (runId: string) => {
    try {
      setLoadingDetails(true)
      setSelectedRunId(runId)
      const res = await getRunDetails(runId)
      if (res.status === 'success' && res.data) {
        setRunDetails(res.data)
      } else {
        showNotification(res.message || 'Failed to load run details', 'error')
      }
    } catch (err) {
      console.error('Error loading run details:', err)
      showNotification('Failed to load run details', 'error')
    } finally {
      setLoadingDetails(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'partial_failure':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      case 'running':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getDeliveryIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'opened':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case 'bounced':
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-500" />
      case 'sent':
        return <EnvelopeIcon className="w-4 h-4 text-blue-500" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />
    }
  }

  // Calculate stats for a run
  const getRunStats = (run: ScheduleRun) => {
    const total = run.emailsSent + run.emailsFailed
    const successRate = total > 0 ? Math.round((run.emailsSent / total) * 100) : 0
    return { total, successRate }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-4xl mx-4">
      <div className="relative overflow-hidden bg-white rounded-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Run History</h2>
                <p className="text-sm text-gray-500">{schedule.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Runs List */}
          <div className={`${selectedRunId ? 'w-1/2 border-r border-gray-100' : 'w-full'} overflow-y-auto transition-all`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-6">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <ClockIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No runs yet</h3>
                <p className="text-gray-500 text-center text-sm">
                  This schedule hasn&apos;t been executed yet. It will run according to its configured timing.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {runs.map((run) => {
                  const stats = getRunStats(run)
                  const isSelected = selectedRunId === run.id

                  return (
                    <button
                      key={run.id}
                      onClick={() => loadRunDetails(run.id)}
                      className={`w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {getStatusIcon(run.status || 'pending')}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRunStatusColor(run.status || 'pending')}`}>
                                {RUN_STATUS_CONFIG[run.status as keyof typeof RUN_STATUS_CONFIG]?.label || run.status || 'Pending'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {run.triggerType === 'manual' ? 'Manual' : run.triggerType === 'test' ? 'Test' : 'Scheduled'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-900 font-medium">
                              {formatRunDate(run.startedAt)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {run.reportsGenerated} report{run.reportsGenerated !== 1 ? 's' : ''} &middot;{' '}
                              {run.emailsSent} sent &middot;{' '}
                              {run.emailsFailed > 0 && (
                                <span className="text-red-600">{run.emailsFailed} failed</span>
                              )}
                              {run.emailsFailed === 0 && stats.total > 0 && (
                                <span className="text-green-600">{stats.successRate}% success</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRightIcon className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                          isSelected ? 'rotate-90 text-blue-500' : ''
                        }`} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Run Details Panel */}
          <AnimatePresence>
            {selectedRunId && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '50%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex-shrink-0"
              >
                <div className="h-full overflow-y-auto">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center h-64">
                      <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                  ) : runDetails?.run ? (
                    <div className="p-6">
                      {/* Run Summary */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          {getStatusIcon(runDetails.run.status || 'pending')}
                          <h3 className="font-semibold text-gray-900">Run Details</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-gray-500 text-xs mb-1">Started</div>
                            <div className="font-medium text-gray-900">
                              {formatRunDate(runDetails.run.startedAt)}
                            </div>
                          </div>
                          {runDetails.run.completedAt && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-gray-500 text-xs mb-1">Completed</div>
                              <div className="font-medium text-gray-900">
                                {formatRunDate(runDetails.run.completedAt)}
                              </div>
                            </div>
                          )}
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-blue-600 text-xs mb-1">Reports</div>
                            <div className="font-bold text-blue-900 text-lg">
                              {runDetails.run.reportsGenerated}
                            </div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-green-600 text-xs mb-1">Emails Sent</div>
                            <div className="font-bold text-green-900 text-lg">
                              {runDetails.run.emailsSent}
                            </div>
                          </div>
                        </div>
                        {runDetails.run.errorMessage && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="text-red-800 text-sm font-medium mb-1">Error</div>
                            <div className="text-red-600 text-sm">{runDetails.run.errorMessage}</div>
                          </div>
                        )}
                      </div>

                      {/* Deliveries */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Deliveries ({runDetails.deliveries.length})
                        </h4>
                        {runDetails.deliveries.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            No deliveries for this run
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {runDetails.deliveries.map((delivery) => (
                              <div
                                key={delivery.id}
                                className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    {getDeliveryIcon(delivery.status || 'pending')}
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-gray-900 text-sm truncate">
                                        {delivery.recipientName || delivery.recipientEmail}
                                      </div>
                                      {delivery.recipientName && (
                                        <div className="text-xs text-gray-500 truncate">
                                          {delivery.recipientEmail}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDeliveryStatusColor(delivery.status || 'pending')}`}>
                                    {DELIVERY_STATUS_CONFIG[delivery.status as keyof typeof DELIVERY_STATUS_CONFIG]?.label || delivery.status || 'Pending'}
                                  </span>
                                </div>

                                {/* Delivery Timeline */}
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                  {delivery.sentAt && (
                                    <span>Sent: {new Date(delivery.sentAt).toLocaleTimeString()}</span>
                                  )}
                                  {delivery.deliveredAt && (
                                    <span className="text-green-600">
                                      Delivered: {new Date(delivery.deliveredAt).toLocaleTimeString()}
                                    </span>
                                  )}
                                  {delivery.openedAt && (
                                    <span className="text-blue-600">
                                      Opened: {new Date(delivery.openedAt).toLocaleTimeString()}
                                    </span>
                                  )}
                                  {delivery.downloadedAt && (
                                    <span className="text-purple-600">
                                      Downloaded: {new Date(delivery.downloadedAt).toLocaleTimeString()}
                                    </span>
                                  )}
                                </div>

                                {delivery.errorMessage && (
                                  <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                    {delivery.errorMessage}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      Select a run to view details
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {runs.length} run{runs.length !== 1 ? 's' : ''} in history
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ScheduleRunsModal
