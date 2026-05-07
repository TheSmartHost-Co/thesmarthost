'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/shared/modal'
import { exportPayrollCsv, downloadCsvBlob } from '@/services/timeEntryService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { TeamTimeSummaryRow } from '@/services/types/timeEntry'
import { isoDateInTz } from '@/lib/datetime'

interface ExportPayrollModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  pmTimezone: string
  teamMembers: Array<Pick<TeamTimeSummaryRow, 'teamMemberId' | 'teamMemberName'>>
}

type Preset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'

/** Date-range presets — interpreted in PM's timezone. */
function rangeForPreset(preset: Preset, tz: string): { start: string; end: string } {
  const now = new Date()
  switch (preset) {
    case 'this_week': {
      const start = mondayInTz(now, tz, 0)
      const end   = mondayInTz(now, tz, 1)
      return rangeStrings(start, end, tz)
    }
    case 'last_week': {
      const start = mondayInTz(now, tz, -1)
      const end   = mondayInTz(now, tz, 0)
      return rangeStrings(start, end, tz)
    }
    case 'this_month': {
      return monthRange(now, 0, tz)
    }
    case 'last_month': {
      return monthRange(now, -1, tz)
    }
    case 'custom':
    default:
      return rangeStrings(now, now, tz)
  }
}

function mondayInTz(d: Date, tz: string, weekOffset: number): Date {
  const ymd = isoDateInTz(d, tz)
  const [y, m, day] = ymd.split('-').map(Number)
  // Use local-time math for day-of-week (best-effort; OK for week boundaries)
  const tmp = new Date(Date.UTC(y, m - 1, day))
  const jsDow = tmp.getUTCDay() // 0=Sun..6=Sat
  const isoDow = (jsDow + 6) % 7 // 0=Mon..6=Sun
  const monday = new Date(tmp.getTime() - isoDow * 86_400_000 + weekOffset * 7 * 86_400_000)
  return monday
}

function monthRange(now: Date, offset: number, tz: string): { start: string; end: string } {
  const ymd = isoDateInTz(now, tz)
  const [y, m] = ymd.split('-').map(Number)
  const startMonth = new Date(Date.UTC(y, m - 1 + offset, 1))
  const endMonth   = new Date(Date.UTC(y, m + offset, 1))
  // Display range is inclusive; we send the last "calendar day" as endDate-1 day
  // because the backend interprets endDate as 00:00 PM-zone next day already.
  // For UX clarity, send the last day of month as endDate.
  const endLastDay = new Date(endMonth.getTime() - 86_400_000)
  return rangeStrings(startMonth, endLastDay, tz)
}

function rangeStrings(start: Date, end: Date, tz: string): { start: string; end: string } {
  return { start: isoDateInTz(start, tz), end: isoDateInTz(end, tz) }
}

const ExportPayrollModal: React.FC<ExportPayrollModalProps> = ({
  isOpen, onClose, userId, pmTimezone, teamMembers,
}) => {
  const showNotification = useNotificationStore(s => s.showNotification)
  const [preset, setPreset] = useState<Preset>('this_week')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [teamMemberId, setTeamMemberId] = useState('')
  const [includePending, setIncludePending] = useState(false)
  const [loading, setLoading] = useState(false)

  // When preset changes, recompute start/end (custom = leave as-is)
  useEffect(() => {
    if (!isOpen) return
    if (preset !== 'custom') {
      const r = rangeForPreset(preset, pmTimezone)
      setStart(r.start)
      setEnd(r.end)
    }
  }, [preset, pmTimezone, isOpen])

  // Initial open: default to "this week"
  useEffect(() => {
    if (isOpen) {
      setPreset('this_week')
      setTeamMemberId('')
      setIncludePending(false)
    }
  }, [isOpen])

  const summary = useMemo(() => {
    if (!start || !end) return ''
    return `${start} → ${end}`
  }, [start, end])

  const handleDownload = async () => {
    if (!start || !end) {
      showNotification('Pick a date range.', 'error')
      return
    }
    setLoading(true)
    try {
      const { blob, filename } = await exportPayrollCsv({
        userId,
        startDate: start,
        endDate: end,
        teamMemberId: teamMemberId || undefined,
        includePending,
      })
      downloadCsvBlob(blob, filename)
      showNotification('Payroll CSV downloaded.', 'success')
      onClose()
    } catch (err: any) {
      showNotification(err?.message || 'Export failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-lg">
      <h2 className="text-xl font-semibold mb-1 text-gray-900">Export payroll CSV</h2>
      <p className="text-sm text-gray-600 mb-4">
        Dates are interpreted in your timezone ({pmTimezone}).
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Range</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['this_week',  'This week'],
              ['last_week',  'Last week'],
              ['this_month', 'This month'],
              ['last_month', 'Last month'],
              ['custom',     'Custom'],
            ] as Array<[Preset, string]>).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPreset(k)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                  preset === k
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => { setPreset('custom'); setStart(e.target.value) }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
            <input
              type="date"
              value={end}
              onChange={(e) => { setPreset('custom'); setEnd(e.target.value) }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Team member (optional)</label>
          <select
            value={teamMemberId}
            onChange={(e) => setTeamMemberId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <option value="">All team members</option>
            {teamMembers.map(m => (
              <option key={m.teamMemberId} value={m.teamMemberId}>{m.teamMemberName}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={includePending}
            onChange={(e) => setIncludePending(e.target.checked)}
            className="rounded border-gray-300"
          />
          Include pending entries
        </label>

        {summary && <div className="text-xs text-gray-500">Range: {summary}</div>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleDownload} disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Preparing…' : 'Download CSV'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ExportPayrollModal
