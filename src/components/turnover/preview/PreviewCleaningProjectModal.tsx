'use client'

import { useTranslation } from 'react-i18next'
import {
  XMarkIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ClockIcon,
  HomeIcon,
  UserCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { getStatusDisplay, formatDuration } from '@/services/cleaningProjectService'
import type { CleaningProject } from '@/services/types/cleaningProject'
import { parseLocalDate } from '@/utils/dateUtils'
import { isReservedName } from '@/utils/bookingUtils'
import type { EntityRef } from '@/components/audit/auditFieldRegistry'

interface Props {
  isOpen?: boolean
  onClose: () => void
  project: CleaningProject
  embedded?: boolean
  zIndex?: number
  onOpenEntity?: (ref: EntityRef) => void
}

const STATUS_BG: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  purple: 'bg-purple-100 text-purple-800',
  green: 'bg-green-100 text-green-800',
  gray: 'bg-gray-100 text-gray-800',
}

function formatDate(d?: string | null) {
  if (!d) return null
  return parseLocalDate(d).toLocaleDateString('en-CA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatShortDate(d?: string | null) {
  if (!d) return null
  return parseLocalDate(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function formatDateRange(start?: string | null, end?: string | null) {
  const s = formatShortDate(start)
  const e = formatShortDate(end)
  if (s && e) return `${s} → ${e}`
  return s || e || null
}

function BookingRefCard({ bookingId, guestName, checkIn, checkOut, onClick }: {
  bookingId: string
  guestName?: string | null
  checkIn?: string | null
  checkOut?: string | null
  onClick?: () => void
}) {
  const guestDisplay = guestName && !isReservedName(guestName) ? guestName : 'Reserved booking'
  const dateRange = formatDateRange(checkIn, checkOut)
  const title = dateRange ? `${guestDisplay} · ${dateRange}` : guestDisplay

  const body = (
    <>
      <CalendarDaysIcon className="h-4 w-4 text-sky-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-900 truncate">{title}</div>
        <div className="text-[11px] text-gray-500 font-mono">#{bookingId.slice(0, 6)}</div>
      </div>
      {onClick && (
        <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      )}
    </>
  )

  if (!onClick) {
    return <div className="flex items-center gap-2 px-2 py-1.5 -mx-2">{body}</div>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-md hover:bg-sky-50 hover:ring-1 hover:ring-sky-200 transition-all cursor-pointer text-left w-full"
    >
      {body}
    </button>
  )
}

function Row({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">{label}</div>
        <div className="text-sm text-gray-900 mt-0.5 break-words">{value || <span className="text-gray-400">—</span>}</div>
      </div>
    </div>
  )
}

export default function PreviewCleaningProjectModal({
  isOpen = true,
  onClose,
  project,
  embedded = false,
  zIndex,
  onOpenEntity,
}: Props) {
  const { t } = useTranslation('audit')
  const statusDisplay = getStatusDisplay(project.status)

  const inner = (
    <div className="relative flex flex-col">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer z-10"
        aria-label={t('tombstone.close')}
      >
        <XMarkIcon className="h-5 w-5" />
      </button>

      <header className="px-5 py-4 border-b border-gray-200 bg-gradient-to-br from-emerald-50/40 to-white">
        <div className="flex items-center gap-2 text-emerald-700">
          <SparklesIcon className="h-5 w-5" />
          <h2 className="text-base font-semibold">{t('cleaningProjectPreview.title')}</h2>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_BG[statusDisplay.color] || 'bg-gray-100 text-gray-800'}`}>
            {statusDisplay.label}
          </span>
          <span className="text-[11px] text-gray-500 font-mono truncate">{project.id.slice(0, 8)}</span>
        </div>
      </header>

      <div className="px-5 py-3">
        <div className="divide-y divide-gray-100">
          <Row
            icon={CalendarDaysIcon}
            label={t('cleaningProjectPreview.projectDate')}
            value={formatDate(project.projectDate)}
          />
          {(project.projectStartTime || project.projectEndTime) && (
            <Row
              icon={ClockIcon}
              label={t('cleaningProjectPreview.window')}
              value={`${project.projectStartTime?.slice(0, 5) ?? '?'} – ${project.projectEndTime?.slice(0, 5) ?? '?'}${project.estimatedDurationMinutes ? ` (${formatDuration(project.estimatedDurationMinutes)})` : ''}`}
            />
          )}
          <Row
            icon={HomeIcon}
            label={t('cleaningProjectPreview.property')}
            value={project.propertyName || <span className="font-mono text-xs text-gray-500">{project.propertyId.slice(0, 8)}</span>}
          />
          <Row
            icon={UserCircleIcon}
            label={t('cleaningProjectPreview.cleaner')}
            value={project.cleanerName || (project.cleanerId ? <span className="font-mono text-xs text-gray-500">{project.cleanerId.slice(0, 8)}</span> : null)}
          />
          <Row
            icon={ArrowLeftIcon}
            label={t('cleaningProjectPreview.previousBooking')}
            value={project.previousBookingId ? (
              <BookingRefCard
                bookingId={project.previousBookingId}
                guestName={project.previousBookingGuestName}
                checkIn={project.previousBookingCheckIn}
                checkOut={project.previousBookingCheckOut}
                onClick={onOpenEntity ? () => onOpenEntity({ entityType: 'booking', entityId: project.previousBookingId! }) : undefined}
              />
            ) : null}
          />
          <Row
            icon={ArrowRightIcon}
            label={t('cleaningProjectPreview.nextBooking')}
            value={project.nextBookingId ? (
              <BookingRefCard
                bookingId={project.nextBookingId}
                guestName={project.nextBookingGuestName}
                checkIn={project.nextBookingCheckIn}
                checkOut={project.nextBookingCheckOut}
                onClick={onOpenEntity ? () => onOpenEntity({ entityType: 'booking', entityId: project.nextBookingId! }) : undefined}
              />
            ) : null}
          />
          {project.pmNotes && (
            <Row icon={DocumentTextIcon} label={t('cleaningProjectPreview.pmNotes')} value={project.pmNotes} />
          )}
          {project.cleanerNotes && (
            <Row icon={DocumentTextIcon} label={t('cleaningProjectPreview.cleanerNotes')} value={project.cleanerNotes} />
          )}
          <Row icon={SparklesIcon} label={t('cleaningProjectPreview.source')} value={project.source} />
        </div>
      </div>
    </div>
  )

  if (embedded) return inner

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      style="p-0 max-w-md w-11/12 !max-h-[85vh] !overflow-y-auto"
      zIndex={zIndex}
    >
      {inner}
    </Modal>
  )
}
