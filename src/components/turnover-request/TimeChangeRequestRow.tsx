'use client'

import { motion } from 'framer-motion'
import {
  BuildingOfficeIcon,
  UserCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline'
import { TimeAgo } from '@/components/dashboard/shared/TimeAgo'
import type { TimeChangeRequestListItem } from '@/services/types/timeChangeRequest'

interface TimeChangeRequestRowProps {
  request: TimeChangeRequestListItem
  canWrite: boolean
  isBusy: boolean
  onApprove: (request: TimeChangeRequestListItem) => void
  onReject: (request: TimeChangeRequestListItem) => void
}

/** Parse a 'YYYY-MM-DD' string as a local date (avoids the UTC off-by-one). */
function formatDate(value?: string | null): string {
  if (!value) return '—'
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Format a Postgres 'HH:MM:SS' time string as 'h:mm AM/PM'. */
function formatTime(value?: string | null): string | null {
  if (!value) return null
  const [hStr, mStr] = value.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (Number.isNaN(h) || Number.isNaN(m)) return value
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/** Compose a date + time range into a single human label, e.g. "Mon, Jun 2 · 10:00 AM – 1:00 PM". */
function composeWhen(date?: string | null, start?: string | null, end?: string | null): string {
  const datePart = formatDate(date)
  const startPart = formatTime(start)
  const endPart = formatTime(end)
  if (startPart && endPart) return `${datePart} · ${startPart} – ${endPart}`
  if (startPart) return `${datePart} · ${startPart}`
  return datePart
}

const STATUS_STYLES: Record<string, { pill: string; dot: string; label: string }> = {
  pending: { pill: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
  approved: { pill: 'bg-green-100 text-green-700', dot: 'bg-green-500', label: 'Approved' },
  rejected: { pill: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', label: 'Rejected' },
}

const TimeChangeRequestRow: React.FC<TimeChangeRequestRowProps> = ({
  request,
  canWrite,
  isBusy,
  onApprove,
  onReject,
}) => {
  const status = STATUS_STYLES[request.status] ?? STATUS_STYLES.pending
  const isPending = request.status === 'pending'

  const currentWhen = composeWhen(
    request.currentProjectDate,
    request.currentProjectStartTime,
    request.currentProjectEndTime,
  )
  const requestedWhen = composeWhen(
    request.requestedProjectDate,
    request.requestedProjectStartTime,
    request.requestedProjectEndTime,
  )

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
        {/* Left: who + what property */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${status.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
              {status.label}
            </span>
            <span className="text-xs text-gray-400">
              submitted <TimeAgo timestamp={request.createdAt} className="text-gray-500" />
            </span>
          </div>

          <div className="mt-3 flex items-start gap-2">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {request.propertyName || 'Unnamed property'}
              </p>
              {request.propertyAddress && (
                <p className="text-sm text-gray-500 truncate">{request.propertyAddress}</p>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <UserCircleIcon className="h-5 w-5 text-gray-400 shrink-0" />
            <span className="truncate">{request.cleanerName || 'Unknown cleaner'}</span>
          </div>

          {request.reason && (
            <div className="mt-3 flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
              <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="min-w-0">{request.reason}</p>
            </div>
          )}
        </div>

        {/* Middle: the before → after diff — the signature element */}
        <div className="flex items-center gap-3 lg:px-6">
          <div className="flex-1 lg:flex-none">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Current</p>
            <p className="text-sm text-gray-400 line-through decoration-gray-300">{currentWhen}</p>
          </div>
          <ArrowRightIcon className="h-5 w-5 text-blue-500 shrink-0" />
          <div className="flex-1 lg:flex-none">
            <p className="text-[11px] uppercase tracking-wide text-blue-500 font-semibold">Requested</p>
            <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1">
              <ClockIcon className="h-4 w-4 text-blue-500" />
              {requestedWhen}
            </p>
          </div>
        </div>

        {/* Right: actions (pending) or resolution detail (resolved) */}
        <div className="flex items-center lg:items-end lg:justify-end gap-2 lg:min-w-[180px]">
          {isPending && canWrite ? (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isBusy}
                onClick={() => onApprove(request)}
                className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                <CheckIcon className="h-4 w-4" />
                Approve
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isBusy}
                onClick={() => onReject(request)}
                className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                Reject
              </motion.button>
            </>
          ) : (
            <div className="text-right">
              {request.resolvedAt && (
                <p className="text-xs text-gray-400">
                  {request.status === 'approved' ? 'Approved' : 'Resolved'}{' '}
                  <TimeAgo timestamp={request.resolvedAt} className="text-gray-500" />
                </p>
              )}
              {request.pmNotes && (
                <p className="mt-1 text-sm text-gray-600 italic max-w-[220px]">“{request.pmNotes}”</p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default TimeChangeRequestRow
