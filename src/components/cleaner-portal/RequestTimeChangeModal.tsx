'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import TimeSelect, { roundToNearest15 } from '@/components/shared/TimeSelect'
import { submitTimeChangeRequest } from '@/services/timeChangeRequestService'
import { formatTime } from '@/services/cleaningProjectService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { ClockIcon } from '@heroicons/react/24/outline'
import type { CleaningProject } from '@/services/types/cleaningProject'

interface RequestTimeChangeModalProps {
  isOpen: boolean
  onClose: () => void
  project: CleaningProject
  cleanerId: string
  onSubmitted: () => void
}

export default function RequestTimeChangeModal({
  isOpen,
  onClose,
  project,
  cleanerId,
  onSubmitted,
}: RequestTimeChangeModalProps) {
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [scheduledDate, setScheduledDate] = useState('')
  const [checkoutTime, setCheckoutTime] = useState('')
  const [checkinTime, setCheckinTime] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const dateStr = project.scheduledDate.split('T')[0]
      setScheduledDate(dateStr)
      setCheckoutTime(project.checkoutTime ? roundToNearest15(project.checkoutTime) : '')
      setCheckinTime(project.checkinTime ? roundToNearest15(project.checkinTime) : '')
      setReason('')
      setLoading(false)
    }
  }, [isOpen, project])

  const handleSubmit = async () => {
    if (!scheduledDate) {
      showNotification('Please select a date', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await submitTimeChangeRequest(project.id, {
        cleanerId,
        requestedScheduledDate: scheduledDate,
        requestedCheckoutTime: checkoutTime || null,
        requestedCheckinTime: checkinTime || null,
        reason: reason.trim() || undefined,
      })

      if (res.status === 'success') {
        showNotification('Time change request submitted', 'success')
        onSubmitted()
        onClose()
      } else {
        showNotification(res.message || 'Failed to submit request', 'error')
      }
    } catch (err) {
      console.error('Error submitting time change request:', err)
      showNotification(
        err instanceof Error ? err.message : 'Error submitting request',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} closable={!loading}>
      <div className="p-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Request Time Change</h2>
            <p className="text-sm text-gray-500">{project.propertyName}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Current: {project.scheduledDate.split('T')[0]}
            </p>
          </div>

          {/* Checkout Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Checkout Time
            </label>
            <TimeSelect
              value={checkoutTime}
              onChange={setCheckoutTime}
              placeholder="Select checkout time"
            />
            <p className="text-xs text-gray-400 mt-1">
              Current: {formatTime(project.checkoutTime) || 'Not set'}
            </p>
          </div>

          {/* Checkin Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Check-in Time
            </label>
            <TimeSelect
              value={checkinTime}
              onChange={setCheckinTime}
              placeholder="Select check-in time"
            />
            <p className="text-xs text-gray-400 mt-1">
              Current: {formatTime(project.checkinTime) || 'Not set'}
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need this change?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !scheduledDate}
            className={`
              flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 cursor-pointer
              ${loading || !scheduledDate
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-amber-500 text-white hover:bg-amber-600'
              }
            `}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
