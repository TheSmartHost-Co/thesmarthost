'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  WrenchScrewdriverIcon,
  HomeModernIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserCircleIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  XCircleIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import SearchableSelect from '@/components/shared/SearchableSelect'
import PriceNegotiationPanel from './PriceNegotiationPanel'
import EditTaskModal from './EditTaskModal'
import CancelTaskModal from './CancelTaskModal'
import { ISSUE_TYPE_ICONS, ISSUE_TYPE_COLORS } from '@/components/turnover/issues/issueTypeUi'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import { assignContractorToTask, startTask, completeTask } from '@/services/maintenanceTaskService'
import { getContractors } from '@/services/contractorService'
import { parseLocalDate } from '@/utils/dateUtils'
import type {
  MaintenanceTask,
  MaintenanceTaskStatus,
  AssignContractorPayload,
  PricingType,
} from '@/services/types/maintenanceTask'
import type { IssueType } from '@/services/types/projectIssue'
import type { Contractor } from '@/services/types/contractor'

export interface TaskDetailModalProps {
  isOpen: boolean
  onClose: () => void
  task: MaintenanceTask
  onTaskUpdated: (task: MaintenanceTask) => void
  onTaskDeleted?: (taskId: string) => void
}

const STATUS_BADGE: Record<MaintenanceTaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
  assigned: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

