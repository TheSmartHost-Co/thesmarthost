'use client'

import React from 'react'
import Modal from '@/components/shared/modal'
import { ClientPortalBooking } from '@/services/types/clientPortal'
import { getPlatformBadge } from '@/components/client-portal/shared/platformUtils'
import { CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { parseLocalDate } from '@/utils/dateUtils'

interface PreviewClientBookingModalProps {
  isOpen: boolean
  onClose: () => void
  booking: ClientPortalBooking
}

const PreviewClientBookingModal: React.FC<PreviewClientBookingModalProps> = ({
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-9 max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-4 mb-3">
          <div className="shrink-0 h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <CalendarDaysIcon className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {booking.guestName || 'Booking Details'}
            </h2>
            {booking.reservationCode && (
              <p className="text-sm text-gray-600 mt-1">Reservation: {booking.reservationCode}</p>
            )}
            {booking.listingName && (
              <p className="text-sm text-gray-500 mt-1">{booking.listingName}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {booking.bookingStatus === 'cancelled' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Cancelled
            </span>
          )}
          {booking.bookingStatus === 'confirmed' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Confirmed
            </span>
          )}
          {booking.bookingStatus === 'pending' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              Pending
            </span>
          )}
          {booking.platform && getPlatformBadge(booking.platform)}
        </div>
      </div>

      {/* Booking Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 pb-6 border-b border-gray-200">
        {/* Property Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5" />
            Property Details
          </h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Property</p>
              <p className="text-base font-medium text-gray-900">{booking.propertyName || 'Unknown Property'}</p>
            </div>
            {booking.propertyAddress && (
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="text-base font-medium text-gray-900">{booking.propertyAddress}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stay Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5" />
            Stay Details
          </h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Check-in Date</p>
              <p className="text-base font-medium text-gray-900">{formatDate(booking.checkInDate)}</p>
            </div>
            {booking.checkOutDate && (
              <div>
                <p className="text-sm text-gray-600">Check-out Date</p>
                <p className="text-base font-medium text-gray-900">{formatDate(booking.checkOutDate)}</p>
              </div>
            )}
            {booking.numNights != null && (
              <div>
                <p className="text-sm text-gray-600">Number of Nights</p>
                <p className="text-base font-medium text-gray-900">
                  {booking.numNights} {booking.numNights === 1 ? 'night' : 'nights'}
                </p>
              </div>
            )}
            {booking.numGuests != null && (
              <div>
                <p className="text-sm text-gray-600">Number of Guests</p>
                <p className="text-base font-medium text-gray-900">
                  {booking.numGuests} {booking.numGuests === 1 ? 'guest' : 'guests'}
                </p>
              </div>
            )}
            {booking.hasPets && (
              <div>
                <p className="text-sm text-gray-600">Pets</p>
                <p className="text-base font-medium text-gray-900">Yes</p>
              </div>
            )}
            {booking.platform && (
              <div>
                <p className="text-sm text-gray-600">Platform</p>
                <div className="mt-1">{getPlatformBadge(booking.platform)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Created At</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(booking.createdAt).toLocaleDateString('en-CA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <div className="flex items-center justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default PreviewClientBookingModal
