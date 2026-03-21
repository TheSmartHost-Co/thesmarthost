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
  isActivated?: boolean
  compact?: boolean
  isMobile?: boolean
  isImplicit?: boolean
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
  if (isUnassigned || isAwaiting) return { bg: '#fcd34d', text: '#451a03', border: '#fbbf24', borderLeft: '#d97706' }
  const styles: Record<CleaningProjectStatus, { bg: string; text: string; borderLeft: string }> = {
    pending: { bg: '#d1d5db', text: '#111827', borderLeft: '#d97706' },
    assigned: { bg: '#93c5fd', text: '#1e3a8a', borderLeft: '#2563eb' },
    confirmed: { bg: '#a5b4fc', text: '#312e81', borderLeft: '#4f46e5' },
    in_progress: { bg: '#d8b4fe', text: '#3b0764', borderLeft: '#9333ea' },
    completed: { bg: '#86efac', text: '#052e16', borderLeft: '#16a34a' },
    cancelled: { bg: '#d1d5db', text: '#1f2937', borderLeft: '#6b7280' },
  }
  return styles[status] || styles.pending
}

function getStatusDotColor(status: CleaningProjectStatus, isUnassigned: boolean, isAwaiting: boolean): string {
  if (isUnassigned || isAwaiting) return '#d97706'
  const colors: Record<CleaningProjectStatus, string> = {
    pending: '#f59e0b',
    assigned: '#3b82f6',
    confirmed: '#6366f1',
    in_progress: '#a855f7',
    completed: '#22c55e',
    cancelled: '#6b7280',
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
  isActivated = false,
  compact = false,
  isMobile = false,
  isImplicit = false,
  nextCheckinDate = null,
}: ProjectEventProps) {
  const isUnassigned = !project.cleanerId
  const isAwaiting = project.status === 'assigned'
  const overdue = isProjectOverdue(project)
  const overdueMinutes = getOverdueMinutes(project)
  const overdueLabel = overdue && overdueMinutes !== null ? formatOverdueDuration(overdueMinutes) : null

  const dotColor = isImplicit ? '#9ca3af' : overdue ? '#ef4444' : getStatusDotColor(project.status, isUnassigned, isAwaiting)
  const statusStyle = isImplicit
    ? { bg: '#e5e7eb', text: '#6b7280', borderLeft: '#9ca3af' }
    : overdue
      ? { bg: '#fca5a5', text: '#7f1d1d', borderLeft: '#dc2626' }
      : getStatusStyle(project.status, isUnassigned, isAwaiting)
  const statusLabel = isImplicit ? 'Other' : overdue && overdueLabel ? overdueLabel : getStatusLabel(project.status, isAwaiting)

  // Implicit projects: muted, non-interactive
  const implicitStyle: React.CSSProperties | undefined = isImplicit
    ? { opacity: 0.5, pointerEvents: 'none', cursor: 'default' }
    : undefined

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

  // Activated visual styles
  const activatedBoxShadow = isActivated
    ? '0 0 0 2px #1f2937, 0 6px 20px rgba(0,0,0,0.2)'
    : undefined

  // Month view: compact colored card
  if (isMonth) {
    return (
      <div
        className="group relative w-full h-full"
        style={implicitStyle || (isActivated ? { zIndex: 200, transition: 'all 0.15s ease' } : undefined)}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setMousePos(null)}
      >
        <div
          className="absolute inset-0 rounded-lg transition-opacity group-hover:opacity-85"
          style={{
            backgroundColor: statusStyle.bg,
            borderLeft: `3px ${isImplicit ? 'dashed' : 'solid'} ${statusStyle.borderLeft}`,
            boxShadow: activatedBoxShadow || (statusStyle.border
              ? `inset 0 0 0 1px ${statusStyle.border}`
              : `inset 0 0 0 1px rgba(0,0,0,0.1)`),
            transform: isActivated ? 'scale(1.04)' : undefined,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <div className="absolute inset-0 flex items-center overflow-hidden px-2">
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
          </div>
          {project.isSameDayTurnover && (
            <div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.25) 6px, transparent 6px, transparent 12px)',
                borderTop: '2px solid #f59e0b',
              }}
            />
          )}
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

  // Scheduled date formatted — used in both compact and full views
  const scheduledDateFormatted = project.projectDate
    ? (() => {
        const raw = project.projectDate
        const dateOnly = toLocalDateStr(raw)
        const [y, m, d] = dateOnly.split('-').map(Number)
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })()
    : null

  // Display tier logic
  const isNarrow = typeof zoomLevel === 'number' && zoomLevel >= 10
  const displayTier = isMobile
    ? 'mobile' as const
    : compact ? (isNarrow ? 4 : 3) : (isNarrow ? 2 : 1)

  // Shared SDT overlay
  const sdtOverlay = project.isSameDayTurnover && (
    <div
      className="absolute inset-0 rounded-lg pointer-events-none"
      style={{
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.25) 6px, transparent 6px, transparent 12px)',
        borderTop: '2px solid #f59e0b',
      }}
    />
  )

  // Shared SDT badge (displayed on tiers 1-2 where there's room)
  const sdtBadge = project.isSameDayTurnover && (typeof displayTier === 'number' && displayTier <= 2) && (
    <div className="absolute top-0.5 right-1 px-1 py-px rounded text-[8px] font-bold bg-amber-500 text-white leading-none z-10">
      SDT
    </div>
  )

  // Shared grip dots
  const gripDots = isActivated && (
    <div
      className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col gap-[3px] opacity-40"
      style={{ cursor: 'grab' }}
    >
      <div className="flex gap-[3px]">
        <span className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: statusStyle.text }} />
        <span className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: statusStyle.text }} />
      </div>
      <div className="flex gap-[3px]">
        <span className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: statusStyle.text }} />
        <span className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: statusStyle.text }} />
      </div>
      <div className="flex gap-[3px]">
        <span className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: statusStyle.text }} />
        <span className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: statusStyle.text }} />
      </div>
    </div>
  )

  // Shared tooltip content
  const tooltipContent = mousePos && createPortal(
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
  )

  // Tier 1 — Full: vertical layout (~80px tall, wide columns)
  if (displayTier === 1) {
    return (
      <div
        className="group relative w-full h-full"
        style={implicitStyle || (isActivated ? { zIndex: 200, transition: 'all 0.15s ease' } : undefined)}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setMousePos(null)}
      >
        <div
          className="absolute inset-0 rounded-lg transition-opacity group-hover:opacity-90"
          style={{
            backgroundColor: statusStyle.bg,
            borderLeft: `3px ${isImplicit ? 'dashed' : 'solid'} ${statusStyle.borderLeft}`,
            boxShadow: activatedBoxShadow || (statusStyle.border
              ? `inset 0 0 0 1px ${statusStyle.border}`
              : `inset 0 0 0 1px rgba(0,0,0,0.1)`),
            transform: isActivated ? 'scale(1.04)' : undefined,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          {gripDots}
          {sdtOverlay}
          {sdtBadge}
          <div className="absolute inset-0 flex flex-col justify-start px-2.5 py-1.5 overflow-hidden">
            <div className="flex items-start gap-1" style={{ lineHeight: 1.2 }}>
              <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 mt-[3px]" style={{ backgroundColor: dotColor }} />
              <span className="text-[12px] font-semibold" style={{ color: statusStyle.text, overflowWrap: 'break-word', wordBreak: 'normal' }}>
                {displayName}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1 flex-wrap" style={{ lineHeight: 1.2 }}>
              <span className="text-[11px] capitalize" style={{ color: statusStyle.text, opacity: 0.75 }}>{statusLabel}</span>
              {timeStr && (
                <>
                  <span className="text-[11px]" style={{ color: statusStyle.text, opacity: 0.45 }}>·</span>
                  <span className="text-[11px]" style={{ color: statusStyle.text, opacity: 0.7 }}>{timeStr}</span>
                </>
              )}
            </div>
            {(scheduledDateFormatted || nextGuestCountdown) && (
              <div className="mt-0.5" style={{ lineHeight: 1.2 }}>
                <span className="text-[11px]" style={{ color: statusStyle.text, opacity: 0.75 }}>{scheduledDateFormatted}</span>
                {nextGuestCountdown && (
                  <div style={{ lineHeight: 1.2 }}>
                    <span className="text-[11px]" style={{ color: statusStyle.text, opacity: 0.75 }}>{nextGuestCountdown}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {tooltipContent}
      </div>
    )
  }

  // Tier 2 — Tall-narrow: vertical stacked, tighter fonts, drop next-guest
  if (displayTier === 2) {
    return (
      <div
        className="group relative w-full h-full"
        style={implicitStyle || (isActivated ? { zIndex: 200, transition: 'all 0.15s ease' } : undefined)}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setMousePos(null)}
      >
        <div
          className="absolute inset-0 rounded-lg transition-opacity group-hover:opacity-90"
          style={{
            backgroundColor: statusStyle.bg,
            borderLeft: `3px ${isImplicit ? 'dashed' : 'solid'} ${statusStyle.borderLeft}`,
            boxShadow: activatedBoxShadow || (statusStyle.border
              ? `inset 0 0 0 1px ${statusStyle.border}`
              : `inset 0 0 0 1px rgba(0,0,0,0.1)`),
            transform: isActivated ? 'scale(1.04)' : undefined,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          {gripDots}
          {sdtOverlay}
          {sdtBadge}
          <div className="absolute inset-0 flex flex-col justify-start px-1.5 py-1 overflow-hidden">
            <div className="flex items-start gap-1" style={{ lineHeight: 1.2 }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[2px]" style={{ backgroundColor: dotColor }} />
              <span className="text-[10px] font-semibold" style={{ color: statusStyle.text, overflowWrap: 'break-word', wordBreak: 'normal' }}>
                {displayName}
              </span>
            </div>
            <span className="text-[9px] capitalize mt-0.5" style={{ color: statusStyle.text, opacity: 0.75 }}>{statusLabel}</span>
            {timeStr && (
              <span className="text-[9px] mt-0.5" style={{ color: statusStyle.text, opacity: 0.7 }}>{timeStr}</span>
            )}
            {scheduledDateFormatted && (
              <span className="text-[9px] mt-0.5" style={{ color: statusStyle.text, opacity: 0.6 }}>{scheduledDateFormatted}</span>
            )}
          </div>
        </div>
        {tooltipContent}
      </div>
    )
  }

  // Mobile tier — vertical stack for narrow phone columns (~58px wide, 96px tall)
  if (displayTier === 'mobile') {
    return (
      <div
        className="group relative w-full h-full"
        style={implicitStyle || (isActivated ? { zIndex: 200, transition: 'all 0.15s ease' } : undefined)}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setMousePos(null)}
      >
        <div
          className="absolute inset-0 rounded transition-opacity group-hover:opacity-85 overflow-hidden"
          style={{
            backgroundColor: statusStyle.bg,
            borderLeft: `2px ${isImplicit ? 'dashed' : 'solid'} ${statusStyle.borderLeft}`,
            boxShadow: activatedBoxShadow || `inset 0 0 0 1px rgba(0,0,0,0.1)`,
            transform: isActivated ? 'scale(1.04)' : undefined,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          {sdtOverlay}
          <div
            className="absolute inset-0 flex flex-col justify-start overflow-hidden px-1 py-1"
            style={{ lineHeight: 1.2 }}
          >
            <span
              className="text-[10px] font-semibold"
              style={{ color: statusStyle.text, overflowWrap: 'break-word', wordBreak: 'normal' }}
            >
              {displayName}
            </span>
            <span
              className="text-[9px] capitalize mt-0.5"
              style={{ color: statusStyle.text, opacity: 0.7 }}
            >
              {statusLabel}
            </span>
            {timeStart && (
              <span className="text-[9px] mt-0.5" style={{ color: statusStyle.text, opacity: 0.7 }}>
                {timeStart}
              </span>
            )}
            {timeEnd && (
              <span className="text-[9px]" style={{ color: statusStyle.text, opacity: 0.7 }}>
                →{timeEnd}
              </span>
            )}
            {scheduledDateFormatted && (
              <span className="text-[9px] mt-0.5" style={{ color: statusStyle.text, opacity: 0.6 }}>
                {scheduledDateFormatted}
              </span>
            )}
          </div>
        </div>
        {tooltipContent}
      </div>
    )
  }

  // Tier 3 — Short-wide: 2-line compact horizontal (~44px tall, wide columns)
  if (displayTier === 3) {
    return (
      <div
        className="group relative w-full h-full"
        style={implicitStyle || (isActivated ? { zIndex: 200, transition: 'all 0.15s ease' } : undefined)}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setMousePos(null)}
      >
        <div
          className="absolute inset-0 rounded transition-opacity group-hover:opacity-85 overflow-hidden"
          style={{
            backgroundColor: statusStyle.bg,
            borderLeft: `2px ${isImplicit ? 'dashed' : 'solid'} ${statusStyle.borderLeft}`,
            boxShadow: activatedBoxShadow || `inset 0 0 0 1px rgba(0,0,0,0.1)`,
            transform: isActivated ? 'scale(1.04)' : undefined,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          {gripDots}
          {sdtOverlay}
          <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-1.5 py-0.5">
            <div className="flex items-center gap-1 min-w-0" style={{ lineHeight: 1.2 }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
              <span className="text-[10px] font-semibold truncate" style={{ color: statusStyle.text }}>
                {displayName}
              </span>
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden min-w-0 mt-px" style={{ lineHeight: 1.2 }}>
              <span className="text-[9px] capitalize" style={{ color: statusStyle.text, opacity: 0.75 }}>{statusLabel}</span>
              {timeStr && (
                <>
                  <span className="text-[9px]" style={{ color: statusStyle.text, opacity: 0.45 }}>·</span>
                  <span className="text-[9px]" style={{ color: statusStyle.text, opacity: 0.7 }}>{timeStr}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {tooltipContent}
      </div>
    )
  }

  // Tier 4 — Minimal: 2-line bare minimum (~44px tall, narrow columns)
  return (
    <div
      className="group relative w-full h-full"
      style={implicitStyle || (isActivated ? { zIndex: 200, transition: 'all 0.15s ease' } : undefined)}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setMousePos(null)}
    >
      <div
        className="absolute inset-0 rounded transition-opacity group-hover:opacity-85 overflow-hidden"
        style={{
          backgroundColor: statusStyle.bg,
          borderLeft: `2px ${isImplicit ? 'dashed' : 'solid'} ${statusStyle.borderLeft}`,
          boxShadow: activatedBoxShadow || `inset 0 0 0 1px rgba(0,0,0,0.1)`,
          transform: isActivated ? 'scale(1.04)' : undefined,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        {sdtOverlay}
        <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-1 py-0.5">
          <div className="flex items-center gap-0.5 min-w-0" style={{ lineHeight: 1.2 }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
            <span className="text-[9px] font-semibold truncate" style={{ color: statusStyle.text }}>
              {displayName}
            </span>
          </div>
          <span className="text-[9px] capitalize truncate mt-px" style={{ color: statusStyle.text, opacity: 0.75, lineHeight: 1.2 }}>
            {statusLabel}
          </span>
        </div>
      </div>
      {tooltipContent}
    </div>
  )
}
