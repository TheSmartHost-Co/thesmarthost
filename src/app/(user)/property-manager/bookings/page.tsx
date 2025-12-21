"use client"

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  MoonIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
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
  const [propertyFilter, setPropertyFilter] = useState('All Properties')
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)
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
        const response = await getBookings({ userId: profile.id })
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

  // Close filter popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilterPopover(false)
      }
    }

    if (showFilterPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterPopover])

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

    const matchesProperty = propertyFilter === 'All Properties' ||
      booking.propertyName === propertyFilter

    return matchesSearch && matchesPlatform && matchesProperty
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
    'Monsieur Chalets',
    'Direct E-Transfer',
    'VRBO',
    'Hostaway'
  ]

  // Property options for filter - derived from existing bookings
  const uniqueProperties = Array.from(new Set(
    bookings
      .map(b => b.propertyName)
      .filter(name => name && name.trim() !== '')
  )).sort()

  const propertyOptions = ['All Properties', ...uniqueProperties]

  // Count active filters
  const activeFiltersCount = [
    platformFilter !== 'All Platforms',
    propertyFilter !== 'All Properties'
  ].filter(Boolean).length

  // Clear all filters
  const clearAllFilters = () => {
    setPlatformFilter('All Platforms')
    setPropertyFilter('All Properties')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, { bg: string, text: string, dot: string }> = {
      'airbnb': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
      'booking': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
      'google': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
      'direct': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
      'wechalet': { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
      'monsieurchalets': { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
      'vrbo': { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
      'hostaway': { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' }
    }

    const style = colors[platform] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {formatPlatformName(platform as Parameters<typeof formatPlatformName>[0])}
      </span>
    )
  }

  const statCards = [
    {
      label: 'Total Bookings',
      value: stats.totalBookings,
      icon: CalendarDaysIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      label: 'Total Nights',
      value: stats.totalNights,
      icon: MoonIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.totalPayoutSum),
      icon: CurrencyDollarIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100'
    },
    {
      label: 'Platforms',
      value: stats.platformsCount,
      icon: ChartBarIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-500 mt-1">Manage and view all property bookings</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-500 mt-1">Manage and view all property bookings</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">Manage and view all property bookings</p>
        </div>
        <motion.button
          onClick={() => setShowCreateModal(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Booking
        </motion.button>
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

      {/* Search, Filters & Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Search and Filters */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                placeholder="Search by guest, reservation, property..."
              />
            </div>

            {/* Filter Button with Popover */}
            <div className="relative" ref={filterPopoverRef}>
              <motion.button
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </motion.button>

              {showFilterPopover && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Filters</h3>
                      <button
                        onClick={() => setShowFilterPopover(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Platform Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Platform
                        </label>
                        <select
                          value={platformFilter}
                          onChange={(e) => setPlatformFilter(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          {platformOptions.map((platform) => (
                            <option key={platform} value={platform}>
                              {platform}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Property Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Property
                        </label>
                        <select
                          value={propertyFilter}
                          onChange={(e) => setPropertyFilter(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          {propertyOptions.map((property) => (
                            <option key={property} value={property}>
                              {property}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Filter Actions */}
                    {activeFiltersCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={clearAllFilters}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[220px]">
                  Guest & Reservation
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">
                  Property
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">
                  Dates
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[130px]">
                  Platform
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[80px]">
                  Nights
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Revenue
                </th>
                <th className="sticky right-0 bg-gray-50/95 backdrop-blur-sm px-6 py-4 min-w-[60px] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBookings.map((booking, index) => (
                <motion.tr
                  key={booking.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  onClick={() => handleViewBooking(booking.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {booking.guestName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{booking.guestName}</div>
                        <div className="text-sm font-mono text-gray-500">{booking.reservationCode}</div>
                        {booking.listingName && (
                          <div className="text-xs text-gray-400 truncate max-w-[150px]">{booking.listingName}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{booking.propertyName || 'Unknown Property'}</div>
                      {booking.propertyAddress && (
                        <div className="text-sm text-gray-500 truncate max-w-[160px]">{booking.propertyAddress}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
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
                    <span className="text-sm font-semibold text-gray-900">{booking.numNights}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(booking.totalPayout)}
                    </div>
                    {booking.netEarnings && (
                      <div className="text-xs text-gray-500">
                        Net: {formatCurrency(booking.netEarnings)}
                      </div>
                    )}
                  </td>
                  <td className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]" onClick={(e) => e.stopPropagation()}>
                    <TableActionsDropdown
                      actions={getBookingActions(booking)}
                      itemId={booking.id}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredBookings.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarDaysIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No bookings found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchTerm || platformFilter !== 'All Platforms' || propertyFilter !== 'All Properties'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first booking or uploading booking data.'}
              </p>
              {!searchTerm && platformFilter === 'All Platforms' && propertyFilter === 'All Properties' && (
                <div className="flex justify-center gap-3">
                  <motion.button
                    onClick={() => setShowCreateModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Booking
                  </motion.button>
                  <a
                    href="/property-manager/upload-bookings"
                    className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Upload Bookings
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredBookings.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{filteredBookings.length}</span> of{' '}
              <span className="font-medium text-gray-700">{bookings.length}</span> bookings
            </p>
          </div>
        )}
      </motion.div>

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
