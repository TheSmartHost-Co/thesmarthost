'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/shared/modal'
import { backfillTimeEntry } from '@/services/timeEntryService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { TimeEntry } from '@/services/types/timeEntry'

interface BackfillTimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (entry: TimeEntry) => void
}

/** Default the date to today, times empty so the team member must fill them in. */
const todayIsoDate = (): string => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const BackfillTimeEntryModal: React.FC<BackfillTimeEntryModalProps> = ({
  isOpen, onClose, onAdd,
}) => {
  const showNotification = useNotificationStore(s => s.showNotification)

  const [date,    setDate]    = useState('')
  const [start,   setStart]   = useState('')
  const [end,     setEnd]     = useState('')
  const [reason,  setReason]  = useState('')
  const [notes,   setNotes]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDate(todayIsoDate())
      setStart('')
      setEnd('')
      setReason('')
      setNotes('')
      setLoading(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !start || !end) {
      showNotification('Pick a date and a start/end time.', 'error')
      return
    }
    if (!reason.trim()) {
      showNotification('A reason is required for past shifts.', 'error')
      return
    }

    const startIso = new Date(`${date}T${start}`).toISOString()
    const endIso   = new Date(`${date}T${end}`).toISOString()
    if (new Date(endIso) <= new Date(startIso)) {
      showNotification('End time must be after start time.', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await backfillTimeEntry({
        startedAt: startIso,
        endedAt:   endIso,
        notes:     notes || undefined,
        backfillReason: reason.trim(),
      })
      if (res.status === 'success') {
        onAdd(res.data)
        showNotification('Submitted to your manager for approval.', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Submission failed.', 'error')
      }
    } catch (err: any) {
      showNotification(err?.message || 'Submission failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-lg">
      <h2 className="text-xl font-semibold mb-1 text-gray-900">Log a past shift</h2>
      <p className="text-sm text-gray-600 mb-4">
        Past shifts are sent to your manager for approval before counting toward your hours.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayIsoDate()}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <HoursDelta start={start} end={end} />


        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Why is this being added late? <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            placeholder="e.g. Forgot to clock in this morning"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            placeholder="What did you work on?"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Submitting…' : 'Submit for approval'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Live preview of the hours between Start and End. Returns null until both
 * are filled, a warning when end <= start (no overnight roll-over yet), and
 * a friendly summary otherwise.
 */
const HoursDelta: React.FC<{ start: string; end: string }> = ({ start, end }) => {
  const result = useMemo(() => {
    if (!start || !end) return null as null | { ok: true; hours: number } | { ok: false }
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return null
    const startMin = sh * 60 + sm
    const endMin   = eh * 60 + em
    if (endMin <= startMin) return { ok: false } as const
    return { ok: true, hours: (endMin - startMin) / 60 } as const
  }, [start, end])

  if (!result) return null
  if (!result.ok) {
    return (
      <div className="-mt-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
        End time must be after start time. (Overnight shifts? Split into two entries for now.)
      </div>
    )
  }
  return (
    <div className="-mt-1 flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm">
      <span className="text-gray-600">Total time</span>
      <span className="font-semibold text-blue-700 tabular-nums">{result.hours.toFixed(2)} hrs</span>
    </div>
  )
}

export default BackfillTimeEntryModal
