'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { CleaningProject, CleaningProjectStatus } from '@/services/types/cleaningProject'
import type { BarSize } from './TurnoverCalendar'
import { formatDuration } from './utils/calendarDateUtils'

const NOTCH_SIZES = { sm: 8, md: 10, lg: 12 } as const
const FONT_SIZES = {
  sm: { name: 'text-[9px]', detail: 'text-[8px]' },
  md: { name: 'text-[11px]', detail: 'text-[10px]' },
  lg: { name: 'text-[13px]', detail: 'text-[11px]' },
} as const

const ICON_SIZES = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' } as const

interface ProjectEventProps {
  project: CleaningProject
  showProperty?: boolean
  openIssueCount?: number
  pendingSupplyListCount?: number
  barSize?: BarSize
  isCompact?: boolean
  isExpanded?: boolean
}

function formatTime(time: string | null | undefined): string | null {
  if (!time) return null
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

function getStatusDot(status: CleaningProjectStatus, isUnassigned: boolean, isAwaiting: boolean): string {
  if (isUnassigned || isAwaiting) return '#f59e0b' // amber
  const colors: Record<CleaningProjectStatus, string> = {
    pending: '#9ca3af',
    assigned: '#3b82f6',
    confirmed: '#6366f1',
    in_progress: '#a855f7',
    completed: '#22c55e',
    cancelled: '#d1d5db',
  }
  return colors[status] || colors.pending
}

function getBarColor(status: CleaningProjectStatus, isUnassigned: boolean, isAwaiting: boolean): { bg: string; text: string } {
  if (isUnassigned || isAwaiting) return { bg: '#fef3c7', text: '#92400e' } // amber-100/amber-800
  const styles: Record<CleaningProjectStatus, { bg: string; text: string }> = {
    pending: { bg: '#f3f4f6', text: '#374151' },
    assigned: { bg: '#dbeafe', text: '#1e40af' },
    confirmed: { bg: '#e0e7ff', text: '#3730a3' },
    in_progress: { bg: '#f3e8ff', text: '#6b21a8' },
    completed: { bg: '#dcfce7', text: '#166534' },
    cancelled: { bg: '#f3f4f6', text: '#6b7280' },
  }
  return styles[status] || styles.pending
}

function truncateText(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + '…' : text
}

function SparklesIcon({ barSize }: { barSize: BarSize }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={`${ICON_SIZES[barSize]} flex-shrink-0`}>
      <path d="M8 1a.5.5 0 0 1 .5.5v2.1a3 3 0 0 1 2.4 2.4H13a.5.5 0 0 1 0 1h-2.1a3 3 0 0 1-2.4 2.4V11.5a.5.5 0 0 1-1 0V9.4A3 3 0 0 1 5.1 7H3a.5.5 0 0 1 0-1h2.1A3 3 0 0 1 7.5 3.6V1.5A.5.5 0 0 1 8 1zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
      <circle cx="12.5" cy="2.5" r="1"/>
      <circle cx="13" cy="12" r=".75"/>
    </svg>
  )
}

export default function ProjectEvent({ project, showProperty = false, openIssueCount = 0, pendingSupplyListCount = 0, barSize = 'lg', isCompact = false, isExpanded = false }: ProjectEventProps) {
  const isUnassigned = !project.cleanerId
  const isAwaiting = project.status === 'assigned' && project.cleanerAccepted === null
  const dotColor = getStatusDot(project.status, isUnassigned, isAwaiting)
  const barStyle = getBarColor(project.status, isUnassigned, isAwaiting)
  const NOTCH_WIDTH = NOTCH_SIZES[barSize]
  const fonts = FONT_SIZES[barSize]

  const clipPath = `polygon(${NOTCH_WIDTH}px 0, 100% 0, calc(100% - ${NOTCH_WIDTH}px) 100%, 0 100%)`

  const displayName = showProperty
    ? (project.propertyName || 'Unknown Property')
    : (project.cleanerName || 'Unassigned')

  const timeStart = formatTime(project.checkoutTime)
  const timeEnd = formatTime(project.checkinTime)
  const timeStr = timeStart && timeEnd ? `${timeStart} → ${timeEnd}` : timeStart || timeEnd || ''

  // Badge indicators as compact dots
  const hasIssues = openIssueCount > 0
  const hasSupplies = pendingSupplyListCount > 0

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  return (
    <div
      className="group relative w-full h-full"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setMousePos(null)}
    >
      <div
        className="absolute inset-0 transition-opacity group-hover:opacity-85"
        style={{
          backgroundColor: barStyle.bg,
          clipPath,
          border: `1px solid ${isUnassigned || isAwaiting ? '#fbbf24' : 'transparent'}`,
        }}
      >
        {/* Dashed left accent — inside the clipped area */}
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{
            width: 2,
            marginLeft: NOTCH_WIDTH - 1,
            backgroundImage: `repeating-linear-gradient(to bottom, ${dotColor} 0px, ${dotColor} 4px, transparent 4px, transparent 8px)`,
          }}
        />

        {/* Two-line content — hidden in compact (month) mode */}
        {!isCompact && (
          <div
            className="absolute inset-0 flex flex-col justify-center overflow-hidden"
            style={{ paddingLeft: NOTCH_WIDTH + 6, paddingRight: NOTCH_WIDTH + 4 }}
          >
            <div className="flex items-center gap-1 leading-tight">
              <SparklesIcon barSize={barSize} />
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: dotColor }}
              />
              <span className={`${fonts.name} font-semibold truncate leading-tight`} style={{ color: barStyle.text }}>
                {displayName}
              </span>
              {hasIssues && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              )}
              {hasSupplies && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
              )}
            </div>
            {barSize !== 'sm' && timeStr && (
              <span className={`${fonts.detail} truncate leading-tight`} style={{ color: barStyle.text, opacity: 0.7 }}>
                {timeStr}
              </span>
            )}
            {barSize !== 'sm' && project.guestName && (
              <span className={`${fonts.detail} truncate leading-tight`} style={{ color: barStyle.text, opacity: 0.6 }}>
                Guest: {project.guestName}
              </span>
            )}
            {isExpanded && (
              <span className={`${fonts.detail} truncate leading-tight`} style={{ color: barStyle.text, opacity: 0.6 }}>
                {project.estimatedDurationMinutes ? formatDuration(project.estimatedDurationMinutes) : ''}{project.guestCount ? ` · ${project.guestCount} guests` : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tooltip — portaled to body to escape overflow/transform containers */}
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
            {timeStr && <div className="text-gray-300 mt-0.5">{timeStr}</div>}
            <div className="text-gray-300 mt-0.5 capitalize">
              Status: {isAwaiting ? 'Awaiting Response' : project.status.replace('_', ' ')}
            </div>
            {project.estimatedDurationMinutes && (
              <div className="text-gray-300 mt-0.5">Est. {formatDuration(project.estimatedDurationMinutes)}</div>
            )}
            {(project.guestName || project.reservationCode) && (
              <div className="text-gray-300 mt-0.5">
                {project.guestName ? `Guest: ${project.guestName}` : ''}
                {project.guestName && project.reservationCode ? ` · #${project.reservationCode}` : ''}
                {!project.guestName && project.reservationCode ? `#${project.reservationCode}` : ''}
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
            {project.isSameDayTurnover && <div className="text-amber-400 mt-0.5">Same Day Turnover</div>}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
