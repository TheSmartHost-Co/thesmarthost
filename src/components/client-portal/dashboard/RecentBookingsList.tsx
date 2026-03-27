'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { getPlatformBadge } from '../shared/platformUtils'
import type { ClientPortalBookingSummary } from '@/services/types/clientPortal'

interface RecentBookingsListProps {
  bookings: ClientPortalBookingSummary[]
}

const statusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'confirmed': return 'bg-green-100 text-green-700'
    case 'pending': return 'bg-amber-100 text-amber-700'
    case 'cancelled': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function getGuestInitial(name?: string): string {
  if (!name || name === '?' || name.toLowerCase() === 'reserved') return '?'
  return name.charAt(0).toUpperCase()
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export const RecentBookingsList: React.FC<RecentBookingsListProps> = ({ bookings }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl bg-white shadow-sm border border-gray-100"
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
        <Link
          href="/client/bookings"
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          View All
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
      {bookings.length === 0 ? (
        <div className="p-5 text-center text-sm text-gray-400">No recent bookings</div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {bookings.slice(0, 5).map((b) => (
            <li key={b.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">{getGuestInitial(b.guestName)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {b.guestName || 'No guest name'}
                  </p>
                  {b.platform && getPlatformBadge(b.platform)}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {b.propertyName} &middot; {formatDate(b.checkInDate)} &ndash; {formatDate(b.checkOutDate)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(b.bookingStatus)}`}>
                  {b.bookingStatus || 'N/A'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
