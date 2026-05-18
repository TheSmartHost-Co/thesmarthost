'use client'

import { useTranslation } from 'react-i18next'
import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { Booking } from '@/services/types/booking'
import { formatCurrency, formatPlatformName } from '@/services/bookingService'
import { CalendarDaysIcon, PencilIcon, MapPinIcon, CurrencyDollarIcon, ClockIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/solid'
import { getFieldChangesByBooking, formatFieldName } from '@/services/fieldValuesChangedService'
import { FieldValueChanged } from '@/services/types/fieldValueChanged'
import { usePermissions } from '@/hooks/usePermissions'
import AuditHistoryPanel from '@/components/audit/AuditHistoryPanel'
import { parseLocalDate } from '@/utils/dateUtils'
import { isReservedName } from '@/utils/bookingUtils'

interface PreviewBookingModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking
  onEditBooking?: () => void
  onDeleteBooking?: () => void
  onCancelBooking?: () => void
}

const PreviewBookingModal: React.FC<PreviewBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  onEditBooking,
  onDeleteBooking,
  onCancelBooking,
}) => {
  const [fieldChanges, setFieldChanges] = useState<FieldValueChanged[]>([])
  const [loadingFieldChanges, setLoadingFieldChanges] = useState(false)
  const { effectiveUserId, isPM } = usePermissions()

  // Load field changes when modal opens
  useEffect(() => {
    const fetchFieldChanges = async () => {
      if (!isOpen || !booking.id || !effectiveUserId) return

      try {
        setLoadingFieldChanges(true)
        const response = await getFieldChangesByBooking({
          bookingId: booking.id,
          userId: effectiveUserId!
        })
        if (response.status === 'success') {
          setFieldChanges(response.data)
        } else {
          setFieldChanges([])
        }
      } catch (error) {
        console.error('Error fetching field changes:', error)
        setFieldChanges([])
      } finally {
        setLoadingFieldChanges(false)
      }
    }

    fetchFieldChanges()
  }, [isOpen, booking.id, effectiveUserId])
  const formatDate = (dateString: string) => {
    return parseLocalDate(dateString).toLocaleDateString('en-CA', {
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
    { label: 'Co-Host Fee', value: booking.cohostFee, type: 'currency' },
  ].filter(item => item.value !== null && item.value !== undefined)

  const summaryItems = [
    { label: 'Total Payout', value: booking.totalPayout, highlight: true },
    { label: 'Management Fee', value: booking.mgmtFee, isDeduction: true },
    { label: 'Net Earnings', value: booking.netEarnings, highlight: true, isNet: true },
    { label: 'Rent Collected', value: booking.rentCollected, highlight: false },
    { label: 'Taxes Collected', value: booking.taxesCollected, highlight: false },
  ].filter(item => item.value !== null && item.value !== undefined)

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-9 max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-4 mb-3">
          <div className="shrink-0 h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isReservedName(booking.guestName) ? 'Booking Details' : booking.guestName}</h2>
            <p className="text-sm text-gray-600 mt-1">Reservation: {booking.reservationCode}</p>
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
          {booking.source && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              booking.isAutoImported ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {booking.isAutoImported && <ArrowDownOnSquareIcon className="w-3.5 h-3.5" />}
              {booking.source === 'ical' ? 'iCal' : booking.source === 'csv' ? 'CSV' : booking.source === 'webhook' ? 'Webhook' : 'Manual'}
              {booking.isAutoImported && ' · Auto-Imported'}
            </span>
          )}
          {booking.financialReadiness === 'scheduling_only' ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              Scheduling Only
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Report Ready
            </span>
          )}
          {getPlatformBadge(booking.platform)}
        </div>
      </div>

      {/* Scheduling-only callout */}
      {booking.financialReadiness === 'scheduling_only' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            This booking has no financial data. Upload a CSV or edit the booking to add financial details and include it in reports.
          </p>
        </div>
      )}

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
            <div>
              <p className="text-sm text-gray-600">Number of Nights</p>
              <p className="text-base font-medium text-gray-900">{booking.numNights} {booking.numNights === 1 ? 'night' : 'nights'}</p>
            </div>
            {(booking.numGuests != null && booking.numGuests > 0) && (
              <div>
                <p className="text-sm text-gray-600">Number of Guests</p>
                <p className="text-base font-medium text-gray-900">{booking.numGuests} {booking.numGuests === 1 ? 'guest' : 'guests'}</p>
              </div>
            )}
            {booking.hasPets && (
              <div>
                <p className="text-sm text-gray-600">Pets</p>
                <p className="text-base font-medium text-gray-900">Yes</p>
              </div>
            )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="text-black bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
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

      {/* Field Change History */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Field Change History
        </h3>
        
        {loadingFieldChanges ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">Loading change history...</span>
          </div>
        ) : fieldChanges.length > 0 ? (
          <div className="space-y-4">
            {fieldChanges.map((change) => (
              <div key={change.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900">{formatFieldName(change.fieldName)}</span>
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                        Modified
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Original Value:</span>
                        <div className="font-medium text-gray-900 mt-1">
                          {change.originalValue ? formatCurrency(parseFloat(change.originalValue)) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">New Value:</span>
                        <div className="font-medium text-green-700 mt-1">
                          {formatCurrency(parseFloat(change.editedValue))}
                        </div>
                      </div>
                    </div>
                    
                    {change.changeReason && (
                      <div className="mt-3">
                        <span className="text-gray-600 text-sm">Reason:</span>
                        <p className="text-gray-900 text-sm mt-1 italic">"{change.changeReason}"</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right text-xs text-gray-500 ml-4">
                    <div>{new Date(change.changedAt).toLocaleDateString()}</div>
                    <div>{new Date(change.changedAt).toLocaleTimeString()}</div>
                    {change.changedBy && (
                      <div className="mt-1 font-medium">by {change.changedBy}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <ClockIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No field changes recorded for this booking.</p>
            <p className="text-xs text-gray-400 mt-1">Changes made during CSV import will appear here.</p>
          </div>
        )}
      </div>

      {/* Audit Log (comprehensive change history — PM/ADMIN only) */}
      {isPM && booking.id && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <AuditHistoryPanel entityType="booking" entityId={booking.id} />
        </div>
      )}

      {/* Metadata */}
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
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200">
        {onDeleteBooking && (
          <button
            type="button"
            onClick={onDeleteBooking}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
        {onCancelBooking && booking.bookingStatus !== 'cancelled' && (
          <button
            type="button"
            onClick={onCancelBooking}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <XCircleIcon className="h-3.5 w-3.5" />
            Cancel Booking
          </button>
        )}
        <div className="flex-1 min-w-0" />
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
        {onEditBooking && booking.bookingStatus !== 'cancelled' && (
          <button
            type="button"
            onClick={onEditBooking}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Edit Booking
          </button>
        )}
      </div>
    </Modal>
  )
}

export default PreviewBookingModal