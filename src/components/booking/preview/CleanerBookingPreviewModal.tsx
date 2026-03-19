'use client'

import React from 'react'
import Modal from '../../shared/modal'
import type { Booking } from '@/services/types/booking'
import { formatPlatformName } from '@/services/bookingService'
import { CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { parseLocalDate } from '@/utils/dateUtils'
import { isReservedName } from '@/utils/bookingUtils'

interface CleanerBookingPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking
}

const CleanerBookingPreviewModal: React.FC<CleanerBookingPreviewModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const formatDate = (dateString: string) => {
    return parseLocalDate(dateString).toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      airbnb: 'bg-red-100 text-red-800',
      booking: 'bg-blue-100 text-blue-800',
      google: 'bg-green-100 text-green-800',
      direct: 'bg-gray-100 text-gray-800',
      wechalet: 'bg-purple-100 text-purple-800',
      monsieurchalets: 'bg-orange-100 text-orange-800',
    }
    const colorClass = colors[platform] || 'bg-gray-100 text-gray-800'
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
        {formatPlatformName(platform as 'airbnb' | 'booking' | 'google' | 'direct' | 'wechalet' | 'monsieurchalets')}
      </span>
    )
  }

  // Calculate number of nights
  const calculateNights = () => {
    if (!booking.checkOutDate) return null
    const checkIn = parseLocalDate(booking.checkInDate)
    const checkOut = parseLocalDate(booking.checkOutDate)
    const diffMs = checkOut.getTime() - checkIn.getTime()
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  }

  const nights = calculateNights()
  const guestName = isReservedName(booking.guestName) ? 'Reserved' : (booking.guestName || 'N/A')

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-lg w-full p-6">
      <div className="space-y-5">
        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 pr-8">Booking Details</h2>
        {/* Guest Name & Platform */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Guest</p>
            <p className="text-lg font-semibold text-gray-900">{guestName}</p>
          </div>
          {booking.platform && getPlatformBadge(booking.platform)}
        </div>

        {/* Reservation Code */}
        {booking.reservationCode && (
          <div>
            <p className="text-sm text-gray-500">Reservation Code</p>
            <p className="text-sm font-medium text-gray-900">{booking.reservationCode}</p>
          </div>
        )}

        {/* Dates */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <CalendarDaysIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Check-in</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(booking.checkInDate)}</p>
                {booking.defaultCheckinTime && (
                  <p className="text-xs text-gray-500">{booking.defaultCheckinTime}</p>
                )}
              </div>
              {booking.checkOutDate && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Check-out</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(booking.checkOutDate)}</p>
                  {booking.defaultCheckoutTime && (
                    <p className="text-xs text-gray-500">{booking.defaultCheckoutTime}</p>
                  )}
                </div>
              )}
              {nights !== null && (
                <div className="pt-1 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{nights}</span> {nights === 1 ? 'night' : 'nights'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Property */}
        <div className="flex items-start gap-3">
          <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-500">Property</p>
            <p className="text-sm font-medium text-gray-900">
              {booking.propertyName || 'Unknown Property'}
            </p>
            {booking.propertyAddress && (
              <p className="text-xs text-gray-500">{booking.propertyAddress}</p>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CleanerBookingPreviewModal
