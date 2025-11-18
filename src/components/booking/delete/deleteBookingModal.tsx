'use client'

import React, { useState } from 'react'
import Modal from '../../shared/modal'
import { deleteBooking, formatCurrency, formatPlatformName } from '@/services/bookingService'
import { Booking } from '@/services/types/booking'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteBookingModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking
  onDeleted: (bookingId: string) => void
}

const DeleteBookingModal: React.FC<DeleteBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDelete = async () => {
    if (!profile?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    setIsDeleting(true)

    try {
      const res = await deleteBooking(booking.id, profile.id)

      if (res.status === 'success') {
        onDeleted(booking.id)
        showNotification('Booking deleted successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete booking', 'error')
      }
    } catch (err) {
      console.error('Error deleting booking:', err)
      const message = err instanceof Error ? err.message : 'Error deleting booking'
      showNotification(message, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      {/* Header with icon */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Delete Booking
          </h2>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this booking for <span className="font-medium text-gray-900">{booking.guestName}</span>?
          </p>
        </div>
      </div>

      {/* Booking Details Summary - Full Width */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Reservation:</span>
            <span className="font-medium text-gray-900">{booking.reservationCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Property:</span>
            <span className="font-medium text-gray-900">{booking.propertyName || 'Unknown Property'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Check-in:</span>
            <span className="font-medium text-gray-900">{formatDate(booking.checkInDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Platform:</span>
            <span className="font-medium text-gray-900">{formatPlatformName(booking.platform)}</span>
          </div>
          {booking.totalPayout && (
            <div className="flex justify-between">
              <span className="text-gray-600">Revenue:</span>
              <span className="font-medium text-gray-900">{formatCurrency(booking.totalPayout)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Warning - Full Width */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-amber-800">
          <strong>Warning:</strong> This action cannot be undone.
        </p>
        <ul className="text-sm text-amber-700 mt-2 ml-4 list-disc space-y-1">
          <li>The booking will be permanently removed</li>
          <li>Associated financial data will be lost</li>
          <li>This may affect your reports and analytics</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isDeleting ? 'Deleting...' : 'Delete Booking'}
        </button>
      </div>
    </Modal>
  )
}

export default DeleteBookingModal