'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/shared/modal'
import { submitTimeEntry } from '@/services/timeEntryService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { TimeEntry } from '@/services/types/timeEntry'

interface LogHoursModalProps {
  isOpen: boolean
  onClose: () => void
  /** Optional: pre-fill the date (yyyy-mm-dd). Defaults to today. */
  initialDate?: string
  /** Optional: pre-fill the start time (HH:mm). Empty by default. */
  initialStart?: string
  onSubmitted: (entry: TimeEntry) => void
}

/** yyyy-MM-dd in browser-local time. */
const todayIsoDate = (): string => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Unified "Log hours" modal — replaces both the old live Clock In/Out flow
 * and the BackfillTimeEntryModal. The team member picks a date, start time,
 * end time, optional notes, and submits. Every submission lands as
 * 'pending' on the backend (PM approves every entry); over-cap entries
 * additionally require a reason.
 */
const LogHoursModal: React.FC<LogHoursModalProps> = ({
  isOpen, onClose, initialDate, initialStart, onSubmitted,
}) => {
  const showNotification = useNotificationStore(s => s.showNotification)

  const [date,  setDate]  = useState('')
  const [start, setStart] = useState('')
  const [end,   setEnd]   = useState('')
  const [notes, setNotes] = useState('')
  const [overCapReason, setOverCapReason] = useState('')
  const [showOverCap, setShowOverCap] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setDate(initialDate || todayIsoDate())
    setStart(initialStart || '')
    setEnd('')
    setNotes('')
    setOverCapReason('')
    setShowOverCap(false)
    setLoading(false)
  }, [isOpen, initialDate, initialStart])

  const hoursPreview = useMemo(() => {
    if (!start || !end) return null as null | { ok: true; hours: number } | { ok: false }
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return null
    const startMin = sh * 60 + sm
    const endMin   = eh * 60 + em
    if (endMin <= startMin) return { ok: false } as const
    return { ok: true, hours: (endMin - startMin) / 60 } as const
  }, [start, end])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !start || !end) {
      showNotification('Pick a date and a start/end time.', 'error')
      return
    }
    if (hoursPreview && !hoursPreview.ok) {
      showNotification('End time must be after start time.', 'error')
      return
    }
    if (showOverCap && !overCapReason.trim()) {
      showNotification('Add a short reason for going over your weekly cap.', 'error')
      return
    }

    const startIso = new Date(`${date}T${start}`).toISOString()
    const endIso   = new Date(`${date}T${end}`).toISOString()

    setLoading(true)
    try {
      const res = await submitTimeEntry({
        startedAt: startIso,
        endedAt:   endIso,
        notes:     notes || undefined,
        overCapReason: showOverCap && overCapReason.trim() ? overCapReason.trim() : undefined,
      })
      if (res.status === 'success') {
        onSubmitted(res.data)
        showNotification('Hours submitted — sent to your manager for approval.', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Submission failed.', 'error')
      }
    } catch (err: any) {
      const msg = err?.message || 'Submission failed.'
      // Backend signals "needs over-cap reason" via 400 with the message.
      if (/over[- ]?cap|cap|weekly/i.test(msg)) {
        setShowOverCap(true)
        showNotification(msg, 'info')
      } else {
        showNotification(msg, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-lg">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Log hours</h2>
      <p className="text-sm text-gray-600 mb-4">
        Your manager reviews every entry before it counts toward your hours.
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

        {hoursPreview && (
          hoursPreview.ok ? (
            <div className="-mt-1 flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm">
              <span className="text-gray-600">Total time</span>
              <span className="font-semibold text-blue-700 tabular-nums">{hoursPreview.hours.toFixed(2)} hrs</span>
            </div>
          ) : (
            <div className="-mt-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              End time must be after start time. (Overnight shifts? Split into two entries for now.)
            </div>
          )
        )}

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

        {showOverCap && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for going over your weekly cap <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={overCapReason}
              onChange={(e) => setOverCapReason(e.target.value)}
              className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg"
              placeholder="Brief explanation for your manager"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default LogHoursModal
