'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClockIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getMyTimeEntries, deleteTimeEntry } from '@/services/timeEntryService'
import type { MyTimeEntriesData, TimeEntry, TimeEntryStatus } from '@/services/types/timeEntry'
import { formatLocalDate, formatLocalTime } from '@/lib/datetime'
import { formatHours, formatMoney } from '@/lib/format'
import ClockInCard from '@/components/dashboard/ClockInCard'
import EditTimeEntryModal from '@/components/time-entry/edit/EditTimeEntryModal'
import LogHoursModal from '@/components/time-entry/log/LogHoursModal'
import TimeSheetWeekView, { startOfWeek } from '@/components/time-entry/calendar/TimeSheetWeekView'

const STATUS_BADGE: Record<TimeEntryStatus, string> = {
  open:     'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  pending:  'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
}

const STATUS_LABEL: Record<TimeEntryStatus, string> = {
  open: 'Open', approved: 'Approved', pending: 'Pending', rejected: 'Rejected',
}

type RangeMode = 'this_week' | 'all'

export default function TimeSheetPage() {
  const router = useRouter()
  const { isPM, isTeamMember } = usePermissions()
  const showNotification = useNotificationStore(s => s.showNotification)

  const [data, setData] = useState<MyTimeEntriesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<TimeEntry | null>(null)
  const [range, setRange] = useState<RangeMode>('this_week')

  // Calendar week (Monday 00:00 in PM zone, as UTC instant). Initialized
  // once we have data so we know the timezone; null until then.
  const [weekStart, setWeekStart] = useState<Date | null>(null)

  // Page-level Log Hours modal (triggered by empty-slot clicks on the calendar)
  const [showLog, setShowLog] = useState(false)
  const [logPrefill, setLogPrefill] = useState<{ date: string; start: string } | null>(null)

  // PM lands here → bounce them to the admin view
  useEffect(() => {
    if (isPM) router.replace('/property-manager/team-time-sheet')
  }, [isPM, router])

  useEffect(() => {
    if (!isTeamMember) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await getMyTimeEntries()
        if (!cancelled && res.status === 'success') {
          setData(res.data)
          // Initialize the visible week to the current Monday in PM zone
          setWeekStart(startOfWeek(new Date(), res.data.teamMember.pmTimezone))
        }
      } catch (err: any) {
        if (!cancelled) showNotification(err?.message || 'Failed to load entries.', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isTeamMember, showNotification])

  // Filter entries to either the visible week (default) or all-time
  const filtered = useMemo(() => {
    if (!data) return []
    if (range === 'all' || !weekStart) return data.entries
    const start = weekStart.getTime()
    const end   = start + 7 * 86_400_000
    return data.entries.filter(e => {
      const ts = new Date(e.startedAt).getTime()
      return ts >= start && ts < end
    })
  }, [data, range, weekStart])

  const handleEdited = (updated: TimeEntry) => {
    if (!data) return
    setData({
      ...data,
      entries: data.entries.map(e => e.id === updated.id ? updated : e),
      currentOpenEntry: updated.status === 'open' ? updated : data.currentOpenEntry?.id === updated.id ? null : data.currentOpenEntry,
    })
  }

  const handleSubmitted = (entry: TimeEntry) => {
    if (!data) return
    setData({ ...data, entries: [entry, ...data.entries] })
    setLogPrefill(null)
  }

  const handleDelete = async (entry: TimeEntry) => {
    if (!confirm('Delete this time entry?')) return
    try {
      const res = await deleteTimeEntry(entry.id)
      if (res.status === 'success') {
        setData(d => d ? { ...d, entries: d.entries.filter(e => e.id !== entry.id) } : d)
        showNotification('Entry deleted.', 'success')
      } else {
        showNotification(res.message || 'Delete failed.', 'error')
      }
    } catch (err: any) {
      showNotification(err?.message || 'Delete failed.', 'error')
    }
  }

  const handleSlotClick = (date: string, start: string) => {
    setLogPrefill({ date, start })
    setShowLog(true)
  }

  if (!isTeamMember && !isPM) {
    return null
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClockIcon className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Sheet</h1>
          <p className="text-gray-500 text-sm">Log your hours and review your week.</p>
        </div>
      </div>

      <ClockInCard />

      {weekStart && (
        <TimeSheetWeekView
          entries={data.entries}
          timezone={data.teamMember.pmTimezone}
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          onEntryClick={setEditing}
          onSlotClick={handleSlotClick}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-gray-900">My entries</h2>
          <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
            {([['this_week', 'This week'], ['all', 'All time']] as Array<[RangeMode, string]>).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  range === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            {range === 'this_week' ? 'No entries for this week.' : 'No time entries yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Start</th>
                  <th className="px-6 py-3">End</th>
                  <th className="px-6 py-3">Hours</th>
                  <th className="px-6 py-3">Earned</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e) => {
                  const earned = e.hoursWorked != null && e.hourlyRateAtEntry != null
                    ? e.hoursWorked * e.hourlyRateAtEntry
                    : null
                  const locked = e.status === 'approved' || e.status === 'rejected'
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setEditing(e)}
                      className="hover:bg-blue-50/40 cursor-pointer"
                      title={locked ? 'View entry (read-only)' : 'Edit entry'}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">{formatLocalDate(e.startedAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatLocalTime(e.startedAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{e.endedAt ? formatLocalTime(e.endedAt) : <span className="text-blue-600 font-medium">Open</span>}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 tabular-nums">{e.hoursWorked != null ? formatHours(e.hoursWorked) : '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 tabular-nums">
                        {earned != null
                          ? formatMoney(earned, e.currencyAtEntry || data?.teamMember.currency || 'CAD')
                          : <span className="italic text-gray-400">Rate pending</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_BADGE[e.status]}`}>
                          {STATUS_LABEL[e.status]}
                        </span>
                        {e.status === 'rejected' && e.rejectionReason && (
                          <div className="mt-1 text-xs text-rose-600 italic">{e.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                          <button
                            onClick={() => setEditing(e)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            title={locked ? 'Locked — view only' : 'Edit'}
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          {!locked && (
                            <button
                              onClick={() => handleDelete(e)}
                              className="p-1.5 rounded-md text-gray-500 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditTimeEntryModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        entry={editing}
        onUpdate={handleEdited}
        onDelete={(entryId) => {
          setData(d => d ? { ...d, entries: d.entries.filter(e => e.id !== entryId) } : d)
        }}
      />

      <LogHoursModal
        isOpen={showLog}
        onClose={() => { setShowLog(false); setLogPrefill(null) }}
        initialDate={logPrefill?.date}
        initialStart={logPrefill?.start}
        onSubmitted={handleSubmitted}
      />
    </div>
  )
}
