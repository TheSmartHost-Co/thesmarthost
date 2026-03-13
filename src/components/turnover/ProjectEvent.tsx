'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { CleaningProject, CleaningProjectStatus } from '@/services/types/cleaningProject'
import type { ZoomLevel } from './TurnoverCalendar'
import { formatDuration, toLocalDateStr } from './utils/calendarDateUtils'
import { isProjectOverdue, getOverdueMinutes, formatOverdueDuration } from '@/services/cleaningProjectService'

interface ProjectEventProps {
  project: CleaningProject
  showProperty?: boolean
  openIssueCount?: number
  pendingSupplyListCount?: number
  zoomLevel?: ZoomLevel
  isExpanded?: boolean
  /** @deprecated Use project.nextBookingCheckIn directly */
  nextCheckinDate?: string | null
}

function formatShortTime(time: string | null | undefined): string | null {
  if (!time) return null
  const [hours] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}${ampm}`
}

function formatTime(time: string | null | undefined): string | null {
  if (!time) return null
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

function getStatusStyle(status: CleaningProjectStatus, isUnassigned: boolean, isAwaiting: boolean): { bg: string; text: string; border?: string; borderLeft: string } {
  if (isUnassigned || isAwaiting) return { bg: '#fef3c7', text: '#78350f', border: '#fbbf24', borderLeft: '#d97706' }
  const styles: Record<CleaningProjectStatus, { bg: string; text: string; borderLeft: string }> = {
    pending: { bg: '#f3f4f6', text: '#111827', borderLeft: '#d97706' },
    assigned: { bg: '#dbeafe', text: '#1e3a8a', borderLeft: '#2563eb' },
    confirmed: { bg: '#e0e7ff', text: '#312e81', borderLeft: '#4f46e5' },
    in_progress: { bg: '#f3e8ff', text: '#581c87', borderLeft: '#9333ea' },
    completed: { bg: '#dcfce7', text: '#14532d', borderLeft: '#16a34a' },
    cancelled: { bg: '#f3f4f6', text: '#4b5563', borderLeft: '#6b7280' },
  }
  return styles[status] || styles.pending
}

function getStatusDotColor(status: CleaningProjectStatus, isUnassigned: boolean, isAwaiting: boolean): string {
  if (isUnassigned || isAwaiting) return '#f59e0b'
  const colors: Record<CleaningProjectStatus, string> = {
    pending: '#fbbf24',
    assigned: '#60a5fa',
    confirmed: '#818cf8',
    in_progress: '#c084fc',
    completed: '#4ade80',
    cancelled: '#9ca3af',
  }
  return colors[status] || colors.pending
}

function getStatusLabel(status: CleaningProjectStatus, isAwaiting: boolean): string {
  if (isAwaiting) return 'Awaiting'
  return status.replace('_', ' ')
}

function truncateText(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + '\u2026' : text
}

export default function ProjectEvent({
  project,
  showProperty = false,
  openIssueCount = 0,
  pendingSupplyListCount = 0,
  zoomLevel = 7,
  isExpanded = false,
  nextCheckinDate = null,
}: ProjectEventProps) {
  const isUnassigned = !project.cleanerId
  const isAwaiting = project.status === 'assigned'
  const overdue = isProjectOverdue(project)
  const overdueMinutes = getOverdueMinutes(project)
  const overdueLabel = overdue && overdueMinutes !== null ? formatOverdueDuration(overdueMinutes) : null

  const dotColor = overdue ? '#ef4444' : getStatusDotColor(project.status, isUnassigned, isAwaiting)
  const statusStyle = overdue
    ? { bg: '#fef2f2', text: '#991b1b', borderLeft: '#dc2626' }
    : getStatusStyle(project.status, isUnassigned, isAwaiting)
  const statusLabel = overdue && overdueLabel ? overdueLabel : getStatusLabel(project.status, isAwaiting)

  const isMonth = zoomLevel === 'month'

  const cleanerName = project.cleanerName || 'Unassigned'
  const displayName = showProperty
    ? (project.propertyName || 'Unknown Property')
    : cleanerName

  const timeStart = formatShortTime(project.projectStartTime)
  const timeEnd = formatShortTime(project.projectEndTime)
  const timeStr = timeStart && timeEnd ? `${timeStart}\u2192${timeEnd}` : timeStart || timeEnd || ''

  const timeLong = (() => {
    const s = formatTime(project.projectStartTime)
    const e = formatTime(project.projectEndTime)
    return s && e ? `${s} \u2192 ${e}` : s || e || ''
  })()

  const hasIssues = openIssueCount > 0
  const hasSupplies = pendingSupplyListCount > 0

  // Calculate gap: project date → next guest check-in (calendar days)
  const nextGuestCountdown = (() => {
    if (!project.nextBookingCheckIn || !project.projectDate) return null

    const cleanDate = toLocalDateStr(project.projectDate)
    const ciDate = toLocalDateStr(project.nextBookingCheckIn)

    // Compare calendar days only
    const [cy, cm, cd] = cleanDate.split('-').map(Number)
    const [iy, im, id] = ciDate.split('-').map(Number)
    const projectDay = new Date(cy, cm - 1, cd)
    const checkinDay = new Date(iy, im - 1, id)

    const diffDays = Math.round((checkinDay.getTime() - projectDay.getTime()) / 86400000)
    if (diffDays <= 0) return null

    return `Next Guest: ${diffDays} day${diffDays !== 1 ? 's' : ''}`
  })()

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  // Month view: compact colored card
  if (isMonth) {
    return (
      <div
        className="group relative w-full h-full"
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setMousePos(null)}
      >
        <div
          className="absolute inset-0 rounded-lg transition-opacity group-hover:opacity-85"
          style={{
            backgroundColor: statusStyle.bg,
            borderLeft: `3px solid ${statusStyle.borderLeft}`,
            boxShadow: statusStyle.border
              ? `inset 0 0 0 1px ${statusStyle.border}`
              : `inset 0 0 0 1px rgba(0,0,0,0.1)`,
          }}
        >
          <div
            className="absolute inset-0 flex items-center overflow-hidden px-2"
          >
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0 mr-1"
              style={{ backgroundColor: dotColor }}
            />
            <span
              className="text-[10px] font-semibold truncate leading-none"
              style={{ color: statusStyle.text }}
            >
              {displayName}
            </span>
            {timeStr && (
              <span
                className="text-[9px] ml-1 opacity-60 flex-shrink-0"
                style={{ color: statusStyle.text }}
              >
                {timeStr}
              </span>
            )}
          </div>
        </div>

        {/* Tooltip */}
        {mousePos && createPortal(
          <div
            className="fixed z-[200] pointer-events-none"
            style={{ left: mousePos.x + 12, top: mousePos.y - 12 }}
          >
            <div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg max-w-xs">
              <div className="font-semibold">{displayName}</div>
              <div className="border-t border-gray-700 my-1" />
              {showProperty && project.cleanerName && (
                <div className="text-gray-300 mt-0.5">Cleaner: {project.cleanerName}</div>
              )}
              {!showProperty && project.propertyName && (
                <div className="text-gray-300 mt-0.5">{project.propertyName}</div>
              )}
              {timeLong && <div className="text-gray-300 mt-0.5">{timeLong}</div>}
              <div className="text-gray-300 mt-0.5 capitalize">
                Status: {isAwaiting ? 'Awaiting Response' : project.status.replace('_', ' ')}
              </div>
              {overdue && overdueLabel && <div className="text-red-400 mt-0.5 font-semibold">{overdueLabel}</div>}
              {project.estimatedDurationMinutes && (
                <div className="text-gray-300 mt-0.5">Est. {formatDuration(project.estimatedDurationMinutes)}</div>
              )}
              {project.previousBookingGuestName && (
                <div className="text-gray-300 mt-0.5">
                  Guest: {project.previousBookingGuestName}
                </div>
              )}
              {hasIssues && <div className="text-red-400 mt-0.5">{openIssueCount} issue{openIssueCount !== 1 ? 's' : ''}</div>}
              {hasSupplies && <div className="text-teal-400 mt-0.5">{pendingSupplyListCount} supply list{pendingSupplyListCount !== 1 ? 's' : ''}</div>}
              {nextGuestCountdown && <div className="text-blue-400 mt-0.5">{nextGuestCountdown}</div>}
              {project.isSameDayTurnover && <div className="text-amber-400 mt-0.5">Same Day Turnover</div>}
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  // Timeline views: vertical layout with 3px left border (~80px)
  const scheduledDateFormatted = project.projectDate
    ? (() => {
        const raw = project.projectDate
        const dateOnly = toLocalDateStr(raw)
        const [y, m, d] = dateOnly.split('-').map(Number)
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      })()
    : null

  return (
    <div
      className="group relative w-full h-full"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setMousePos(null)}
    >
      <div
        className="absolute inset-0 rounded-lg transition-opacity group-hover:opacity-90"
        style={{
          backgroundColor: statusStyle.bg,
          borderLeft: `3px solid ${statusStyle.borderLeft}`,
          boxShadow: statusStyle.border
            ? `inset 0 0 0 1px ${statusStyle.border}`
            : `inset 0 0 0 1px rgba(0,0,0,0.1)`,
        }}
      >
        {/* Content — vertical layout */}
        <div className="absolute inset-0 flex flex-col justify-start px-2.5 py-1.5" style={{ overflow: 'hidden' }}>
          {/* Line 1: [dot] Name (bold) */}
          <div className="flex items-center gap-1" style={{ lineHeight: 1.2 }}>
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: dotColor }}
            />
            <span className="text-[12px] font-semibold" style={{ color: statusStyle.text }}>
              {displayName}
            </span>
          </div>

          {/* Line 2: Status · Time range */}
          <div className="mt-0.5" style={{ lineHeight: 1.2 }}>
            <span className="text-[11px] capitalize" style={{ color: statusStyle.text, opacity: 0.75 }}>
              {statusLabel}
              {timeStr && ` \u00b7 ${timeStr}`}
            </span>
          </div>

          {/* Line 3: Scheduled date + gap until check-in */}
          {(scheduledDateFormatted || nextGuestCountdown) && (
            <div className="mt-0.5" style={{ lineHeight: 1.2 }}>
              <span className="text-[11px]" style={{ color: statusStyle.text, opacity: 0.75 }}>
                {scheduledDateFormatted}
                {nextGuestCountdown && ` \u00b7 ${nextGuestCountdown}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tooltip — portaled to body */}
      {mousePos && createPortal(
        <div
          className="fixed z-[200] pointer-events-none"
          style={{ left: mousePos.x + 12, top: mousePos.y - 12 }}
        >
          <div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg max-w-xs">
            <div className="font-semibold">{displayName}</div>
            <div className="border-t border-gray-700 my-1" />
            {showProperty && project.cleanerName && (
              <div className="text-gray-300 mt-0.5">Cleaner: {project.cleanerName}</div>
            )}
            {!showProperty && project.propertyName && (
              <div className="text-gray-300 mt-0.5">{project.propertyName}</div>
            )}
            {timeLong && <div className="text-gray-300 mt-0.5">{timeLong}</div>}
            <div className="text-gray-300 mt-0.5 capitalize">
              Status: {isAwaiting ? 'Awaiting Response' : project.status.replace('_', ' ')}
            </div>
            {overdue && overdueLabel && <div className="text-red-400 mt-0.5 font-semibold">{overdueLabel}</div>}
            {project.estimatedDurationMinutes && (
              <div className="text-gray-300 mt-0.5">Est. {formatDuration(project.estimatedDurationMinutes)}</div>
            )}
            {project.previousBookingGuestName && (
              <div className="text-gray-300 mt-0.5">
                Guest: {project.previousBookingGuestName}
              </div>
            )}
            {(project.propertyNumBedrooms || project.propertyNumBathrooms) && (
              <div className="text-gray-300 mt-0.5">
                {project.propertyNumBedrooms ? `${project.propertyNumBedrooms}BR` : ''}
                {project.propertyNumBedrooms && project.propertyNumBathrooms ? ' / ' : ''}
                {project.propertyNumBathrooms ? `${project.propertyNumBathrooms}BA` : ''}
              </div>
            )}
            {project.pmNotes && (
              <div className="text-gray-300 mt-0.5 truncate">PM: {truncateText(project.pmNotes, 60)}</div>
            )}
            {project.cleanerNotes && (
              <div className="text-gray-300 mt-0.5 truncate">Cleaner: {truncateText(project.cleanerNotes, 60)}</div>
            )}
            {hasIssues && <div className="text-red-400 mt-0.5">{openIssueCount} issue{openIssueCount !== 1 ? 's' : ''}</div>}
            {hasSupplies && <div className="text-teal-400 mt-0.5">{pendingSupplyListCount} supply list{pendingSupplyListCount !== 1 ? 's' : ''}</div>}
            {nextGuestCountdown && <div className="text-blue-400 mt-0.5">{nextGuestCountdown}</div>}
            {project.isSameDayTurnover && <div className="text-amber-400 mt-0.5">Same Day Turnover</div>}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
