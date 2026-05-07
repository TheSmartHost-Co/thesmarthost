'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ClockIcon, ArrowRightIcon, PlusIcon } from '@heroicons/react/24/outline'
import { getMyTimeEntries } from '@/services/timeEntryService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { MyTimeEntriesData, TimeEntry } from '@/services/types/timeEntry'
import { startOfWeekInTz } from '@/lib/datetime'
import { formatHours } from '@/lib/format'
import LogHoursModal from '@/components/time-entry/log/LogHoursModal'

/**
 * Dashboard card for team members. The unified "Log hours" model
 * replaces the live clock-in/out timer: a single primary button opens
 * the LogHoursModal where the team member specifies start/end times.
 *
 * The component name "ClockInCard" is kept (for callsite stability)
 * even though the UX is now log-based.
 */
const ClockInCard: React.FC = () => {
  const showNotification = useNotificationStore(s => s.showNotification)
  const [data, setData] = useState<MyTimeEntriesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLog, setShowLog] = useState(false)

  const loadData = async () => {
    try {
      const res = await getMyTimeEntries()
      if (res.status === 'success') setData(res.data)
    } catch (err) {
      // 403 means the caller isn't a team member — silently hide
      console.warn('ClockInCard: getMyTimeEntries failed', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const onSubmitted = (entry: TimeEntry) => {
    // Optimistically prepend so the user sees their entry immediately.
    setData((d) => d ? { ...d, entries: [entry, ...d.entries] } : d)
    // Refresh in the background to pull the canonical state.
    loadData()
    showNotification('Submitted for approval.', 'success')
  }

  // Hours this week (approved + pending) in PM's zone
  const hoursThisWeek = useMemo(() => {
    if (!data) return 0
    const tz = data.teamMember.pmTimezone
    const start = startOfWeekInTz(new Date(), tz).getTime()
    const end   = start + 7 * 86_400_000
    let total = 0
    for (const e of data.entries) {
      if (e.status !== 'approved' && e.status !== 'pending') continue
      if (e.hoursWorked == null) continue
      const ts = new Date(e.startedAt).getTime()
      if (ts >= start && ts < end) total += e.hoursWorked
    }
    return total
  }, [data])

  const cap = data?.teamMember.weeklyMaxHours ?? null
  const progressPct = cap ? Math.min(100, Math.round((hoursThisWeek / cap) * 100)) : 0
  const progressColor =
    progressPct >= 100 ? 'bg-rose-500' :
    progressPct >= 80  ? 'bg-amber-400' :
                          'bg-emerald-500'

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-1/3 bg-gray-200 rounded mb-4" />
        <div className="h-12 w-40 bg-gray-200 rounded" />
      </div>
    )
  }

  // Not a team member with a record → don't render
  if (!data) return null

  const rateUnset = data.teamMember.hourlyRate == null
  const recent = data.entries.slice(0, 3)

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {rateUnset && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            Your hourly rate hasn&rsquo;t been set yet. Your manager will configure it; in the meantime,
            log your hours and they&rsquo;ll be approved as usual.
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
              <ClockIcon className="w-4 h-4" />
              <span>Time Sheet</span>
            </div>
            <h3 className="mt-1 text-2xl font-semibold text-gray-900">Log your hours</h3>
            <p className="mt-1 text-sm text-gray-500">
              Pick a date and your start/end times — your manager reviews each entry.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowLog(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold shadow-sm
                       bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <PlusIcon className="w-5 h-5" />
            Log hours
          </button>
        </div>

        {/* Weekly progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">This week (approved + pending)</span>
            <span className="text-gray-900 font-semibold tabular-nums">
              {formatHours(hoursThisWeek)}
              {cap != null && <span className="text-gray-500 font-normal"> / {cap.toFixed(2)} hrs</span>}
            </span>
          </div>
          <div className="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColor} transition-all`}
              style={{ width: cap ? `${progressPct}%` : '0%' }}
            />
          </div>
        </div>

        {/* Recent entries (3 most recent) */}
        {recent.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent</div>
            <ul className="space-y-1.5">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    {new Date(e.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' · '}
                    <span className="text-gray-500">{e.hoursWorked != null ? formatHours(e.hoursWorked) : '—'}</span>
                  </span>
                  <StatusPill status={e.status} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end text-sm">
          <Link
            href="/property-manager/time-sheet"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
          >
            View time sheet <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <LogHoursModal
        isOpen={showLog}
        onClose={() => setShowLog(false)}
        onSubmitted={onSubmitted}
      />
    </>
  )
}

const StatusPill: React.FC<{ status: TimeEntry['status'] }> = ({ status }) => {
  const cls = {
    open:     'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    pending:  'bg-amber-100 text-amber-700',
    rejected: 'bg-rose-100 text-rose-700',
  }[status]
  const label = { open: 'Open', approved: 'Approved', pending: 'Pending', rejected: 'Rejected' }[status]
  return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${cls}`}>{label}</span>
}

export default ClockInCard
