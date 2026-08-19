'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  HomeModernIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  acceptTaskOffer,
  declineTask,
  startTask,
  completeTask,
} from '@/services/maintenanceTaskService'
import { TASK_STATUS_BADGE, TASK_STATUS_ACCENT_BORDER, isWaitingOnManager } from '@/constants/maintenanceTaskUi'
import type { MaintenanceTask, MaintenanceTaskStatus, TaskChecklistProgress } from '@/services/types/maintenanceTask'
import ModifyTaskPriceModal from './ModifyTaskPriceModal'
import TaskChecklist from './TaskChecklist'

export interface MaintenanceTaskCardProps {
  task: MaintenanceTask
  onTaskUpdated: (task: MaintenanceTask) => void
}

// Format a time string (HH:mm[:ss]) as 12-hour clock
function formatTime(time: string | null | undefined): string | null {
  if (!time) return null
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  if (isNaN(h)) return null
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

// Format a date string (ISO timestamp or YYYY-MM-DD) for display
function formatDate(dateStr: string): string {
  const justDate = dateStr.split('T')[0]
  const date = new Date(justDate + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// Short date (for the reservation strip)
function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const justDate = dateStr.split('T')[0]
  const date = new Date(justDate + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Status visual config — contractor perspective
function getStatusConfig(status: MaintenanceTaskStatus): {
  labelKey: string
  border: string
  badge: string
  icon: React.ReactNode
} {
  const configs: Record<MaintenanceTaskStatus, ReturnType<typeof getStatusConfig>> = {
    pending: {
      labelKey: 'statusPending',
      border: TASK_STATUS_ACCENT_BORDER.pending,
      badge: TASK_STATUS_BADGE.pending,
      icon: <div className="w-2 h-2 rounded-full bg-gray-400" />,
    },
    assigned: {
      labelKey: 'statusAssigned',
      border: TASK_STATUS_ACCENT_BORDER.assigned,
      badge: TASK_STATUS_BADGE.assigned,
      icon: <ClockIcon className="w-3.5 h-3.5" />,
    },
    confirmed: {
      labelKey: 'statusConfirmed',
      border: TASK_STATUS_ACCENT_BORDER.confirmed,
      badge: TASK_STATUS_BADGE.confirmed,
      icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
    },
    in_progress: {
      labelKey: 'statusInProgress',
      border: TASK_STATUS_ACCENT_BORDER.in_progress,
      badge: TASK_STATUS_BADGE.in_progress,
      icon: <PlayCircleIcon className="w-3.5 h-3.5" />,
    },
    completed: {
      labelKey: 'statusCompleted',
      border: TASK_STATUS_ACCENT_BORDER.completed,
      badge: TASK_STATUS_BADGE.completed,
      icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
    },
    cancelled: {
      labelKey: 'statusCancelled',
      border: TASK_STATUS_ACCENT_BORDER.cancelled,
      badge: TASK_STATUS_BADGE.cancelled,
      icon: <XMarkIcon className="w-3.5 h-3.5" />,
    },
  }
  return configs[status] || configs.pending
}

/**
 * Contractor-side maintenance task card with price-negotiation actions.
 * The card owns its modal state and API calls; the parent merges the
 * updated task via onTaskUpdated.
 */
export default function MaintenanceTaskCard({ task, onTaskUpdated }: MaintenanceTaskCardProps) {
  const { t } = useTranslation('contractorPortal')
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [priceModalMode, setPriceModalMode] = useState<'propose' | 'counter'>('propose')
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showCompleteNotes, setShowCompleteNotes] = useState(false)
  const [completeNotes, setCompleteNotes] = useState('')
  const [checklistProgress, setChecklistProgress] = useState<TaskChecklistProgress | null>(null)
  const [checklistExpanded, setChecklistExpanded] = useState(task.status === 'in_progress')

  const statusConfig = getStatusConfig(task.status)

  // Negotiation state (contractor perspective)
  const isAssigned = task.status === 'assigned'
  const pmOfferPending = isAssigned && task.priceStatus === 'offered' && task.pricingLastActor === 'pm'
  const needsProposal = isAssigned && task.priceStatus === 'awaiting_proposal'
  const waitingOnManager = isWaitingOnManager(task)
  const canStart = task.status === 'confirmed'
  const canComplete = task.status === 'in_progress'

  // Checklist visibility + completion gating. Completion is blocked while
  // required items or required photos are unmet (only once progress is known
  // and the task actually has checklist items) — mirrors the backend's 400.
  const showChecklistSection =
    task.status === 'confirmed' || task.status === 'in_progress' || task.status === 'completed'
  const hasChecklist = checklistProgress !== null && checklistProgress.totalItems > 0
  const checklistBlocking =
    checklistProgress !== null &&
    checklistProgress.totalItems > 0 &&
    (checklistProgress.requiredCompleted < checklistProgress.requiredItems ||
      checklistProgress.photosUploaded < checklistProgress.photosRequired)

  const priceSuffix = task.pricingType === 'hourly' ? t('hourlySuffix') : ` ${t('flatSuffix')}`

  const runAction = async (action: string, fn: () => Promise<{ status: 'success' | 'failed'; data: MaintenanceTask; message?: string }>, successMsg: string) => {
    if (isLoading) return
    setIsLoading(action)
    try {
      const res = await fn()
      if (res.status === 'success') {
        showNotification(successMsg, 'success')
        onTaskUpdated(res.data)
      } else {
        showNotification(res.message || t('actionFailed'), 'error')
      }
    } catch (err) {
      console.error(`Error on task ${action}:`, err)
      showNotification(err instanceof Error ? err.message : t('actionFailed'), 'error')
    } finally {
      setIsLoading(null)
    }
  }

  const handleAccept = () => runAction('accept', () => acceptTaskOffer(task.id), t('offerAccepted'))
  const handleStart = () => runAction('start', () => startTask(task.id), t('taskStarted'))

  const handleConfirmDecline = () =>
    runAction('decline', () => declineTask(task.id, declineReason.trim() || undefined), t('taskDeclined')).then(() => {
      setShowDeclineConfirm(false)
      setDeclineReason('')
    })

  const handleConfirmComplete = () =>
    runAction('complete', () => completeTask(task.id, completeNotes.trim() || undefined), t('taskCompleted')).then(() => {
      setShowCompleteNotes(false)
      setCompleteNotes('')
    })

  const openPriceModal = (mode: 'propose' | 'counter') => {
    setPriceModalMode(mode)
    setShowPriceModal(true)
  }

  const hasActions = pmOfferPending || needsProposal || waitingOnManager || canStart || canComplete

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border-l-4 shadow-sm ${statusConfig.border}`}
    >
      <div className="p-4">
        {/* Header: title + status badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <WrenchScrewdriverIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 line-clamp-2">{task.title}</h3>
            </div>
            {/* Property */}
            <div className="flex items-center gap-1.5 mt-1 ml-7 text-sm text-gray-500">
              <HomeModernIcon className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">
                {task.propertyName || t('unknownProperty')}
                {task.propertyAddress ? ` · ${task.propertyAddress}` : ''}
              </span>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg flex-shrink-0 ${statusConfig.badge}`}>
            {statusConfig.icon}
            {t(statusConfig.labelKey)}
          </span>
        </div>

        {/* Date & Time */}
        {(task.scheduledDate || task.scheduledStartTime) && (
          <div className="mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>
                {task.scheduledDate ? formatDate(task.scheduledDate) : t('noDateSet')}
                {task.scheduledStartTime && (
                  <>
                    {' · '}
                    {formatTime(task.scheduledStartTime)}
                    {task.scheduledEndTime && ` – ${formatTime(task.scheduledEndTime)}`}
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Reservation warning strip */}
        {task.duringBooking && (
          <div className="mt-2.5 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              {t('duringBookingWarning', {
                name: task.duringBooking.guestName || t('guest'),
                checkIn: formatShortDate(task.duringBooking.checkInDate),
                checkOut: formatShortDate(task.duringBooking.checkOutDate),
              })}
            </p>
          </div>
        )}

        {/* Linked issue */}
        {(task.issueType || task.issueDescription) && (
          <div className="mt-2.5 p-2.5 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 line-clamp-2">
              <span className="font-medium">{t('issueLabel')}:</span>{' '}
              {task.issueType && <span className="capitalize">{task.issueType.replace(/_/g, ' ')}</span>}
              {task.issueType && task.issueDescription && ' — '}
              {task.issueDescription}
            </p>
          </div>
        )}

        {/* Price line */}
        <div className="mt-2.5 flex items-center gap-1.5 text-sm">
          <CurrencyDollarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {task.priceStatus === 'agreed' && task.agreedAmount != null ? (
            <span className="font-semibold text-green-700">
              {t('agreedPrice')}: ${Number(task.agreedAmount).toFixed(2)}{priceSuffix}
            </span>
          ) : task.priceStatus === 'offered' && task.offeredAmount != null ? (
            <span className={`font-semibold ${task.pricingLastActor === 'contractor' ? 'text-blue-700' : 'text-amber-700'}`}>
              {task.pricingLastActor === 'contractor' ? t('yourOffer') : t('offeredPrice')}: ${Number(task.offeredAmount).toFixed(2)}{priceSuffix}
            </span>
          ) : (
            <span className="text-gray-500">{t('noPriceYet')}</span>
          )}
        </div>

        {/* Waiting-on-manager hint */}
        {waitingOnManager && (
          <div className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
            <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700 font-medium">{t('waitingForManagerResponse')}</p>
          </div>
        )}

        {/* PM notes */}
        {task.pmNotes && (
          <div className="mt-2.5 p-2.5 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <span className="font-medium">{t('noteLabel')}:</span> {task.pmNotes}
            </p>
          </div>
        )}

        {/* Checklist — always mounted (so it fetches + reports progress for
            gating), collapsed behind a compact expander */}
        {showChecklistSection && (
          <div className="mt-2.5">
            {hasChecklist && (
              <button
                type="button"
                onClick={() => setChecklistExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
              >
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 transition-transform ${checklistExpanded ? 'rotate-180' : ''}`}
                />
                {t('checklistExpander', {
                  completed: checklistProgress!.completedItems,
                  total: checklistProgress!.totalItems,
                })}
              </button>
            )}
            <div className={hasChecklist && checklistExpanded ? 'mt-2' : 'hidden'}>
              <TaskChecklist
                task={task}
                readOnly={task.status !== 'in_progress'}
                onProgressChange={setChecklistProgress}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {hasActions && !waitingOnManager && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-gray-100">
          {/* Decline confirmation (inline) */}
          {showDeclineConfirm ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800">{t('declineConfirmTitle')}</p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder={t('declineReasonPlaceholder')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmDecline}
                  disabled={isLoading !== null}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading === 'decline' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <XMarkIcon className="w-5 h-5" />
                  )}
                  {t('confirmDecline')}
                </button>
                <button
                  onClick={() => { setShowDeclineConfirm(false); setDeclineReason('') }}
                  disabled={isLoading !== null}
                  className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : showCompleteNotes ? (
            /* Complete-with-notes (inline) */
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800">{t('completeConfirmTitle')}</p>
              <textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder={t('completeNotesPlaceholder')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmComplete}
                  disabled={isLoading !== null || checklistBlocking}
                  title={checklistBlocking ? t('completeBlockedByChecklist') : undefined}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading === 'complete' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5" />
                  )}
                  {t('confirmComplete')}
                </button>
                <button
                  onClick={() => { setShowCompleteNotes(false); setCompleteNotes('') }}
                  disabled={isLoading !== null}
                  className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              {/* PM offer pending: Accept / Modify / Decline */}
              {pmOfferPending && (
                <>
                  <button
                    onClick={handleAccept}
                    disabled={isLoading !== null}
                    className="flex-1 min-w-[100px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading === 'accept' ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircleIcon className="w-5 h-5" />
                    )}
                    {t('accept')}
                  </button>
                  <button
                    onClick={() => openPriceModal('counter')}
                    disabled={isLoading !== null}
                    className="flex-1 min-w-[100px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                    {t('modify')}
                  </button>
                  <button
                    onClick={() => setShowDeclineConfirm(true)}
                    disabled={isLoading !== null}
                    className="flex-1 min-w-[100px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <XMarkIcon className="w-5 h-5" />
                    {t('decline')}
                  </button>
                </>
              )}

              {/* Awaiting proposal: Propose Price / Decline */}
              {needsProposal && (
                <>
                  <button
                    onClick={() => openPriceModal('propose')}
                    disabled={isLoading !== null}
                    className="flex-1 min-w-[120px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <CurrencyDollarIcon className="w-5 h-5" />
                    {t('proposePrice')}
                  </button>
                  <button
                    onClick={() => setShowDeclineConfirm(true)}
                    disabled={isLoading !== null}
                    className="flex-1 min-w-[100px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <XMarkIcon className="w-5 h-5" />
                    {t('decline')}
                  </button>
                </>
              )}

              {/* Confirmed: Start */}
              {canStart && (
                <button
                  onClick={handleStart}
                  disabled={isLoading !== null}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading === 'start' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <PlayCircleIcon className="w-5 h-5" />
                  )}
                  {t('startWork')}
                </button>
              )}

              {/* In progress: Complete (gated on checklist requirements) */}
              {canComplete && (
                <div className="flex-1 flex flex-col gap-1.5">
                  <button
                    onClick={() => setShowCompleteNotes(true)}
                    disabled={isLoading !== null || checklistBlocking}
                    title={checklistBlocking ? t('completeBlockedByChecklist') : undefined}
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    {t('markComplete')}
                  </button>
                  {checklistBlocking && (
                    <p className="text-xs text-amber-700 text-center">{t('completeBlockedByChecklist')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Price modal */}
      <ModifyTaskPriceModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        task={task}
        mode={priceModalMode}
        onSubmitted={onTaskUpdated}
      />
    </motion.div>
  )
}
