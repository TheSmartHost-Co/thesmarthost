'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeModernIcon,
  SignalIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { createPortal } from 'react-dom'
import { getAnalyticsBookings } from '@/services/analyticsService'
import { useAnalyticsStore } from '@/store/useAnalyticsStore'
import type { BookingDetail, BookingsPagination, AnalyticsDateRange } from '@/services/types/analytics'

interface DrillDownModalProps {
  isOpen: boolean
  onClose: () => void
}

const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function DrillDownModal({ isOpen, onClose }: DrillDownModalProps) {
  const { drillDown, filters, bookingsData, isLoadingBookings, bookingsError, setBookingsData, setLoadingBookings, setBookingsError } = useAnalyticsStore()

  const [currentPage, setCurrentPage] = useState(1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  // Reset page when drill-down context changes
  useEffect(() => {
    setCurrentPage(1)
  }, [drillDown])

  // Fetch bookings when modal opens or page changes
  const fetchBookings = useCallback(async () => {
    if (!drillDown.type) return

    setLoadingBookings(true)
    setBookingsError(null)

    try {
      const request = {
        dateRange: filters.dateRange,
        propertyIds: drillDown.propertyId ? [drillDown.propertyId] : filters.propertyIds,
        channels: drillDown.channel ? [drillDown.channel] : filters.channels,
        page: currentPage,
        limit: 20,
      }

      const res = await getAnalyticsBookings(request)

      if (res.status === 'success') {
        setBookingsData(res.data)
      } else {
        setBookingsError(res.message || 'Failed to load bookings')
      }
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setBookingsError('Network error occurred')
    } finally {
      setLoadingBookings(false)
    }
  }, [drillDown, filters, currentPage, setBookingsData, setLoadingBookings, setBookingsError])

  useEffect(() => {
    if (isOpen && drillDown.type) {
      fetchBookings()
    }
  }, [isOpen, drillDown, currentPage, fetchBookings])

  // Get drill-down title and icon
  const getDrillDownInfo = () => {
    switch (drillDown.type) {
      case 'property':
        return {
          icon: <HomeModernIcon className="w-5 h-5" />,
          title: drillDown.propertyName || 'Property Bookings',
          subtitle: 'Viewing all bookings for this property',
        }
      case 'channel':
        return {
          icon: <SignalIcon className="w-5 h-5" />,
          title: drillDown.channel || 'Channel Bookings',
          subtitle: 'Viewing all bookings from this channel',
        }
      case 'date':
        return {
          icon: <CalendarDaysIcon className="w-5 h-5" />,
          title: drillDown.date || 'Date Bookings',
          subtitle: 'Viewing all bookings for this date',
        }
      default:
        return {
          icon: null,
          title: 'Bookings',
          subtitle: '',
        }
    }
  }

  const { icon, title, subtitle } = getDrillDownInfo()
  const bookings = bookingsData?.bookings || []
  const pagination = bookingsData?.pagination

  if (!isOpen || !mounted) return null

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {icon && (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                  {subtitle && (
                    <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchBookings}
                  disabled={isLoadingBookings}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-5 h-5 ${isLoadingBookings ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {isLoadingBookings ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading bookings...</p>
                  </div>
                </div>
              ) : bookingsError ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <p className="text-red-500 font-medium">Error loading bookings</p>
                    <p className="text-sm text-gray-500 mt-1">{bookingsError}</p>
                    <button
                      onClick={fetchBookings}
                      className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">No bookings found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reservation
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Guest
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nights
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Channel
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payout
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking, index) => (
                      <motion.tr
                        key={booking.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-gray-900">
                            {booking.reservationCode}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-900">{booking.guestName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">{booking.listingName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <span className="text-gray-900">{formatDate(booking.checkInDate)}</span>
                            <span className="text-gray-400 mx-1">→</span>
                            <span className="text-gray-600">{formatDate(booking.checkOutDate)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                            {booking.numNights}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-xs font-medium text-blue-700">
                            {booking.platform}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(booking.totalPayout)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-medium text-emerald-600">
                            {formatCurrency(booking.netEarnings)}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer with Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} bookings
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrev || isLoadingBookings}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={!pagination.hasNext || isLoadingBookings}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}
