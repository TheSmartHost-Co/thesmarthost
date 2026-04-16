'use client'

import { motion } from 'framer-motion'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { BookingDrilldownData } from '@/services/types/bookingAnalytics'
import type { CrossFilter } from './useBookingTimeline'
import { getChannelDisplayName } from '@/services/channelUtils'

interface BookingInlineTableProps {
  data: BookingDrilldownData | null
  isLoading: boolean
  crossFilter: CrossFilter | null
  onClearCrossFilter: () => void
  onPageChange: (page: number) => void
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

const formatDate = (date: string) =>
  new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const formatShortDate = (date: string) =>
  new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const crossFilterLabel = (cf: CrossFilter): string => {
  switch (cf.source) {
    case 'property': return 'Property'
    case 'channel': return 'Channel'
    case 'sourceType': return 'Source'
    case 'client': return 'Client'
    case 'timeline': return 'Period'
    default: return 'Filter'
  }
}

export default function BookingInlineTable({
  data,
  isLoading,
  crossFilter,
  onClearCrossFilter,
  onPageChange,
}: BookingInlineTableProps) {
  const bookings = data?.bookings ?? []
  const pagination = data?.pagination ?? null

  return (
    <div className="border-t border-gray-100 px-5 pb-5 pt-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Booking Details
          {pagination && (
            <span className="ml-2 font-normal text-gray-400">
              ({pagination.total} total)
            </span>
          )}
        </h4>

        {crossFilter && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
          >
            Filtered by: {crossFilterLabel(crossFilter)}
            <button onClick={onClearCrossFilter} className="rounded-full p-0.5 hover:bg-blue-100">
              <XMarkIcon className="h-3 w-3" />
            </button>
          </motion.span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && bookings.length === 0 && (
        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-8">
          <p className="text-sm text-gray-400">No bookings found</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && bookings.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-100 sm:block">
            <table className="w-full min-w-[900px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Guest</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Property</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Dates</th>
                  <th className="px-3 py-2.5 text-center font-medium text-gray-500">Nights</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Channel</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Source</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500">Payout</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500">Net</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500">Mgmt Fee</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500">Ch. Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map(booking => (
                  <tr key={booking.id} className="transition-colors hover:bg-gray-50/80">
                    <td className="max-w-[120px] truncate px-3 py-2.5 text-gray-700">
                      <div>
                        <p className="truncate font-medium">{booking.guestName || '—'}</p>
                        <p className="truncate text-[10px] text-gray-400">{booking.reservationCode}</p>
                      </div>
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2.5 text-gray-700">
                      {booking.propertyName}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                      {formatShortDate(booking.checkInDate)} – {formatShortDate(booking.checkOutDate)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{booking.numNights}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                        {getChannelDisplayName(booking.platform)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {booking.source}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(booking.totalPayout)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-700">
                      {formatCurrency(booking.netEarnings)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600">
                      {formatCurrency(booking.mgmtFee)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600">
                      {formatCurrency(booking.channelFee)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 sm:hidden">
            {bookings.map(booking => (
              <div key={booking.id} className="px-3 py-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500">
                        {formatShortDate(booking.checkInDate)} – {formatShortDate(booking.checkOutDate)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-600">
                        {getChannelDisplayName(booking.platform)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-gray-700">
                      {booking.guestName || booking.reservationCode}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">{booking.propertyName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-gray-900">{formatCurrency(booking.totalPayout)}</p>
                    <p className="text-[10px] text-gray-500">{booking.numNights} nights</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeftIcon className="h-3 w-3" />
                  Prev
                </button>
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRightIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
