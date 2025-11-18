"use client"

import { useState, useEffect } from 'react'
import { CalendarDaysIcon, MagnifyingGlassIcon, FunnelIcon, PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import { getBookings, calculateBookingStats, formatCurrency, formatPlatformName } from '@/services/bookingService'
import { Booking } from '@/services/types/booking'
import { useUserStore } from '@/store/useUserStore'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import CreateBookingModal from '@/components/booking/create/createBookingModal'
import UpdateBookingModal from '@/components/booking/update/updateBookingModal'
import DeleteBookingModal from '@/components/booking/delete/deleteBookingModal'
import PreviewBookingModal from '@/components/booking/preview/previewBookingModal'

export default function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [platformFilter, setPlatformFilter] = useState('All Platforms')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { profile } = useUserStore()

  useEffect(() => {
    const fetchBookings = async () => {
      if (!profile?.id) return

      try {
        setLoading(true)
        const response = await getBookings({ user_id: profile.id })
        if (response.status === 'success') {
          setBookings(response.data)
        } else {
          setError('Failed to fetch bookings')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bookings')
        console.error('Error fetching bookings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [profile?.id])

  const handleAddBooking = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev])
  }

  const handleEditBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (booking) {
      setSelectedBooking(booking)
      setShowUpdateModal(true)
    }
  }

  const handleDeleteBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (booking) {
      setSelectedBooking(booking)
      setShowDeleteModal(true)
    }
  }

  const handleViewBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (booking) {
      setSelectedBooking(booking)
      setShowPreviewModal(true)
    }
  }

  const handleBookingDeleted = (bookingId: string) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId))
  }

  const handleBookingUpdated = (updatedBooking: Booking) => {
    setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b))
  }

  const getBookingActions = (booking: Booking): ActionItem[] => [
    {
      label: 'View Booking',
      icon: EyeIcon,
      onClick: () => handleViewBooking(booking.id),
      variant: 'default'
    },
    {
      label: 'Edit Booking',
      icon: PencilIcon,
      onClick: () => handleEditBooking(booking.id),
      variant: 'default'
    },
    {
      label: 'Delete Booking',
      icon: TrashIcon,
      onClick: () => handleDeleteBooking(booking.id),
      variant: 'danger'
    }
  ]

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = booking.guestName.toLowerCase().includes(searchLower) ||
      booking.reservationCode.toLowerCase().includes(searchLower) ||
      (booking.propertyName && booking.propertyName.toLowerCase().includes(searchLower)) ||
      (booking.listingName && booking.listingName.toLowerCase().includes(searchLower))
    
    const matchesPlatform = platformFilter === 'All Platforms' || 
      formatPlatformName(booking.platform) === platformFilter

    return matchesSearch && matchesPlatform
  })

  // Calculate stats
  const stats = calculateBookingStats(filteredBookings)

  // Platform options for filter
  const platformOptions = [
    'All Platforms',
    'Airbnb',
    'Booking.com', 
    'Google Travel',
    'Direct Booking',
    'We Chalet',
    'Monsieur Chalets'
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {formatPlatformName(platform as any)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-600">Manage and view all property bookings</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-600">Manage and view all property bookings</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading bookings: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">Manage and view all property bookings</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Nights</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalNights}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalPayoutSum)}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Platforms</p>
              <p className="text-2xl font-bold text-gray-900">{stats.platformsCount}</p>
            </div>
            <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm text-black block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by guest, reservation, property..."
                />
              </div>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="text-black border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {platformOptions.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex cursor-pointer items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Booking
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-150">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Guest & Reservation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Nights
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Revenue
                </th>
                <th className="relative px-6 py-3 bg-gray-50">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr 
                  key={booking.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewBooking(booking.id)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.guestName}</div>
                      <div className="text-sm text-gray-500">{booking.reservationCode}</div>
                      {booking.listingName && (
                        <div className="text-xs text-gray-400">{booking.listingName}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.propertyName || 'Unknown Property'}</div>
                    {booking.propertyAddress && (
                      <div className="text-sm text-gray-500">{booking.propertyAddress}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(booking.checkInDate)}
                    </div>
                    {booking.checkOutDate && (
                      <div className="text-sm text-gray-500">
                        to {formatDate(booking.checkOutDate)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPlatformBadge(booking.platform)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{booking.numNights}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(booking.totalPayout)}
                    </div>
                    {booking.netEarnings && (
                      <div className="text-xs text-gray-500">
                        Net: {formatCurrency(booking.netEarnings)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <TableActionsDropdown
                      actions={getBookingActions(booking)}
                      itemId={booking.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first booking or uploading booking data.'}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Booking
                </button>
                <a
                  href="/property-manager/upload-bookings"
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Upload Bookings
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Booking Modal */}
      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleAddBooking}
      />

      {/* Update Booking Modal */}
      {selectedBooking && (
        <UpdateBookingModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          booking={selectedBooking}
          onUpdate={handleBookingUpdated}
        />
      )}

      {/* Delete Booking Modal */}
      {selectedBooking && (
        <DeleteBookingModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          booking={selectedBooking}
          onDeleted={handleBookingDeleted}
        />
      )}

      {/* Preview Booking Modal */}
      {selectedBooking && (
        <PreviewBookingModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          booking={selectedBooking}
          onEditBooking={() => {
            setShowPreviewModal(false)
            setShowUpdateModal(true)
          }}
        />
      )}
    </div>
  )
}