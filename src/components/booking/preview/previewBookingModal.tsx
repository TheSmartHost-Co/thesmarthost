'use client'

import React from 'react'
import Modal from '../../shared/modal'
import { Booking } from '@/services/types/booking'
import { formatCurrency, formatPlatformName } from '@/services/bookingService'
import { CalendarDaysIcon, PencilIcon, MapPinIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

interface PreviewBookingModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking
  onEditBooking: () => void
}

const PreviewBookingModal: React.FC<PreviewBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  onEditBooking,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      'airbnb': 'bg-red-100 text-red-800',
      'booking': 'bg-blue-100 text-blue-800',
      'google': 'bg-green-100 text-green-800',
      'direct': 'bg-gray-100 text-gray-800',
      'wechalet': 'bg-purple-100 text-purple-800',
      'monsieurchalets': 'bg-orange-100 text-orange-800'
    }

    const colorClass = colors[platform] || 'bg-gray-100 text-gray-800'

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
        {formatPlatformName(platform as any)}
      </span>
    )
  }

  const formatDateRange = () => {
    const checkIn = formatDate(booking.checkInDate)
    if (booking.checkOutDate) {
      const checkOut = formatDate(booking.checkOutDate)
      return `${checkIn} ${checkOut}`
    }
    return checkIn
  }

  // Financial breakdown items
  const financialItems = [
    { label: 'Nightly Rate', value: booking.nightlyRate, type: 'currency' },
    { label: 'Extra Guest Fees', value: booking.extraGuestFees, type: 'currency' },
    { label: 'Cleaning Fee', value: booking.cleaningFee, type: 'currency' },
    { label: 'Lodging Tax', value: booking.lodgingTax, type: 'currency' },
    { label: 'Bed Linen Fee', value: booking.bedLinenFee, type: 'currency' },
    { label: 'GST', value: booking.gst, type: 'currency' },
    { label: 'QST', value: booking.qst, type: 'currency' },
    { label: 'Channel Fee', value: booking.channelFee, type: 'currency' },
    { label: 'Stripe Fee', value: booking.stripeFee, type: 'currency' },
    { label: 'Sales Tax', value: booking.salesTax, type: 'currency' },
  ].filter(item => item.value !== null && item.value !== undefined)

  const summaryItems = [
    { label: 'Total Payout', value: booking.totalPayout, highlight: true },
    { label: 'Management Fee', value: booking.mgmtFee, isDeduction: true },
    { label: 'Net Earnings', value: booking.netEarnings, highlight: true, isNet: true },
  ].filter(item => item.value !== null && item.value !== undefined)

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-9 max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{booking.guestName}</h2>
            <p className="text-sm text-gray-600 mt-1">Reservation: {booking.reservationCode}</p>
            {booking.listingName && (
              <p className="text-sm text-gray-500 mt-1">{booking.listingName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getPlatformBadge(booking.platform)}
        </div>
      </div>

      {/* Booking Overview Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
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
            <div>
              <p className="text-sm text-gray-600">Number of Nights</p>
              <p className="text-base font-medium text-gray-900">{booking.numNights} {booking.numNights === 1 ? 'night' : 'nights'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Information */}
      {(financialItems.length > 0 || summaryItems.length > 0) && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CurrencyDollarIcon className="h-5 w-5" />
            Financial Breakdown
          </h3>

          {/* Detailed Breakdown */}
          {financialItems.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Charges & Fees</h4>
              <div className="grid grid-cols-2 gap-4">
                {financialItems.map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{item.label}:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {summaryItems.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">Summary</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                {summaryItems.map((item) => (
                  <div 
                    key={item.label} 
                    className={`flex justify-between items-center ${
                      item.highlight ? 'py-2 border-t border-gray-300 font-semibold' : ''
                    } ${item.isNet ? 'text-green-700' : ''}`}
                  >
                    <span className={`${item.highlight ? 'text-lg' : 'text-sm'} ${item.isDeduction ? 'text-red-600' : ''}`}>
                      {item.label}:
                    </span>
                    <span className={`${item.highlight ? 'text-lg font-bold' : 'text-sm font-medium'} ${
                      item.isNet ? 'text-green-700' : item.isDeduction ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {item.isDeduction ? '-' : ''}{formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Created At</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(booking.createdAt).toLocaleDateString('en-CA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          {booking.csvFileName && (
            <div>
              <p className="text-sm text-gray-600">Source CSV</p>
              <p className="text-sm font-medium text-gray-900">{booking.csvFileName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onEditBooking}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PencilIcon className="h-4 w-4" />
          Edit Booking
        </button>
      </div>
    </Modal>
  )
}

export default PreviewBookingModal