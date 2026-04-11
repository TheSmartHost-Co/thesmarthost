'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { PendingDrop, ProjectDragData, BookingDragData, InvalidDropInfo } from './types'

interface ConfirmDragModalProps {
  isOpen: boolean
  pendingDrop: PendingDrop | null
  onConfirm: () => Promise<void>
  onCancel: () => void
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function ConfirmDragModal({
  isOpen,
  pendingDrop,
  onConfirm,
  onCancel,
}: ConfirmDragModalProps) {
  const { t } = useTranslation('turnover')
  const [loading, setLoading] = useState(false)

  if (!pendingDrop) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  const getDescription = () => {
    if (pendingDrop.item.type === 'booking') {
      const booking = (pendingDrop.item as BookingDragData).booking
      return (
        <div className="space-y-2">
          <p className="text-gray-700">
            Move <span className="font-semibold">{booking.guestName}</span> booking
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">{formatDate(pendingDrop.sourceDate)}</span>
            <span>&rarr;</span>
            <span className="bg-blue-50 px-2 py-1 rounded text-blue-700 font-medium">{formatDate(pendingDrop.targetDate)}</span>
          </div>
          <p className="text-xs text-gray-400">
            Duration ({booking.numNights} night{booking.numNights !== 1 ? 's' : ''}) will be preserved.
          </p>
        </div>
      )
    }

    const project = (pendingDrop.item as ProjectDragData).project
    const isReassign = pendingDrop.targetCleanerId !== undefined

    if (isReassign) {
      const cleanerName = pendingDrop.targetCleanerName || (pendingDrop.targetCleanerId ? 'another cleaner' : 'Unassigned')
      return (
        <div className="space-y-2">
          <p className="text-gray-700">
            Reassign cleaning for <span className="font-semibold">{project.propertyName || 'property'}</span>
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">{formatDate(pendingDrop.sourceDate)}</span>
            <span>&rarr;</span>
            <span className="bg-blue-50 px-2 py-1 rounded text-blue-700 font-medium">{formatDate(pendingDrop.targetDate)}</span>
          </div>
          <p className="text-sm text-gray-500">
            Assigned to: <span className="font-medium text-indigo-600">{cleanerName}</span>
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <p className="text-gray-700">
          Reschedule cleaning for <span className="font-semibold">{project.propertyName || 'property'}</span>
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="bg-gray-100 px-2 py-1 rounded">{formatDate(pendingDrop.sourceDate)}</span>
          <span>&rarr;</span>
          <span className="bg-blue-50 px-2 py-1 rounded text-blue-700 font-medium">{formatDate(pendingDrop.targetDate)}</span>
        </div>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} style="w-full max-w-md p-6" zIndex={70}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('confirmMove')}</h3>
        {getDescription()}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {t('confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

interface InvalidDropModalProps {
  isOpen: boolean
  info: InvalidDropInfo | null
  onClose: () => void
}

export function InvalidDropModal({ isOpen, info, onClose }: InvalidDropModalProps) {
  const { t } = useTranslation('turnover')
  if (!info) return null

  let message: string
  let title: string
  switch (info.reason) {
    case 'past_date':
      message = 'Cannot reschedule to a date in the past.'
      title = 'Invalid Date'
      break
    case 'before_checkout':
      message = `This cleaning cannot be scheduled before the previous guest checks out on ${formatDate(info.boundaryDate)}.`
      title = 'Invalid Date'
      break
    case 'after_checkin':
      message = `This cleaning must be scheduled on or before the next guest's check-in on ${formatDate(info.boundaryDate)}.`
      title = 'Invalid Date'
      break
    case 'booking_overlap':
      message = `This date range overlaps with ${info.conflictingBookingName || 'another booking'}'s booking.`
      title = 'Booking Conflict'
      break
    case 'date_change_not_allowed':
      message = 'Rescheduling is not available in the cleaner view. Switch to the property view to reschedule cleanings.'
      title = 'Reassignment Only'
      break
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-md p-6" zIndex={70}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="space-y-2">
          <p className="text-gray-700">
            Cannot move <span className="font-semibold">{info.itemName}</span> to {formatDate(info.targetDate)}.
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {message}
          </p>
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
          >
            {t('gotIt')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
