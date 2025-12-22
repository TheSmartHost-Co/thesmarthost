'use client'

import { useState } from 'react'
import type { AnalyticsBookingsData } from '@/store/useAnalyticsStore'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  ArrowDownTrayIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline'

interface DrillDownSectionProps {
  data: AnalyticsBookingsData | null
  isLoading: boolean
  error: string | null
  onLoadMore?: (page: number) => void
}

export function DrillDownSection({ data, isLoading, error, onLoadMore }: DrillDownSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAllBookings, setShowAllBookings] = useState(false)

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-700">
          <h3 className="font-medium">Unable to load booking details</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="grid grid-cols-6 gap-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data || !data.bookings || data.bookings.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          <TableCellsIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No booking data available for the selected filters</p>
          <p className="text-sm mt-1">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleExportCSV = () => {
    if (!data.bookings) return

    const headers = [
      'Reservation Code',
      'Guest Name', 
      'Property',
      'Check-in Date',
      'Nights',
      'Platform',
      'Nightly Rate',
      'Total Payout',
      'Net Earnings'
    ]

    const csvContent = [
      headers.join(','),
      ...data.bookings.map(booking => [
        booking.reservation_code,
        `"${booking.guest_name}"`,
        `"${booking.property_name}"`,
        formatDate(booking.check_in_date),
        booking.num_nights,
        booking.platform,
        booking.nightly_rate,
        booking.total_payout,
        booking.net_earnings
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bookings-${data.filters.startDate}-to-${data.filters.endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const displayedBookings = showAllBookings ? data.bookings : data.bookings.slice(0, 10)
  const hasMoreBookings = data.bookings.length > 10

  return (
    <div className="bg-white rounded-lg shadow">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Booking Details Used in This Analysis
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {data.pagination.total} bookings found for the selected period
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronDownIcon className="w-4 h-4 mr-2" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronRightIcon className="w-4 h-4 mr-2" />
                  View Details
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview/Summary */}
      <div className="p-6 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{data.pagination.total}</div>
            <div className="text-gray-600">Total Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {data.operational_stats.avg_nights_per_stay.toFixed(1)}
            </div>
            <div className="text-gray-600">Avg Nights</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.bookings.reduce((sum, b) => sum + b.total_payout, 0))}
            </div>
            <div className="text-gray-600">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.bookings.reduce((sum, b) => sum + b.net_earnings, 0))}
            </div>
            <div className="text-gray-600">Net Earnings</div>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reservation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guest & Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates & Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financials
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.reservation_code}
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.csv_file_name ? 'CSV Import' : 'Manual Entry'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.guest_name}
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-40">
                      {booking.property_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(booking.check_in_date)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.num_nights} nights
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full uppercase">
                      {booking.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(booking.total_payout)}
                    </div>
                    <div className="text-sm text-green-600">
                      {formatCurrency(booking.net_earnings)} net
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Show More/Less Button */}
          {hasMoreBookings && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
              <button
                onClick={() => setShowAllBookings(!showAllBookings)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                {showAllBookings ? (
                  <>
                    <ChevronDownIcon className="w-4 h-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronRightIcon className="w-4 h-4 mr-2" />
                    Show All {data.bookings.length} Bookings
                  </>
                )}
              </button>
            </div>
          )}

          {/* Pagination Info */}
          {data.pagination.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  Showing {data.pagination.limit} of {data.pagination.total} bookings
                </div>
                <div>
                  Page {data.pagination.page} of {data.pagination.total_pages}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}