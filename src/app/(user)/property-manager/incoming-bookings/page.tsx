"use client"

import { useState, useEffect } from 'react'
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
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  imported: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800'
}

const statusIcons = {
  pending: ClockIcon,
  approved: CheckIcon,
  rejected: XMarkIcon,
  imported: CheckIcon,
  error: XMarkIcon
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
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'N/A'
    return `$${parseFloat(amount).toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Incoming Bookings</h1>
            <p className="text-gray-600">Review and manage bookings from connected platforms</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            <p className="text-gray-600">Review and manage bookings from connected platforms</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
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
          <p className="text-gray-600">Review and manage bookings from connected platforms</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookings.filter(b => b.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookings.filter(b => b.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Imported</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookings.filter(b => b.status === 'imported').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <InboxArrowDownIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 text-black rounded-lg border-gray-300 border text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Bookings</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="imported">Imported</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-lg shadow">
        {bookings.length === 0 ? (
          <div className="p-8 text-center">
            <InboxArrowDownIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No incoming bookings</h3>
            <p className="text-gray-600">
              {statusFilter === 'all' 
                ? 'No bookings have been received from connected platforms yet.'
                : `No ${statusFilter} bookings found.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {bookings.map((booking) => {
                const StatusIcon = statusIcons[booking.status as keyof typeof statusIcons] || ClockIcon
                
                return (
                  <li 
                    key={booking.id} 
                    className="p-6 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleReviewBooking(booking)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {booking.guestName || 'Unknown Guest'}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.status ? statusColors[booking.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-500">
                              via {booking.platform || 'Unknown Platform'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm text-gray-600">
                            <div className="flex items-center">
                              <CalendarDaysIcon className="h-4 w-4 mr-1" />
                              {formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}
                            </div>
                            <div className="flex items-center">
                              <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                              {formatCurrency(booking.totalAmount)}
                            </div>
                            <div className="flex items-center">
                              <UserIcon className="h-4 w-4 mr-1" />
                              {booking.guestEmail || 'No email'}
                            </div>
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-500">
                            Received: {formatDate(booking.webhookReceivedAt)} | 
                            ID: {booking.externalReservationId}
                            {(booking.listingName || booking.propertyName) && (
                              <> | Property: {booking.listingName || booking.propertyName}</>
                            )}
                            {booking.numNights && (
                              <> | {booking.numNights} nights</>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'approved')}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <CheckIcon className="h-4 w-4 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'rejected')}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <XMarkIcon className="h-4 w-4 mr-1" />
                              Reject
                            </button>
                          </>
                        )}
                        
                        {booking.status === 'imported' && booking.importedBookingId && (
                          <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-800 bg-green-100 rounded-md">
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Imported
                          </span>
                        )}
                        
                        <button
                          onClick={() => handleReviewBooking(booking)}
                          className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          {booking.status === 'imported' ? 'View' : 'Review'}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

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