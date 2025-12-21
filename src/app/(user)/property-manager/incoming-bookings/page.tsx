"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getAllIncomingBookings, getIncomingBookingsByStatus, updateIncomingBookingStatus } from '@/services/incomingBookingService'
import type { IncomingBooking } from '@/services/types/incomingBooking'
import ReviewIncomingBookingsModal from '@/components/incoming-bookings/ReviewIncomingBookingsModal'
import {
  InboxArrowDownIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  EyeIcon,
  CalendarDaysIcon,
  UserIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

const statusColors = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  imported: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  error: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
}

const statusIcons = {
  pending: ClockIcon,
  approved: CheckIcon,
  rejected: XMarkIcon,
  imported: CheckCircleIcon,
  error: ExclamationCircleIcon
}

export default function IncomingBookingsPage() {
  const [bookings, setBookings] = useState<IncomingBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<IncomingBooking | null>(null)

  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  useEffect(() => {
    if (profile?.id) {
      fetchIncomingBookings()
    }
  }, [profile?.id, statusFilter])

  const fetchIncomingBookings = async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      setError(null)

      const response = statusFilter === 'all'
        ? await getAllIncomingBookings(profile.id)
        : await getIncomingBookingsByStatus(profile.id, statusFilter)

      if (response.status === 'success') {
        setBookings(response.data)
      } else {
        setError(response.message || 'Failed to fetch incoming bookings')
      }
    } catch (error) {
      console.error('Error fetching incoming bookings:', error)
      setError('Failed to fetch incoming bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (bookingId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const response = await updateIncomingBookingStatus(bookingId, { status: newStatus })

      if (response.status === 'success') {
        showNotification(`Booking ${newStatus} successfully`, 'success')
        fetchIncomingBookings() // Refresh the list
      } else {
        showNotification(response.message || `Failed to ${newStatus} booking`, 'error')
      }
    } catch (error) {
      console.error(`Error updating booking status:`, error)
      // Extract the error message from the thrown error
      const message = error instanceof Error ? error.message : `Failed to ${newStatus} booking`
      showNotification(message, 'error')
    }
  }

  const handleReviewBooking = (booking: IncomingBooking) => {
    setSelectedBooking(booking)
    setReviewModalOpen(true)
  }

  const handleReviewModalClose = () => {
    setReviewModalOpen(false)
    setSelectedBooking(null)
  }

  const handleBookingUpdate = (updatedBooking: IncomingBooking) => {
    // Update the specific booking in the list
    setBookings(prevBookings =>
      prevBookings.map(booking =>
        booking.id === updatedBooking.id ? updatedBooking : booking
      )
    )
    // Update the selected booking if it's the same one
    setSelectedBooking(updatedBooking)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'N/A'
    return `$${parseFloat(amount).toLocaleString()}`
  }

  // Calculate stats
  const stats = {
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    imported: bookings.filter(b => b.status === 'imported').length,
    total: bookings.length
  }

  const statCards = [
    {
      label: 'Pending',
      value: stats.pending,
      icon: ClockIcon,
      bgColor: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-100'
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      label: 'Imported',
      value: stats.imported,
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      label: 'Total',
      value: stats.total,
      icon: InboxArrowDownIcon,
      bgColor: 'bg-gray-50',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      borderColor: 'border-gray-100'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Incoming Bookings</h1>
            <p className="text-gray-500 mt-1">Review and manage bookings from connected platforms</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading bookings...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Incoming Bookings</h1>
            <p className="text-gray-500 mt-1">Review and manage bookings from connected platforms</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading bookings</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incoming Bookings</h1>
          <p className="text-gray-500 mt-1">Review and manage bookings from connected platforms</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} border ${stat.borderColor} rounded-2xl p-5 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <FunnelIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Filter by status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          >
            <option value="all">All Bookings</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="imported">Imported</option>
            <option value="error">Error</option>
          </select>
        </div>
      </motion.div>

      {/* Bookings List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {bookings.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <InboxArrowDownIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No incoming bookings</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              {statusFilter === 'all'
                ? 'No bookings have been received from connected platforms yet.'
                : `No ${statusFilter} bookings found.`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {bookings.map((booking, index) => {
              const StatusIcon = statusIcons[booking.status as keyof typeof statusIcons] || ClockIcon
              const statusStyle = statusColors[booking.status as keyof typeof statusColors] || statusColors.pending

              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-5 hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  onClick={() => handleReviewBooking(booking)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                        <CalendarDaysIcon className="h-6 w-6 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">
                            {booking.guestName || 'Unknown Guest'}
                          </p>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                            {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
                            via {booking.platform || 'Unknown Platform'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{formatCurrency(booking.totalAmount)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span>{booking.guestEmail || 'No email'}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          <span>Received: {formatDate(booking.webhookReceivedAt)}</span>
                          <span>•</span>
                          <span className="font-mono">ID: {booking.externalReservationId}</span>
                          {(booking.listingName || booking.propertyName) && (
                            <>
                              <span>•</span>
                              <span>Property: {booking.listingName || booking.propertyName}</span>
                            </>
                          )}
                          {booking.numNights && (
                            <>
                              <span>•</span>
                              <span>{booking.numNights} nights</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {booking.status === 'pending' && (
                        <>
                          <motion.button
                            onClick={() => handleStatusUpdate(booking.id, 'approved')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/20 transition-colors"
                          >
                            <CheckIcon className="h-4 w-4 mr-1.5" />
                            Approve
                          </motion.button>
                          <motion.button
                            onClick={() => handleStatusUpdate(booking.id, 'rejected')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center px-3.5 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1.5" />
                            Reject
                          </motion.button>
                        </>
                      )}

                      {booking.status === 'imported' && booking.importedBookingId && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-green-100 text-green-700">
                          <CheckCircleIcon className="h-4 w-4" />
                          Imported
                        </span>
                      )}

                      <motion.button
                        onClick={() => handleReviewBooking(booking)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center px-3.5 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4 mr-1.5" />
                        {booking.status === 'imported' ? 'View' : 'Review'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Results count */}
        {bookings.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{bookings.length}</span> bookings
            </p>
          </div>
        )}
      </motion.div>

      {/* Review Modal */}
      <ReviewIncomingBookingsModal
        isOpen={reviewModalOpen}
        onClose={handleReviewModalClose}
        booking={selectedBooking}
        onUpdate={fetchIncomingBookings}
        onBookingUpdate={handleBookingUpdate}
      />
    </div>
  )
}
