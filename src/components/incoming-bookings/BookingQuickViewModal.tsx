'use client'

import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useEscapeLayer } from '@/components/shared/modal'
import { parseLocalDate } from '@/utils/dateUtils'
import {
  XMarkIcon,
  UserIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  HashtagIcon,
  GlobeAltIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import type { IncomingBooking } from '@/services/types/incomingBooking'

interface BookingQuickViewModalProps {
  isOpen: boolean
  onClose: () => void
  booking: IncomingBooking | null
}

const BookingQuickViewModal: React.FC<BookingQuickViewModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Escape joins the shared modal stack (top-most layer only).
  useEscapeLayer(isOpen, onClose)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return parseLocalDate(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return '-'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return '-'
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (!isOpen || !mounted || !booking) return null

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {booking.guestName || 'Unknown Guest'}
                  </h2>
                  <p className="text-sm text-gray-500">Booking Details</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Guest Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Guest Information
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{booking.guestName || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{booking.guestEmail || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <HashtagIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 font-mono">{booking.externalReservationId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Stay Details */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Stay Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Check-in</p>
                    <div className="flex items-center gap-2">
                      <CalendarDaysIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-900">{formatDate(booking.checkInDate)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Check-out</p>
                    <div className="flex items-center gap-2">
                      <CalendarDaysIcon className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-gray-900">{formatDate(booking.checkOutDate)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nights</p>
                    <span className="text-sm font-medium text-gray-900">{booking.numNights || 'N/A'}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Platform</p>
                    <div className="flex items-center gap-2">
                      <GlobeAltIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{booking.platform || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Property */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Property
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.propertyName || booking.listingName || 'Not assigned'}
                    </p>
                    {booking.propertyAddress && (
                      <p className="text-xs text-gray-500">{booking.propertyAddress}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Financial Breakdown
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Nightly Rate</span>
                    <span className="font-medium text-gray-900">{formatCurrency(booking.nightlyRate)}</span>
                  </div>
                  {booking.cleaningFee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cleaning Fee</span>
                      <span className="font-medium text-gray-900">{formatCurrency(booking.cleaningFee)}</span>
                    </div>
                  )}
                  {booking.extraGuestFees && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Extra Guest Fees</span>
                      <span className="font-medium text-gray-900">{formatCurrency(booking.extraGuestFees)}</span>
                    </div>
                  )}

                  {/* Taxes */}
                  {(booking.lodgingTax || booking.salesTax || booking.gst || booking.qst) && (
                    <>
                      <div className="border-t border-gray-200 my-2" />
                      {booking.lodgingTax && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Lodging Tax</span>
                          <span className="font-medium text-gray-900">{formatCurrency(booking.lodgingTax)}</span>
                        </div>
                      )}
                      {booking.salesTax && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Sales Tax</span>
                          <span className="font-medium text-gray-900">{formatCurrency(booking.salesTax)}</span>
                        </div>
                      )}
                      {booking.gst && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">GST</span>
                          <span className="font-medium text-gray-900">{formatCurrency(booking.gst)}</span>
                        </div>
                      )}
                      {booking.qst && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">QST</span>
                          <span className="font-medium text-gray-900">{formatCurrency(booking.qst)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Fees */}
                  {(booking.channelFee || booking.stripeFee || booking.mgmtFee) && (
                    <>
                      <div className="border-t border-gray-200 my-2" />
                      {booking.channelFee && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Channel Fee</span>
                          <span className="font-medium text-red-600">-{formatCurrency(booking.channelFee)}</span>
                        </div>
                      )}
                      {booking.stripeFee && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Stripe Fee</span>
                          <span className="font-medium text-red-600">-{formatCurrency(booking.stripeFee)}</span>
                        </div>
                      )}
                      {booking.mgmtFee && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Management Fee</span>
                          <span className="font-medium text-red-600">-{formatCurrency(booking.mgmtFee)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Totals */}
                  <div className="border-t border-green-200 pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Amount</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(booking.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Total Payout</span>
                      <span className="font-semibold text-green-600">{formatCurrency(booking.totalPayout)}</span>
                    </div>
                    {booking.netEarnings && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Net Earnings</span>
                        <span className="font-bold text-green-700">{formatCurrency(booking.netEarnings)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ClockIcon className="w-3.5 h-3.5" />
                <span>Received: {formatDate(booking.webhookReceivedAt)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

export default BookingQuickViewModal
