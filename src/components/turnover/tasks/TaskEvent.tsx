'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/solid'
import type { MaintenanceTask, MaintenanceTaskStatus } from '@/services/types/maintenanceTask'
import type { ZoomLevel } from '../TurnoverCalendar'

interface TaskEventProps {
  task: MaintenanceTask
  showProperty?: boolean
  zoomLevel?: ZoomLevel
  isExpanded?: boolean
  isActivated?: boolean
  compact?: boolean
  isMobile?: boolean
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

// Maintenance task status convention: pending/cancelled=gray, assigned=amber,
// confirmed=blue, in_progress=purple, completed=green.
// Visually distinct from cleaning-project bars: light status-tinted background
// with a solid status stripe on the left (projects use saturated fills).
function getTaskStatusStyle(status: MaintenanceTaskStatus): { bg: string; text: string; stripe: string } {
  const styles: Record<MaintenanceTaskStatus, { bg: string; text: string; stripe: string }> = {
    pending: { bg: '#f3f4f6', text: '#374151', stripe: '#6b7280' },
    assigned: { bg: '#fef3c7', text: '#78350f', stripe: '#d97706' },
    confirmed: { bg: '#dbeafe', text: '#1e3a8a', stripe: '#2563eb' },
    in_progress: { bg: '#f3e8ff', text: '#3b0764', stripe: '#9333ea' },
    completed: { bg: '#dcfce7', text: '#052e16', stripe: '#16a34a' },
    cancelled: { bg: '#f3f4f6', text: '#6b7280', stripe: '#9ca3af' },
  }
  return styles[status] || styles.pending
}

export default function TaskEvent({
  task,
  showProperty = false,
  zoomLevel = 7,
  isActivated = false,
  compact = false,
  isMobile = false,
}: TaskEventProps) {
  const { t } = useTranslation('turnover')
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const statusStyle = getTaskStatusStyle(task.status)
  const isPending = task.status === 'pending'
  const isCancelled = task.status === 'cancelled'
  const duringStay = !!task.duringBookingId

  const statusLabel = task.status.replace('_', ' ')
  const contractorName = task.contractorName || t('unassigned')

  const timeStart = formatShortTime(task.scheduledStartTime)
  const timeEnd = formatShortTime(task.scheduledEndTime)
  const timeStr = timeStart && timeEnd ? `${timeStart}→${timeEnd}` : timeStart || timeEnd || ''
  const timeLong = (() => {
    const s = formatTime(task.scheduledStartTime)
    const e = formatTime(task.scheduledEndTime)
    return s && e ? `${s} → ${e}` : s || e || ''
  })()

  const activatedBoxShadow = isActivated
    ? '0 0 0 2px #1f2937, 0 6px 20px rgba(0,0,0,0.2)'
    : undefined

  const barStyle: React.CSSProperties = {
    backgroundColor: statusStyle.bg,
    borderLeft: `3px solid ${statusStyle.stripe}`,
    // Pending tasks get a dashed outline; others a subtle inset ring
    border: isPending ? '1px dashed #9ca3af' : undefined,
    boxShadow: activatedBoxShadow || (isPending ? undefined : 'inset 0 0 0 1px rgba(0,0,0,0.1)'),
    opacity: isCancelled ? 0.5 : undefined,
    transform: isActivated ? 'scale(1.04)' : undefined,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  }
  // Re-assert the stripe after the shorthand border (pending case)
  if (isPending) barStyle.borderLeft = `3px solid ${statusStyle.stripe}`

  const titleDecoration: React.CSSProperties = isCancelled ? { textDecoration: 'line-through' } : {}

  // During-stay warning badge (task scheduled while a guest is in-house)
  const duringStayBadge = duringStay && (
    <div
      className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold leading-none z-10"
      title={t('taskDuringGuestStay', { defaultValue: 'During guest stay' })}
    >
      !
    </div>
  )

  const tooltipContent = mousePos && createPortal(
    <div
      className="fixed z-[200] pointer-events-none"
      style={{ left: mousePos.x + 12, top: mousePos.y - 12 }}
    >
      <div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg max-w-xs">
        <div className="font-semibold flex items-center gap-1.5">
          <WrenchScrewdriverIcon className="w-3 h-3 flex-shrink-0" />
          <span style={titleDecoration}>{task.title}</span>
        </div>
        <div className="border-t border-gray-700 my-1" />
        <div className="text-gray-300 mt-0.5">{t('maintenanceTaskLabel', { defaultValue: 'Maintenance task' })}</div>
        {task.propertyName && (
          <div className="text-gray-300 mt-0.5">{task.propertyName}</div>
        )}
        <div className="text-gray-300 mt-0.5">{t('taskContractorLabel', { defaultValue: 'Contractor' })}: {contractorName}</div>
        {timeLong && <div className="text-gray-300 mt-0.5">{timeLong}</div>}
        <div className="text-gray-300 mt-0.5 capitalize">{t('status')}: {statusLabel}</div>
        {duringStay && (
          <div className="text-red-400 mt-0.5">{t('taskDuringGuestStay', { defaultValue: 'During guest stay' })}</div>
        )}
      </div>
    </div>,
    document.body
  )

  const isNarrow = typeof zoomLevel === 'number' && zoomLevel >= 10
  const useCompactLayout = compact || isNarrow

  // Compact / narrow layout — 2-line minimal (mirrors ProjectEvent tier 3/4)
  if (useCompactLayout || isMobile) {
    return (
      <div
        className="group relative w-full h-full"
        style={isActivated ? { zIndex: 200, transition: 'all 0.15s ease' } : undefined}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setMousePos(null)}
      >
        <div
          className="absolute inset-0 rounded transition-opacity group-hover:opacity-85 overflow-hidden"
          style={barStyle}
        >
          {duringStayBadge}
          <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-1.5 py-0.5">
            <div className="flex items-center gap-1 min-w-0" style={{ lineHeight: 1.2 }}>
              <WrenchScrewdriverIcon className="w-2.5 h-2.5 flex-shrink-0" style={{ color: statusStyle.stripe }} />
              <span className="text-[10px] font-semibold truncate" style={{ color: statusStyle.text, ...titleDecoration }}>
                {task.title}
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

  // Full layout — vertical (mirrors ProjectEvent tier 1)
  return (
    <div
      className="group relative w-full h-full"
      style={isActivated ? { zIndex: 200, transition: 'all 0.15s ease' } : undefined}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setMousePos(null)}
    >
      <div
        className="absolute inset-0 rounded-lg transition-opacity group-hover:opacity-90"
        style={barStyle}
      >
        {duringStayBadge}
        <div className="absolute inset-0 flex flex-col justify-start px-2.5 py-1.5 overflow-hidden">
          <div className="flex items-start gap-1" style={{ lineHeight: 1.2 }}>
            <WrenchScrewdriverIcon className="w-3 h-3 flex-shrink-0 mt-[2px]" style={{ color: statusStyle.stripe }} />
            <span className="text-[12px] font-semibold" style={{ color: statusStyle.text, overflowWrap: 'break-word', wordBreak: 'normal', ...titleDecoration }}>
              {task.title}
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
          <div className="mt-0.5" style={{ lineHeight: 1.2 }}>
            <span className="text-[11px] truncate block" style={{ color: statusStyle.text, opacity: 0.75 }}>
              {showProperty ? (task.propertyName || contractorName) : contractorName}
            </span>
          </div>
        </div>
      </div>
      {tooltipContent}
    </div>
  )
}
