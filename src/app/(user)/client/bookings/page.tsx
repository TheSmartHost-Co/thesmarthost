'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  MoonIcon,
  ChartBarIcon,
  FunnelIcon,
  XMarkIcon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
} from '@heroicons/react/24/outline'
import { getClientPortalBookings } from '@/services/clientPortalService'
import { getPlatformBadge, formatPlatformName } from '@/components/client-portal/shared/platformUtils'
import PreviewClientBookingModal from '@/components/client-portal/booking/PreviewClientBookingModal'
import { parseLocalDate } from '@/utils/dateUtils'
import type { ClientPortalBooking } from '@/services/types/clientPortal'

// Sort configuration
type SortField = 'guestName' | 'checkInDate' | 'numNights'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

const SORT_OPTIONS: { field: SortField; label: string; ascLabel: string; descLabel: string }[] = [
  { field: 'guestName', label: 'Guest Name', ascLabel: 'A → Z', descLabel: 'Z → A' },
  { field: 'checkInDate', label: 'Check-in Date', ascLabel: 'Oldest first', descLabel: 'Newest first' },
  { field: 'numNights', label: 'Nights', ascLabel: 'Low → High', descLabel: 'High → Low' },
]

export default function ClientBookingsPage() {
  const { t } = useTranslation('clientPortal')
  const [bookings, setBookings] = useState<ClientPortalBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Filter & sort state
  const [platformFilter, setPlatformFilter] = useState('All')
  const [propertyFilter, setPropertyFilter] = useState('All')
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [showSortPopover, setShowSortPopover] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'checkInDate', direction: 'desc' })
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  const sortPopoverRef = useRef<HTMLDivElement>(null)

  // Preview modal state
  const [selectedBooking, setSelectedBooking] = useState<ClientPortalBooking | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const filters: { startDate?: string; endDate?: string } = {}
        if (startDate) filters.startDate = startDate
        if (endDate) filters.endDate = endDate
        const res = await getClientPortalBookings(filters)
        if (res.status === 'success') {
          setBookings(res.data)
        }
      } catch (err) {
        console.error('Failed to load bookings:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [startDate, endDate])

  // Close popovers on outside click
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

  // Unique property names for filter
  const uniqueProperties = useMemo(() => {
    return Array.from(
      new Set(bookings.map(b => b.propertyName).filter(name => name && name.trim() !== ''))
    ).sort()
  }, [bookings])

  // Unique platform values for filter
  const uniquePlatforms = useMemo(() => {
    return Array.from(
      new Set(bookings.map(b => b.platform).filter(Boolean) as string[])
    ).sort()
  }, [bookings])

  // Filter + search + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return bookings
      .filter((b) => {
        const matchesSearch = !q ||
          (b.guestName?.toLowerCase().includes(q) ?? false) ||
          (b.propertyName?.toLowerCase().includes(q) ?? false) ||
          (b.reservationCode?.toLowerCase().includes(q) ?? false)

        const matchesPlatform = platformFilter === 'All' || b.platform === platformFilter

        const matchesProperty = propertyFilter === 'All' || b.propertyName === propertyFilter

        return matchesSearch && matchesPlatform && matchesProperty
      })
      .sort((a, b) => {
        const { field, direction } = sortConfig
        const multiplier = direction === 'asc' ? 1 : -1

        switch (field) {
          case 'guestName':
            return multiplier * (a.guestName || '').localeCompare(b.guestName || '')
          case 'checkInDate':
            return multiplier * (parseLocalDate(a.checkInDate).getTime() - parseLocalDate(b.checkInDate).getTime())
          case 'numNights':
            return multiplier * ((a.numNights || 0) - (b.numNights || 0))
          default:
            return 0
        }
      })
  }, [bookings, search, platformFilter, propertyFilter, sortConfig])

  // Stats computed from filtered bookings
  const stats = useMemo(() => {
    const totalBookings = filtered.length
    const totalNights = filtered.reduce((sum, b) => sum + Number(b.numNights || 0), 0)
    const platforms = new Set(filtered.map(b => b.platform).filter(Boolean))
    return { totalBookings, totalNights, platformsCount: platforms.size }
  }, [filtered])

  // Active filter count
  const activeFiltersCount = [
    platformFilter !== 'All',
    propertyFilter !== 'All',
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setPlatformFilter('All')
    setPropertyFilter('All')
  }

  const getCurrentSortLabel = () => {
    const option = SORT_OPTIONS.find(o => o.field === sortConfig.field)
    if (!option) return 'Sort'
    const directionLabel = sortConfig.direction === 'asc' ? option.ascLabel : option.descLabel
    return `${option.label}: ${directionLabel}`
  }

  const formatDate = (dateString: string) => {
    return parseLocalDate(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const statusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const handleViewBooking = (booking: ClientPortalBooking) => {
    setSelectedBooking(booking)
    setShowPreviewModal(true)
  }

  const statCards = [
    {
      label: t('totalBookings'),
      value: stats.totalBookings,
      icon: CalendarDaysIcon,
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100',
    },
    {
      label: t('totalNights'),
      value: stats.totalNights,
      icon: MoonIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: t('platforms'),
      value: stats.platformsCount,
      icon: ChartBarIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('bookingsTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('bookingsSubtitle')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Search, Filters & Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Search and Filters Bar */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all text-sm"
                placeholder={t('searchBookingsPlaceholder')}
              />
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Sort Button with Popover */}
            <div className="relative" ref={sortPopoverRef}>
              <motion.button
                onClick={() => setShowSortPopover(!showSortPopover)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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
                                    ? 'bg-emerald-600 text-white'
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
                                    ? 'bg-emerald-600 text-white'
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
                className="inline-flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-emerald-600 rounded-full">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                        <select
                          value={platformFilter}
                          onChange={(e) => setPlatformFilter(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          <option value="All">All Platforms</option>
                          {uniquePlatforms.map((p) => (
                            <option key={p} value={p}>{formatPlatformName(p)}</option>
                          ))}
                        </select>
                      </div>

                      {/* Property Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                        <select
                          value={propertyFilter}
                          onChange={(e) => setPropertyFilter(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          <option value="All">All Properties</option>
                          {uniqueProperties.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Filter Actions */}
                    {activeFiltersCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={clearAllFilters}
                          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
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
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500">Loading bookings...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CalendarDaysIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('noBookingsFound')}</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              {search || platformFilter !== 'All' || propertyFilter !== 'All' || startDate || endDate
                ? 'Try adjusting your search or filter criteria.'
                : 'No bookings are available for your properties yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[260px]">
                    Guest & Property
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">
                    Dates
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[130px]">
                    Platform
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[80px]">
                    Nights
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b, index) => (
                  <motion.tr
                    key={b.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className={`hover:bg-emerald-50/50 cursor-pointer transition-colors group ${b.bookingStatus === 'cancelled' ? 'opacity-60' : ''}`}
                    onClick={() => handleViewBooking(b)}
                  >
                    {/* Guest & Property */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                            <span className="text-white font-semibold text-sm">
                              {b.guestName ? b.guestName.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            {b.guestName || 'Unknown Guest'}
                            {b.bookingStatus === 'cancelled' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                                Cancelled
                              </span>
                            )}
                          </div>
                          {b.reservationCode && (
                            <div className="text-xs text-gray-400 font-mono">{b.reservationCode}</div>
                          )}
                          <div className="text-xs text-gray-500 truncate max-w-[180px]">{b.propertyName}</div>
                        </div>
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(b.checkInDate)}
                      </div>
                      {b.checkOutDate && (
                        <div className="text-sm text-gray-500">
                          to {formatDate(b.checkOutDate)}
                        </div>
                      )}
                    </td>

                    {/* Platform */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {b.platform ? getPlatformBadge(b.platform) : <span className="text-sm text-gray-400">-</span>}
                    </td>

                    {/* Nights */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">{b.numNights ?? '-'}</span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(b.bookingStatus)}`}>
                        {b.bookingStatus ? b.bookingStatus.charAt(0).toUpperCase() + b.bookingStatus.slice(1) : 'N/A'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Results count */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{filtered.length}</span> of{' '}
              <span className="font-medium text-gray-700">{bookings.length}</span> bookings
            </p>
          </div>
        )}
      </motion.div>

      {/* Preview Booking Modal */}
      {selectedBooking && (
        <PreviewClientBookingModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
        />
      )}
    </div>
  )
}
