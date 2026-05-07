'use client'

import React, { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import { approveTimeEntry, rejectTimeEntry } from '@/services/timeEntryService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { TimeEntry } from '@/services/types/timeEntry'
import { formatHours } from '@/lib/format'
import { formatInTz } from '@/lib/datetime'

interface ReviewOverCapModalProps {
  isOpen: boolean
  onClose: () => void
  entry: TimeEntry | null
  pmTimezone: string
  onResolved: (updated: TimeEntry) => void
}

const ReviewOverCapModal: React.FC<ReviewOverCapModalProps> = ({
  isOpen, onClose, entry, pmTimezone, onResolved,
}) => {
  const showNotification = useNotificationStore(s => s.showNotification)
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDecision(null)
      setReason('')
      setLoading(false)
    }
  }, [isOpen])

  if (!entry) return null

  const handleApprove = async () => {
    setLoading(true)
    try {
      const res = await approveTimeEntry(entry.id)
      if (res.status === 'success') {
        onResolved(res.data)
        showNotification('Approved.', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Approve failed.', 'error')
      }
    } catch (err: any) {
      showNotification(err?.message || 'Approve failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!reason.trim()) {
      showNotification('A short reason is required when rejecting.', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await rejectTimeEntry(entry.id, { rejectionReason: reason.trim() })
      if (res.status === 'success') {
        onResolved(res.data)
        showNotification('Rejected.', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Reject failed.', 'error')
      }
    } catch (err: any) {
      showNotification(err?.message || 'Reject failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const kindLabel = entry.pendingKind === 'backfill' ? 'Past-shift submission' : 'Over-cap request'
  const kindBadge = entry.pendingKind === 'backfill'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-amber-100 text-amber-700'

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-lg">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-semibold text-gray-900">Review entry</h2>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${kindBadge}`}>
          {kindLabel}
        </span>
      </div>

      <div className="mt-3 mb-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm">
        <div><span className="text-gray-500">Team member:</span> <span className="font-medium">{entry.teamMemberName}</span></div>
        <div><span className="text-gray-500">Hours:</span> <span className="font-medium">{formatHours(entry.hoursWorked)}</span></div>
        <div><span className="text-gray-500">Start:</span> <span className="font-medium">{formatInTz(entry.startedAt, pmTimezone)}</span></div>
        <div><span className="text-gray-500">End:</span> <span className="font-medium">{formatInTz(entry.endedAt, pmTimezone)}</span></div>
        {entry.pendingReason && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <span className="text-gray-500">Reason given:</span>
            <p className="mt-1 italic text-gray-700">&ldquo;{entry.pendingReason}&rdquo;</p>
          </div>
        )}
      </div>

      {decision !== 'reject' ? (
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={() => setDecision('reject')} disabled={loading}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">
            Reject…
          </button>
          <button type="button" onClick={handleApprove} disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {loading ? 'Approving…' : 'Approve'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              placeholder="The team member will see this."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDecision(null)} disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50">
              Back
            </button>
            <button type="button" onClick={handleReject} disabled={loading}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">
              {loading ? 'Rejecting…' : 'Confirm reject'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default ReviewOverCapModal
