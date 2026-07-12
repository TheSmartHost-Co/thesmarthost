"use client"

import { notifyError } from '@/utils/notify'
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
  ChartBarIcon,
  CloudArrowDownIcon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
} from '@heroicons/react/24/outline'
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/solid'
import { getBookings, calculateBookingStats, formatCurrency, formatPlatformName, cancelBooking } from '@/services/bookingService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { XCircleIcon } from '@heroicons/react/24/outline'
import { getConnectionByUserId } from '@/services/hostawayConnectionService'
import { getProperties } from '@/services/propertyService'
import { Booking } from '@/services/types/booking'
import { HostawayConnection } from '@/services/types/hostawayConnection'
import { Property } from '@/services/types/property'
import { useUserStore } from '@/store/useUserStore'
import { useTranslation } from 'react-i18next'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { parseLocalDate } from '@/utils/dateUtils'
import { isReservedName } from '@/utils/bookingUtils'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import CreateBookingModal from '@/components/booking/create/createBookingModal'
import UpdateBookingModal from '@/components/booking/update/updateBookingModal'
import DeleteBookingModal from '@/components/booking/delete/deleteBookingModal'
import PreviewBookingModal from '@/components/booking/preview/previewBookingModal'
import ImportHostawayBookingsModal from '@/components/booking/import/ImportHostawayBookingsModal'
import Modal from '@/components/shared/modal'

// Date filter type options
type DateFilterField = 'checkInDate' | 'checkOutDate' | 'createdAt'

const DATE_FILTER_OPTIONS: { value: DateFilterField; label: string }[] = [
  { value: 'checkInDate', label: 'Check-in Date' },
  { value: 'checkOutDate', label: 'Check-out Date' },
  { value: 'createdAt', label: 'Created Date' },
]

// Date preset helpers
function getPresetRange(preset: string): { start: string; end: string } {
  const today = new Date()
  const yyyy = (d: Date) => d.getFullYear()
  const mm = (d: Date) => String(d.getMonth() + 1).padStart(2, '0')
  const dd = (d: Date) => String(d.getDate()).padStart(2, '0')
  const fmt = (d: Date) => `${yyyy(d)}-${mm(d)}-${dd(d)}`

  switch (preset) {
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: fmt(start), end: fmt(end) }
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: fmt(start), end: fmt(end) }
    }
    case 'last30': {
      const start = new Date(today)
      start.setDate(start.getDate() - 30)
      return { start: fmt(start), end: fmt(today) }
    }
    case 'last90': {
      const start = new Date(today)
      start.setDate(start.getDate() - 90)
      return { start: fmt(start), end: fmt(today) }
    }
    case 'ytd': {
      const start = new Date(today.getFullYear(), 0, 1)
      return { start: fmt(start), end: fmt(today) }
    }
    default:
      return { start: '', end: '' }
  }
}

const DATE_PRESETS = [
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'last90', label: 'Last 90 Days' },
  { key: 'ytd', label: 'Year to Date' },
]

// Sort configuration type
type SortField = 'guestName' | 'propertyName' | 'checkInDate' | 'checkOutDate' | 'platform' | 'numNights' | 'totalPayout'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

// Sort field options with labels
const SORT_OPTIONS: { field: SortField; label: string; ascLabel: string; descLabel: string }[] = [
  { field: 'guestName', label: 'Guest Name', ascLabel: 'A → Z', descLabel: 'Z → A' },
  { field: 'propertyName', label: 'Property Name', ascLabel: 'A → Z', descLabel: 'Z → A' },
  { field: 'checkInDate', label: 'Check-in Date', ascLabel: 'Oldest first', descLabel: 'Newest first' },
  { field: 'checkOutDate', label: 'Check-out Date', ascLabel: 'Oldest first', descLabel: 'Newest first' },
  { field: 'platform', label: 'Platform', ascLabel: 'A → Z', descLabel: 'Z → A' },
  { field: 'numNights', label: 'Nights', ascLabel: 'Low → High', descLabel: 'High → Low' },
  { field: 'totalPayout', label: 'Revenue', ascLabel: 'Low → High', descLabel: 'High → Low' },
]

