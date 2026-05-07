'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/shared/modal'
import { updateTimeEntry, deleteTimeEntry } from '@/services/timeEntryService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import type { TimeEntry, UpdateTimeEntryPayload } from '@/services/types/timeEntry'

interface EditTimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  entry: TimeEntry | null
  onUpdate: (updated: TimeEntry) => void
  /** Optional: invoked after a successful delete so the parent can drop the entry from its list. */
  onDelete?: (entryId: string) => void
  /** Set of currencies allowed in the rate-snapshot field (PM-only). */
  pmEditMode?: boolean
}

/**
 * Convert an ISO instant to the local "datetime-local" input value
 * (yyyy-MM-ddTHH:mm). Times shown in the viewer's browser zone.
 */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fromLocalInput = (value: string): string | null => {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

const EditTimeEntryModal: React.FC<EditTimeEntryModalProps> = ({
  isOpen, onClose, entry, onUpdate, onDelete, pmEditMode = false,
}) => {
  const showNotification = useNotificationStore(s => s.showNotification)
  const { isPM } = usePermissions()

  const [startedAt, setStartedAt] = useState('')
  const [endedAt,   setEndedAt]   = useState('')
  const [notes,     setNotes]     = useState('')
  const [overCapReason, setOverCapReason] = useState('')
  const [hourlyRate, setHourlyRate] = useState<string>('')
  const [showOverCap, setShowOverCap] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Locked: team member viewing an approved/rejected entry → read-only
  const locked = !isPM && entry && (entry.status === 'approved' || entry.status === 'rejected')

  useEffect(() => {
    if (!isOpen || !entry) return
    setStartedAt(toLocalInput(entry.startedAt))
    setEndedAt(toLocalInput(entry.endedAt))
    setNotes(entry.notes || '')
    setOverCapReason(entry.pendingReason || '')
    setShowOverCap(entry.status === 'pending' && entry.pendingKind === 'over_cap')
    setHourlyRate(entry.hourlyRateAtEntry != null ? String(entry.hourlyRateAtEntry) : '')
  }, [isOpen, entry])

  const hoursPreview = useMemo(() => {
    if (!startedAt || !endedAt) return null as null | { ok: true; hours: number } | { ok: false }
    const startMs = new Date(startedAt).getTime()
    const endMs   = new Date(endedAt).getTime()
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null
    if (endMs <= startMs) return { ok: false } as const
    return { ok: true, hours: (endMs - startMs) / (1000 * 60 * 60) } as const
  }, [startedAt, endedAt])

  if (!entry) return null

  const handleDelete = async () => {
    if (!entry || !onDelete) return
    if (!confirm('Delete this time entry? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await deleteTimeEntry(entry.id)
      if (res.status === 'success') {
        onDelete(entry.id)
        showNotification('Entry deleted.', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Delete failed.', 'error')
      }
    } catch (err: any) {
      showNotification(err?.message || 'Delete failed.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (locked) {
      showNotification('Approved entries can only be edited by your manager.', 'error')
      return
    }
    const startIso = fromLocalInput(startedAt)
    if (!startIso) {
      showNotification('Start time is required.', 'error')
      return
    }
    const endIso = endedAt ? fromLocalInput(endedAt) : null
    if (endedAt && !endIso) {
      showNotification('Invalid end time.', 'error')
      return
    }
    if (endIso && new Date(endIso) <= new Date(startIso)) {
      showNotification('End time must be after start time.', 'error')
      return
    }

    setLoading(true)
    try {
      const payload: UpdateTimeEntryPayload = {
        startedAt: startIso,
        endedAt: endIso,
        notes: notes || null,
      }
      if (showOverCap && overCapReason.trim()) {
        payload.overCapReason = overCapReason.trim()
      }
      if (pmEditMode && isPM && hourlyRate !== '') {
        const num = Number(hourlyRate)
        if (Number.isFinite(num) && num >= 0) {
          payload.hourlyRateAtEntry = num
        }
      }

      const res = await updateTimeEntry(entry.id, payload)
      if (res.status === 'success') {
        onUpdate(res.data)
        showNotification('Time entry updated.', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Update failed.', 'error')
      }
    } catch (err: any) {
      // 400 indicates over-cap requires a reason — surface and keep modal open
      const msg = err?.message || 'Update failed.'
      if (/over[- ]?cap|approval/i.test(msg)) {
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
      <h2 className="text-xl font-semibold mb-1 text-gray-900">Edit time entry</h2>
      {locked && (
        <div className="mt-2 mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          This entry has been {entry.status} — only your manager can edit it.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
          <input
            type="datetime-local"
            disabled={!!locked}
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End {entry.status === 'open' && <span className="text-xs text-gray-500">(leave blank to stay clocked in)</span>}
          </label>
          <input
            type="datetime-local"
            disabled={!!locked}
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-60"
          />
        </div>

        {hoursPreview && (
          hoursPreview.ok ? (
            <div className="-mt-1 flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm">
              <span className="text-gray-600">Total time</span>
              <span className="font-semibold text-blue-700 tabular-nums">{hoursPreview.hours.toFixed(2)} hrs</span>
            </div>
          ) : (
            <div className="-mt-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              End time must be after start time.
            </div>
          )
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            disabled={!!locked}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-60"
            placeholder="What did you work on?"
          />
        </div>

        {showOverCap && !locked && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for going over your weekly cap <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={overCapReason}
              onChange={(e) => setOverCapReason(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              placeholder="Brief explanation for your manager"
            />
          </div>
        )}

        {pmEditMode && isPM && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly rate snapshot ({entry.currencyAtEntry || 'CAD'})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              placeholder="e.g. 25.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use this to set the rate retroactively on entries that were submitted before you configured it.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          {/* Delete (left) — only shown when caller wired onDelete and entry is editable */}
          <div>
            {!locked && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || deleting}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>

          {/* Cancel + Save (right) */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || deleting}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              {locked ? 'Close' : 'Cancel'}
            </button>
            {!locked && (
              <button
                type="submit"
                disabled={loading || deleting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default EditTimeEntryModal
