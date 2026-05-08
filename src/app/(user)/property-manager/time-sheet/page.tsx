'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClockIcon } from '@heroicons/react/24/outline'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getMyTimeEntries } from '@/services/timeEntryService'
import type { MyTimeEntriesData, TimeEntry } from '@/services/types/timeEntry'
import ClockInCard from '@/components/dashboard/ClockInCard'
import EditTimeEntryModal from '@/components/time-entry/edit/EditTimeEntryModal'
import LogHoursModal from '@/components/time-entry/log/LogHoursModal'
import TimeSheetWeekView, { startOfWeek } from '@/components/time-entry/calendar/TimeSheetWeekView'

export default function TimeSheetPage() {
  const router = useRouter()
  const { isPM, isTeamMember } = usePermissions()
  const showNotification = useNotificationStore(s => s.showNotification)

  const [data, setData] = useState<MyTimeEntriesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<TimeEntry | null>(null)

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

  const handleEdited = (updated: TimeEntry) => {
    if (!data) return
    setData({
      ...data,
      entries: data.entries.map(e => e.id === updated.id ? updated : e),
      currentOpenEntry: updated.status === 'open'
        ? updated
        : data.currentOpenEntry?.id === updated.id ? null : data.currentOpenEntry,
    })
  }

  const handleSubmitted = (entry: TimeEntry) => {
    if (!data) return
    setData({ ...data, entries: [entry, ...data.entries] })
    setLogPrefill(null)
  }

  const handleDeleted = (entryId: string) => {
    setData(d => d ? { ...d, entries: d.entries.filter(e => e.id !== entryId) } : d)
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

      <ClockInCard
        data={data}
        entriesMode="all"
        onEntrySubmitted={handleSubmitted}
        onEntryClicked={setEditing}
      />

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

      <EditTimeEntryModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        entry={editing}
        onUpdate={handleEdited}
        onDelete={handleDeleted}
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