export default function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [platformFilter, setPlatformFilter] = useState('All Platforms')
  const [propertyFilter, setPropertyFilter] = useState('All Properties')
  const [readinessFilter, setReadinessFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All Sources')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [dateFilterType, setDateFilterType] = useState<DateFilterField>('checkInDate')
  const [dateFilterStart, setDateFilterStart] = useState('')
  const [dateFilterEnd, setDateFilterEnd] = useState('')
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null)
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [showSortPopover, setShowSortPopover] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'checkInDate', direction: 'desc' })
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  const sortPopoverRef = useRef<HTMLDivElement>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cancel booking state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingBooking, setCancellingBooking] = useState(false)
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Import Hostaway bookings state
  const [showImportModal, setShowImportModal] = useState(false)
  const [hostawayConnection, setHostawayConnection] = useState<HostawayConnection | null>(null)
  const [properties, setProperties] = useState<Property[]>([])

  const { profile } = useUserStore()
  const { t } = useTranslation('bookings')
  usePermissionGuard('bookings')
  const { effectiveUserId, canWrite } = usePermissions()

  useEffect(() => {
    const fetchBookings = async () => {
      if (!effectiveUserId) return

      try {
        setLoading(true)
        const response = await getBookings({ userId: effectiveUserId })
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
  }, [effectiveUserId])

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilterPopover(false)
      }
      if (sortPopoverRef.current && !sortPopoverRef.current.contains(event.target as Node)) {
        setShowSortPopover(false)
      }
    }

    if (showFilterPopover || showSortPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterPopover, showSortPopover])

  // Fetch Hostaway connection and properties for import modal
  useEffect(() => {
    const fetchConnectionAndProperties = async () => {
      if (!effectiveUserId) return

      try {
        // Fetch Hostaway connection
        const connectionRes = await getConnectionByUserId(effectiveUserId)
        if (connectionRes.status === 'success' && connectionRes.data) {
          setHostawayConnection(connectionRes.data)
        }

        // Fetch properties for mapping
        const propertiesRes = await getProperties(effectiveUserId)
        if (propertiesRes.status === 'success') {
          setProperties(propertiesRes.data)
        }
      } catch (err) {
        console.error('Error fetching connection/properties:', err)
      }
    }

    fetchConnectionAndProperties()
  }, [effectiveUserId])

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
    setBookings(prev => prev.map(b => {
      if (b.id !== updatedBooking.id) return b

      // Merge updated booking with existing property info that may not be in the API response
      // If property changed, look up the new property name from properties list
      const isSameProperty = b.propertyId === updatedBooking.propertyId
      const newProperty = !isSameProperty ? properties.find(p => p.id === updatedBooking.propertyId) : null

      return {
        ...updatedBooking,
        // Preserve or update property display fields
        propertyName: isSameProperty ? b.propertyName : (newProperty?.listingName || newProperty?.address || updatedBooking.propertyName),
        propertyAddress: isSameProperty ? b.propertyAddress : (newProperty?.address || updatedBooking.propertyAddress),
        listingName: isSameProperty ? b.listingName : (newProperty?.listingName || updatedBooking.listingName),
      }
    }))
  }

  const handleBookingsImported = () => {
    // Refresh bookings list after import
    if (effectiveUserId) {
      getBookings({ userId: effectiveUserId }).then((response) => {
        if (response.status === 'success') {
          setBookings(response.data)
        }
      })
    }
  }

  const handleCancelBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (booking) {
      setSelectedBooking(booking)
      setShowCancelModal(true)
    }
  }

  const confirmCancelBooking = async () => {
    if (!selectedBooking || !effectiveUserId) return
    try {
      setCancellingBooking(true)
      const res = await cancelBooking(selectedBooking.id, effectiveUserId)
      if (res.status === 'success') {
        setBookings(prev => prev.map(b =>
          b.id === selectedBooking.id ? { ...b, bookingStatus: 'cancelled' } : b
        ))
        showNotification('Booking cancelled successfully', 'success')
        setShowCancelModal(false)
        setSelectedBooking(null)
      } else {
        showNotification(res.message || 'Failed to cancel booking', 'error')
      }
    } catch (err) {
      console.error('Error cancelling booking:', err)
      notifyError(err, 'Failed to cancel booking')
    } finally {
      setCancellingBooking(false)
    }
  }

  // Get current sort label for button display
  const getCurrentSortLabel = () => {
    const option = SORT_OPTIONS.find(o => o.field === sortConfig.field)
    if (!option) return 'Sort'
    const directionLabel = sortConfig.direction === 'asc' ? option.ascLabel : option.descLabel
    return `${option.label}: ${directionLabel}`
  }

  const getBookingActions = (booking: Booking): ActionItem[] => {
    if (booking.bookingStatus === 'cancelled') {
      return [{
        label: 'View Booking',
        icon: EyeIcon,
        onClick: () => handleViewBooking(booking.id),
        variant: 'default'
      }]
    }
    const actions: ActionItem[] = [
      {
        label: 'View Booking',
        icon: EyeIcon,
        onClick: () => handleViewBooking(booking.id),
        variant: 'default'
      },
    ]
    if (canWrite('bookings')) {
      actions.push(
        {
          label: 'Edit Booking',
          icon: PencilIcon,
          onClick: () => handleEditBooking(booking.id),
          variant: 'default'
        },
        {
          label: 'Cancel Booking',
          icon: XCircleIcon,
          onClick: () => handleCancelBooking(booking.id),
          variant: 'danger'
        },
        {
          label: 'Delete Booking',
          icon: TrashIcon,
          onClick: () => handleDeleteBooking(booking.id),
          variant: 'danger'
        }
      )
    }
    return actions
  }

  // Filter and sort bookings
  const filteredBookings = bookings
    .filter(booking => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = booking.guestName.toLowerCase().includes(searchLower) ||
        booking.reservationCode.toLowerCase().includes(searchLower) ||
        (booking.propertyName && booking.propertyName.toLowerCase().includes(searchLower)) ||
        (booking.listingName && booking.listingName.toLowerCase().includes(searchLower))

      const matchesPlatform = platformFilter === 'All Platforms' ||
        formatPlatformName(booking.platform) === platformFilter

      const matchesProperty = propertyFilter === 'All Properties' ||
        booking.propertyName === propertyFilter

      const matchesReadiness = readinessFilter === 'All' ||
        (readinessFilter === 'Report Ready' && booking.financialReadiness !== 'scheduling_only') ||
        (readinessFilter === 'Scheduling Only' && booking.financialReadiness === 'scheduling_only')

      const matchesSource = sourceFilter === 'All Sources' ||
        (sourceFilter === 'Auto-Imported' && booking.source === 'webhook' && booking.isAutoImported === true) ||
        (sourceFilter === 'Webhook (Reviewed)' && booking.source === 'webhook' && !booking.isAutoImported) ||
        (sourceFilter === 'CSV Upload' && booking.source === 'csv') ||
        (sourceFilter === 'Manual' && booking.source === 'manual') ||
        (sourceFilter === 'iCal' && booking.source === 'ical')

      const matchesStatus = statusFilter === 'All' ||
        (statusFilter === 'Active' && booking.bookingStatus !== 'cancelled') ||
        (statusFilter === 'Cancelled' && booking.bookingStatus === 'cancelled')

      // Date filtering
      let matchesDate = true
      if (dateFilterStart || dateFilterEnd) {
        let bookingDateStr: string | undefined
        if (dateFilterType === 'checkInDate') {
          bookingDateStr = booking.checkInDate
        } else if (dateFilterType === 'checkOutDate') {
          bookingDateStr = booking.checkOutDate
        } else if (dateFilterType === 'createdAt') {
          // createdAt is ISO datetime — extract YYYY-MM-DD
          bookingDateStr = booking.createdAt?.split('T')[0]
        }

        if (!bookingDateStr) {
          matchesDate = false
        } else {
          if (dateFilterStart && bookingDateStr < dateFilterStart) matchesDate = false
          if (dateFilterEnd && bookingDateStr > dateFilterEnd) matchesDate = false
        }
      }

      return matchesSearch && matchesPlatform && matchesProperty && matchesReadiness && matchesSource && matchesStatus && matchesDate
    })
    .sort((a, b) => {
      const { field, direction } = sortConfig
      const multiplier = direction === 'asc' ? 1 : -1

      switch (field) {
        case 'guestName':
          return multiplier * a.guestName.localeCompare(b.guestName)
        case 'propertyName':
          return multiplier * (a.propertyName || '').localeCompare(b.propertyName || '')
        case 'checkInDate':
          return multiplier * (parseLocalDate(a.checkInDate).getTime() - parseLocalDate(b.checkInDate).getTime())
        case 'checkOutDate':
          return multiplier * (parseLocalDate(a.checkOutDate || a.checkInDate).getTime() - parseLocalDate(b.checkOutDate || b.checkInDate).getTime())
        case 'platform':
          return multiplier * a.platform.localeCompare(b.platform)
        case 'numNights':
          return multiplier * (a.numNights - b.numNights)
        case 'totalPayout':
          return multiplier * ((a.totalPayout || 0) - (b.totalPayout || 0))
        default:
          return 0
      }
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

  // Count active filters (excluding date — date has its own clear)
  const activeFiltersCount = [
    platformFilter !== 'All Platforms',
    propertyFilter !== 'All Properties',
    readinessFilter !== 'All',
    sourceFilter !== 'All Sources',
    statusFilter !== 'Active'
  ].filter(Boolean).length

  const isDateFilterActive = dateFilterStart !== '' || dateFilterEnd !== ''

  // Clear all filters
  const clearAllFilters = () => {
    setPlatformFilter('All Platforms')
    setPropertyFilter('All Properties')
    setReadinessFilter('All')
    setSourceFilter('All Sources')
    setStatusFilter('Active')
  }

  const clearDateFilter = () => {
    setDateFilterStart('')
    setDateFilterEnd('')
    setActiveDatePreset(null)
  }

  const applyDatePreset = (presetKey: string) => {
    if (activeDatePreset === presetKey) {
      // Toggle off
      clearDateFilter()
      return
    }
    const { start, end } = getPresetRange(presetKey)
    setDateFilterStart(start)
    setDateFilterEnd(end)
    setActiveDatePreset(presetKey)
  }

  // When user manually changes date inputs, clear the preset highlight
  const handleDateStartChange = (value: string) => {
    setDateFilterStart(value)
    setActiveDatePreset(null)
  }
  const handleDateEndChange = (value: string) => {
    setDateFilterEnd(value)
    setActiveDatePreset(null)
  }

  const formatDate = (dateString: string) => {
    return parseLocalDate(dateString).toLocaleDateString('en-CA', {
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
        <div className="flex items-center gap-3">
          {canWrite('bookings') && hostawayConnection && (
            <motion.button
              onClick={() => setShowImportModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <CloudArrowDownIcon className="h-5 w-5 mr-2" />
              Import from Hostaway
            </motion.button>
          )}
          {canWrite('bookings') && (
            <motion.button
              onClick={() => setShowCreateModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Booking
            </motion.button>
          )}
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

            {/* Sort Button with Popover */}
            <div className="relative" ref={sortPopoverRef}>
              <motion.button
                onClick={() => setShowSortPopover(!showSortPopover)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {sortConfig.direction === 'desc' ? (
                  <BarsArrowDownIcon className="h-4 w-4 mr-2" />
                ) : (
                  <BarsArrowUpIcon className="h-4 w-4 mr-2" />
                )}
                <span className="hidden sm:inline">{getCurrentSortLabel()}</span>
                <span className="sm:hidden">Sort</span>
              </motion.button>

              {showSortPopover && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Sort by</h3>
                      <button
                        onClick={() => setShowSortPopover(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {SORT_OPTIONS.map((option) => {
                        const isSelected = sortConfig.field === option.field
                        return (
                          <div key={option.field} className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 pt-2">
                              {option.label}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSortConfig({ field: option.field, direction: 'asc' })
                                  setShowSortPopover(false)
                                }}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  isSelected && sortConfig.direction === 'asc'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {option.ascLabel}
                              </button>
                              <button
                                onClick={() => {
                                  setSortConfig({ field: option.field, direction: 'desc' })
                                  setShowSortPopover(false)
                                }}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  isSelected && sortConfig.direction === 'desc'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {option.descLabel}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
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

                      {/* Financial Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Financial Status
                        </label>
                        <select
                          value={readinessFilter}
                          onChange={(e) => setReadinessFilter(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          <option value="All">All</option>
                          <option value="Report Ready">Report Ready</option>
                          <option value="Scheduling Only">Scheduling Only</option>
                        </select>
                      </div>

                      {/* Source Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Source
                        </label>
                        <select
                          value={sourceFilter}
                          onChange={(e) => setSourceFilter(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          <option value="All Sources">All Sources</option>
                          <option value="CSV Upload">CSV Upload</option>
                          <option value="Manual">Manual</option>
                          <option value="Webhook (Reviewed)">Webhook (Reviewed)</option>
                          <option value="Auto-Imported">Auto-Imported</option>
                          <option value="iCal">iCal</option>
                        </select>
                      </div>

                      {/* Booking Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Booking Status
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          <option value="Active">Active</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="All">All</option>
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

        {/* Date Filter Section */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/30">
          <div className="flex flex-wrap items-center gap-2.5">
            <CalendarDaysIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as DateFilterField)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {DATE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilterStart}
              onChange={(e) => handleDateStartChange(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-[150px]"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={dateFilterEnd}
              onChange={(e) => handleDateEndChange(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-[150px]"
            />

            {isDateFilterActive && (
              <button
                onClick={clearDateFilter}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
                Clear
              </button>
            )}

            <div className="flex-1" />

            <div className="flex flex-wrap items-center gap-1.5">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => applyDatePreset(preset.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeDatePreset === preset.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
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
                <tr
                  key={booking.id}
                  className={`hover:bg-blue-50/50 cursor-pointer transition-colors group ${booking.bookingStatus === 'cancelled' ? 'opacity-60' : ''}`}
                  onClick={() => handleViewBooking(booking.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                          <span className="text-white font-semibold text-sm">
                            {isReservedName(booking.guestName) ? '?' : booking.guestName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {booking.isAutoImported && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center ring-2 ring-white" title="Auto-Imported">
                            <ArrowDownOnSquareIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 flex items-center gap-1.5">
                          {isReservedName(booking.guestName) ? '' : booking.guestName}
                          {booking.bookingStatus === 'cancelled' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                              Cancelled
                            </span>
                          )}
                          {booking.financialReadiness === 'scheduling_only' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                              Scheduling
                            </span>
                          )}
                        </div>
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
                    {booking.financialReadiness === 'scheduling_only' ? (
                      <span className="text-sm text-gray-400">—</span>
                    ) : (
                      <>
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(booking.totalPayout)}
                        </div>
                        {booking.netEarnings && (
                          <div className="text-xs text-gray-500">
                            Net: {formatCurrency(booking.netEarnings)}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]" onClick={(e) => e.stopPropagation()}>
                    <TableActionsDropdown
                      actions={getBookingActions(booking)}
                      itemId={booking.id}
                    />
                  </td>
                </tr>
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
                {searchTerm || platformFilter !== 'All Platforms' || propertyFilter !== 'All Properties' || readinessFilter !== 'All' || sourceFilter !== 'All Sources' || statusFilter !== 'Active'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first booking or uploading booking data.'}
              </p>
              {!searchTerm && platformFilter === 'All Platforms' && propertyFilter === 'All Properties' && readinessFilter === 'All' && sourceFilter === 'All Sources' && statusFilter === 'Active' && (
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

      {/* Cancel Booking Confirmation Modal */}
      {selectedBooking && (
        <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} style="p-6 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Booking</h3>
            <p className="text-sm text-gray-600 mb-1">
              Are you sure you want to cancel <strong>{selectedBooking.guestName}</strong>&apos;s booking?
            </p>
            <p className="text-xs text-gray-500 mb-6">
              This will also cancel any associated cleaning projects.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={confirmCancelBooking}
                disabled={cancellingBooking}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancellingBooking ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Preview Booking Modal */}
      {selectedBooking && (
        <PreviewBookingModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          booking={selectedBooking}
          onEditBooking={canWrite('bookings') ? () => {
            setShowPreviewModal(false)
            setShowUpdateModal(true)
          } : undefined}
        />
      )}

      {/* Import Hostaway Bookings Modal */}
      {hostawayConnection && (
        <ImportHostawayBookingsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          connection={hostawayConnection}
          properties={properties}
          onImportComplete={handleBookingsImported}
        />
      )}
    </div>
  )
}