function formatDisplayDate(dateStr: string): string {
  const datePart = dateStr.split('T')[0]
  const parsed = parseLocalDate(datePart)
  if (isNaN(parsed.getTime())) return datePart
  return parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return time
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onTaskUpdated,
  onTaskDeleted, // eslint-disable-line @typescript-eslint/no-unused-vars
}: TaskDetailModalProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)
  const { effectiveUserId } = usePermissions()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Assign-contractor state (status === 'pending')
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loadingContractors, setLoadingContractors] = useState(false)
  const [assignContractorId, setAssignContractorId] = useState<string | null>(null)
  const [assignPricingType, setAssignPricingType] = useState<PricingType>('flat')
  const [assignAmount, setAssignAmount] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Start/Complete state
  const [statusActionLoading, setStatusActionLoading] = useState(false)

  const isTerminal = task.status === 'completed' || task.status === 'cancelled'

  const STATUS_LABELS: Record<MaintenanceTaskStatus, string> = {
    pending: t('taskStatusPending'),
    assigned: t('taskStatusAssigned'),
    confirmed: t('taskStatusConfirmed'),
    in_progress: t('taskStatusInProgress'),
    completed: t('taskStatusCompleted'),
    cancelled: t('taskStatusCancelled'),
  }

  const contractorOptions = useMemo(
    () =>
      contractors.map((contractor) => ({
        value: contractor.id,
        label: contractor.name,
        secondaryLabel: contractor.trade || contractor.email || contractor.phone || undefined,
      })),
    [contractors]
  )

  // Reset assign form when modal opens or task changes
  useEffect(() => {
    if (isOpen) {
      setAssignContractorId(null)
      setAssignPricingType('flat')
      setAssignAmount('')
      setShowEditModal(false)
      setShowCancelModal(false)
    }
  }, [isOpen, task.id])

  // Fetch contractors when the assign section is relevant
  useEffect(() => {
    const fetchContractors = async () => {
      if (!isOpen || task.status !== 'pending' || !effectiveUserId) return
      setLoadingContractors(true)
      try {
        const res = await getContractors(effectiveUserId)
        if (res.status === 'success') {
          setContractors(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch contractors:', err)
      } finally {
        setLoadingContractors(false)
      }
    }

    fetchContractors()
  }, [isOpen, task.status, effectiveUserId])

  const handleAssign = async () => {
    if (!assignContractorId || assigning) return
    setAssigning(true)
    try {
      const payload: AssignContractorPayload = { contractorId: assignContractorId }
      if (assignAmount && parseFloat(assignAmount) > 0) {
        payload.pricingType = assignPricingType
        payload.offeredAmount = parseFloat(assignAmount)
      }
      const res = await assignContractorToTask(task.id, payload)
      if (res.status === 'success') {
        showNotification(t('contractorAssigned'), 'success')
        setAssignContractorId(null)
        setAssignAmount('')
        onTaskUpdated({ ...task, ...res.data })
      } else {
        showNotification(res.message || t('failedToAssignContractor'), 'error')
      }
    } catch (err) {
      console.error('Error assigning contractor:', err)
      showNotification(err instanceof Error ? err.message : t('failedToAssignContractor'), 'error')
    } finally {
      setAssigning(false)
    }
  }

  const handleStart = async () => {
    if (statusActionLoading) return
    setStatusActionLoading(true)
    try {
      const res = await startTask(task.id)
      if (res.status === 'success') {
        showNotification(t('taskStarted'), 'success')
        onTaskUpdated({ ...task, ...res.data })
      } else {
        showNotification(res.message || t('failedToStartTask'), 'error')
      }
    } catch (err) {
      console.error('Error starting task:', err)
      showNotification(err instanceof Error ? err.message : t('failedToStartTask'), 'error')
    } finally {
      setStatusActionLoading(false)
    }
  }

  const handleComplete = async () => {
    if (statusActionLoading) return
    setStatusActionLoading(true)
    try {
      const res = await completeTask(task.id)
      if (res.status === 'success') {
        showNotification(t('taskCompleted'), 'success')
        onTaskUpdated({ ...task, ...res.data })
      } else {
        showNotification(res.message || t('failedToCompleteTask'), 'error')
      }
    } catch (err) {
      console.error('Error completing task:', err)
      showNotification(err instanceof Error ? err.message : t('failedToCompleteTask'), 'error')
    } finally {
      setStatusActionLoading(false)
    }
  }

  const issueType = (task.issueType || 'other') as IssueType
  const IssueIcon = ISSUE_TYPE_ICONS[issueType] || ISSUE_TYPE_ICONS.other
  const issueColors = ISSUE_TYPE_COLORS[issueType] || ISSUE_TYPE_COLORS.other

  const hasSchedule =
    task.scheduledDate || task.scheduledStartTime || task.scheduledEndTime || task.estimatedDurationMinutes

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-3xl w-11/12 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50 pr-14">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <WrenchScrewdriverIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{task.title}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[task.status]}`}>
                  {STATUS_LABELS[task.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500">{t('maintenanceTaskSubtitle')}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* During-booking warning */}
          {task.duringBooking && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800">
                  {task.duringBooking.guestName || t('taskGuest')}
                  {task.duringBooking.checkInDate && task.duringBooking.checkOutDate && (
                    <span className="font-normal text-amber-700">
                      {' '}· {formatDisplayDate(task.duringBooking.checkInDate)} → {formatDisplayDate(task.duringBooking.checkOutDate)}
                    </span>
                  )}
                </p>
                <p className="text-sm text-amber-700 mt-0.5">{t('duringReservationWarning')}</p>
              </div>
            </div>
          )}

          {/* Property & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <HomeModernIcon className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-700">{t('property')}</h4>
              </div>
              <p className="text-sm text-gray-900 font-medium">{task.propertyName || t('notSet')}</p>
              {task.propertyAddress && (
                <p className="text-xs text-gray-500 mt-0.5">{task.propertyAddress}</p>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-700">{t('taskScheduleLabel')}</h4>
              </div>
              {hasSchedule ? (
                <div className="space-y-0.5">
                  {task.scheduledDate && (
                    <p className="text-sm text-gray-900 font-medium">{formatDisplayDate(task.scheduledDate)}</p>
                  )}
                  {(task.scheduledStartTime || task.scheduledEndTime) && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {task.scheduledStartTime ? formatTime(task.scheduledStartTime) : '—'}
                      {' → '}
                      {task.scheduledEndTime ? formatTime(task.scheduledEndTime) : '—'}
                    </p>
                  )}
                  {task.estimatedDurationMinutes ? (
                    <p className="text-xs text-gray-500">
                      {t('estimatedDurationLabel')}: {formatDuration(task.estimatedDurationMinutes)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-gray-400">{t('notSet')}</p>
              )}
            </div>
          </div>

          {/* Linked issue summary */}
          {(task.issueDescription || task.issueType) && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${issueColors}`}>
              <IssueIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{t('linkedIssue')}</p>
                <p className="text-sm mt-0.5 break-words">{task.issueDescription || '—'}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-700">{t('description')}</h4>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{task.description}</p>
            </div>
          )}

          {/* Contractor */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserCircleIcon className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-medium text-gray-700">{t('contractorLabel')}</h4>
            </div>
            {task.contractorId ? (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-sm text-gray-900 font-medium">{task.contractorName || '—'}</p>
                {task.contractorTrade && <p className="text-xs text-gray-500 mt-0.5">{task.contractorTrade}</p>}
                {(task.contractorEmail || task.contractorPhone) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[task.contractorEmail, task.contractorPhone].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            ) : task.status === 'pending' && !isTerminal ? (
              /* Assign contractor (pending only) */
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <SearchableSelect
                  options={contractorOptions}
                  value={assignContractorId}
                  onChange={setAssignContractorId}
                  placeholder={t('unassigned')}
                  loading={loadingContractors}
                  emptyText={t('noContractorsFound')}
                  clearable
                />
                {assignContractorId && (
                  <div className="flex items-center gap-3">
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setAssignPricingType('flat')}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          assignPricingType === 'flat' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {t('pricingFlat')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignPricingType('hourly')}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          assignPricingType === 'hourly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {t('pricingHourly')}
                      </button>
                    </div>
                    <div className="relative flex-1">
                      <CurrencyDollarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={assignAmount}
                        onChange={(e) => setAssignAmount(e.target.value)}
                        placeholder={t('openingOfferPlaceholder')}
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={!assignContractorId || assigning}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {assigning ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <UserPlusIcon className="w-4 h-4" />
                  )}
                  {t('assignContractor')}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('unassigned')}</p>
            )}
          </div>

          {/* Price negotiation */}
          <div className="border-t border-gray-100 pt-5">
            <PriceNegotiationPanel task={task} onTaskUpdated={onTaskUpdated} />
          </div>

          {/* Notes */}
          {(task.pmNotes || task.contractorNotes) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {task.pmNotes && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">{t('pmNotesLabel')}</h4>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{task.pmNotes}</p>
                </div>
              )}
              {task.contractorNotes && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">{t('contractorNotesLabel')}</h4>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{task.contractorNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* PM actions */}
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              disabled={isTerminal}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <PencilSquareIcon className="w-4 h-4" />
              {t('editTaskButton')}
            </button>

            {task.status === 'confirmed' && (
              <button
                type="button"
                onClick={handleStart}
                disabled={statusActionLoading}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {statusActionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <PlayIcon className="w-4 h-4" />
                )}
                {t('startTaskButton')}
              </button>
            )}

            {task.status === 'in_progress' && (
              <button
                type="button"
                onClick={handleComplete}
                disabled={statusActionLoading}
                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {statusActionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )}
                {t('completeTaskButton')}
              </button>
            )}

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={isTerminal}
              className="px-4 py-2 bg-white border border-red-300 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <XCircleIcon className="w-4 h-4" />
              {t('cancelTaskButton')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        task={task}
        onUpdated={onTaskUpdated}
      />

      {/* Cancel Task Modal */}
      <CancelTaskModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        task={task}
        onCancelled={onTaskUpdated}
      />
    </>
  )
}
