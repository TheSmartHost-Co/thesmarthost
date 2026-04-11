'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  HomeModernIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  XMarkIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  ArrowPathIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import type { CleaningProject, CleaningProjectStatus } from '@/services/types/cleaningProject'
import { formatTime, isProjectOverdue, getOverdueMinutes, formatOverdueDuration, getStartBlockReason } from '@/services/cleaningProjectService'

interface ProjectCardProps {
  project: CleaningProject
  isImplicit?: boolean
  onAccept?: (projectId: string) => Promise<void>
  onDecline?: (projectId: string) => Promise<void>
  onStart?: (projectId: string) => Promise<void>
  onComplete?: (projectId: string) => Promise<void>
  onUnbegin?: (projectId: string) => Promise<void>
  onViewChecklist?: (project: CleaningProject) => void
  onViewIssues?: (project: CleaningProject) => void
  onRequestTimeChange?: (project: CleaningProject) => void
  onViewPendingTimeChange?: (project: CleaningProject) => void
  openIssueCount?: number
  pendingSupplyListCount?: number
  hasPendingTimeChange?: boolean
}

export default function ProjectCard({
  project,
  isImplicit = false,
  onAccept,
  onDecline,
  onStart,
  onComplete,
  onUnbegin,
  onViewChecklist,
  onViewIssues,
  onRequestTimeChange,
  onViewPendingTimeChange,
  openIssueCount = 0,
  pendingSupplyListCount = 0,
  hasPendingTimeChange = false,
}: ProjectCardProps) {
  const { t } = useTranslation('cleanerPortal')
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const baseStatusConfig = getStatusConfig(project.status)
  const overdue = isProjectOverdue(project)
  const overdueMinutes = getOverdueMinutes(project)
  const overdueLabel = overdue && overdueMinutes !== null ? formatOverdueDuration(overdueMinutes) : null

  const statusConfig = overdue
    ? {
        ...baseStatusConfig,
        labelKey: 'overdueStatus',
        border: 'border-red-500',
        badge: 'bg-red-100 text-red-700',
        icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" />,
      }
    : baseStatusConfig

  // Format date for display
  const formatDate = (dateStr: string) => {
    // Handle both ISO timestamp (2026-02-01T05:00:00.000Z) and date string (2026-02-01) formats
    const justDate = dateStr.split('T')[0]
    const date = new Date(justDate + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // Handle action with loading state
  const handleAction = async (e: React.MouseEvent, action: string, handler?: (id: string) => Promise<void>) => {
    e.stopPropagation()
    if (!handler || isLoading) return
    setIsLoading(action)
    try {
      await handler(project.id)
    } finally {
      setIsLoading(null)
    }
  }

  // Date-gated start check
  const startBlockReason = getStartBlockReason(project)

  // Determine which buttons to show based on status
  const showAcceptDecline = !isImplicit && project.status === 'assigned'
  const showStart = !isImplicit && project.status === 'confirmed'
  const showComplete = !isImplicit && project.status === 'in_progress'
  const showUnbegin = !isImplicit && project.status === 'in_progress'
  const showChecklist = !isImplicit && (project.status === 'confirmed' || project.status === 'in_progress' || project.status === 'completed')

  // Implicit label
  const implicitLabel = isImplicit
    ? (project.cleanerName ? t('assignedToAnotherCleaner') : t('unassigned'))
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={isImplicit ? undefined : () => onViewChecklist?.(project)}
      className={`
        bg-white rounded-xl border-l-4 shadow-sm transition-shadow
        ${isImplicit ? 'border-gray-200 opacity-60 cursor-default' : `${statusConfig.border} hover:shadow-md`}
        ${!isImplicit && onViewChecklist ? 'cursor-pointer' : ''}
      `}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Property Name */}
            <div className="flex items-center gap-2">
              <HomeModernIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 line-clamp-2">
                {project.propertyName || t('unknownProperty')}
              </h3>
            </div>
            {/* Address */}
            {project.propertyAddress && (
              <p className="text-sm text-gray-500 mt-1 ml-7 line-clamp-2">
                {project.propertyAddress}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isImplicit ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-500">
                {implicitLabel}
              </span>
            ) : (
              <span className={`
                inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg
                ${statusConfig.badge}
              `}>
                {statusConfig.icon}
                {t(statusConfig.labelKey)}
              </span>
            )}
            {project.pmOverride && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-700 rounded">
                <BoltIcon className="w-3 h-3" />
                {t('override')}
              </span>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="mt-2 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{formatDate(project.projectDate)}</span>
          </div>
          {(project.projectStartTime || project.projectEndTime) && (
            <div className="ml-[22px] text-gray-500">
              <span>{formatTime(project.projectStartTime)}</span>
              {project.projectStartTime && project.projectEndTime && <span> -</span>}
              {project.projectEndTime && <br />}
              <span>{formatTime(project.projectEndTime)}</span>
            </div>
          )}
          {project.guestCount && project.guestCount > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <UserGroupIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{t('guestsCount', { count: project.guestCount })}</span>
            </div>
          )}
        </div>

        {/* Badges */}
        {(overdue || project.isSameDayTurnover || openIssueCount > 0 || pendingSupplyListCount > 0 || hasPendingTimeChange) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {overdue && overdueLabel && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                {overdueLabel}
              </span>
            )}
            {project.isSameDayTurnover && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                {t('sameDay')}
              </span>
            )}
            {openIssueCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                <FlagIcon className="w-3.5 h-3.5" />
                {t('issueCount', { count: openIssueCount })}
              </span>
            )}
            {pendingSupplyListCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded">
                <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                {t('supplyCount', { count: pendingSupplyListCount })}
              </span>
            )}
            {hasPendingTimeChange && (
              <button
                onClick={(e) => { e.stopPropagation(); onViewPendingTimeChange?.(project) }}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors cursor-pointer"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                {t('timeChangePending')}
              </button>
            )}
          </div>
        )}

        {/* Checklist Progress */}
        {project.checklistProgress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{t('checklistProgress')}</span>
              <span>{t('roomItems', { count: `${project.checklistProgress.completedItems}/${project.checklistProgress.totalItems}` })}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${project.checklistProgress.completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* PM Notes */}
        {project.pmNotes && (
          <div className="mt-3 p-2.5 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <span className="font-medium">{t('noteLabel')}:</span> {project.pmNotes}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {(showAcceptDecline || showStart || showComplete || showUnbegin || showChecklist) && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:flex-wrap gap-2">
          {/* Accept/Decline for assigned projects */}
          {showAcceptDecline && (
            <>
              <button
                onClick={(e) => handleAction(e, 'accept', onAccept)}
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
                onClick={(e) => handleAction(e, 'decline', onDecline)}
                disabled={isLoading !== null}
                className="flex-1 min-w-[100px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading === 'decline' ? (
                  <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                ) : (
                  <XMarkIcon className="w-5 h-5" />
                )}
                {t('decline')}
              </button>
            </>
          )}

          {/* Start button for confirmed projects (disabled if date not today) */}
          {showStart && (
            <div className="flex-1 flex flex-col gap-1">
              <button
                onClick={(e) => handleAction(e, 'start', onStart)}
                disabled={isLoading !== null || startBlockReason !== null}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading === 'start' ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <PlayCircleIcon className="w-5 h-5" />
                )}
                {t('startCleaning')}
              </button>
              {startBlockReason && (
                <p className="text-xs text-center text-amber-700">{t(startBlockReason.key, startBlockReason.data)}</p>
              )}
            </div>
          )}

          {/* View Checklist button */}
          {showChecklist && onViewChecklist && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewChecklist(project) }}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-xl transition-colors cursor-pointer"
            >
              <ClipboardDocumentCheckIcon className="w-5 h-5" />
              {t('viewChecklist')}
            </button>
          )}

          {/* Request Time Change button */}
          {onRequestTimeChange && !hasPendingTimeChange &&
            (project.status === 'assigned' || project.status === 'confirmed' || project.status === 'in_progress') && (
            <button
              onClick={(e) => { e.stopPropagation(); onRequestTimeChange(project) }}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowPathIcon className="w-5 h-5" />
              {t('requestTimeChange')}
            </button>
          )}

          {/* View Issues button - only when issues exist */}
          {openIssueCount > 0 && onViewIssues && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewIssues(project) }}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-xl transition-colors cursor-pointer"
            >
              <FlagIcon className="w-5 h-5" />
              {t('viewIssuesCount', { count: openIssueCount })}
            </button>
          )}

          {/* Complete button for in_progress projects */}
          {showComplete && (
            <button
              onClick={(e) => handleAction(e, 'complete', onComplete)}
              disabled={isLoading !== null}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading === 'complete' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircleIcon className="w-5 h-5" />
              )}
              {t('markComplete')}
            </button>
          )}

          {/* Unbegin button for in_progress projects */}
          {showUnbegin && (
            <button
              onClick={(e) => handleAction(e, 'unbegin', onUnbegin)}
              disabled={isLoading !== null}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading === 'unbegin' ? (
                <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
              ) : (
                <ArrowPathIcon className="w-5 h-5" />
              )}
              {t('unbegin')}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Status configuration helper — labels use i18n keys resolved by the caller
function getStatusConfig(status: CleaningProjectStatus): {
  labelKey: string
  border: string
  badge: string
  icon: React.ReactNode
} {
  const configs: Record<CleaningProjectStatus, ReturnType<typeof getStatusConfig>> = {
    pending: {
      labelKey: 'pendingStatus',
      border: 'border-gray-300',
      badge: 'bg-gray-100 text-gray-700',
      icon: <div className="w-2 h-2 rounded-full bg-gray-400" />,
    },
    assigned: {
      labelKey: 'awaitingResponse',
      border: 'border-amber-400',
      badge: 'bg-amber-100 text-amber-700',
      icon: <ClockIcon className="w-3.5 h-3.5" />,
    },
    confirmed: {
      labelKey: 'confirmedStatus',
      border: 'border-indigo-400',
      badge: 'bg-indigo-100 text-indigo-700',
      icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
    },
    in_progress: {
      labelKey: 'inProgressStatus',
      border: 'border-purple-400',
      badge: 'bg-purple-100 text-purple-700',
      icon: <PlayCircleIcon className="w-3.5 h-3.5" />,
    },
    completed: {
      labelKey: 'completedStatus',
      border: 'border-green-400',
      badge: 'bg-green-100 text-green-700',
      icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
    },
    cancelled: {
      labelKey: 'cancelledStatus',
      border: 'border-gray-300',
      badge: 'bg-gray-100 text-gray-500',
      icon: <XMarkIcon className="w-3.5 h-3.5" />,
    },
  }

  return configs[status] || configs.pending
}
