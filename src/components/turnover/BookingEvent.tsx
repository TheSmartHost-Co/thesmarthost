'use client'

import { UserIcon } from '@heroicons/react/24/outline'
import type { Booking } from '@/services/types/booking'

interface BookingEventProps {
  booking: Booking
}

// Platform color mapping
function getPlatformConfig(platform: string): { bg: string; border: string; text: string; label: string } {
  switch (platform) {
    case 'airbnb':
      return { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-700', label: 'Airbnb' }
    case 'booking':
      return { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', label: 'Booking.com' }
    case 'vrbo':
      return { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-700', label: 'VRBO' }
    case 'direct':
    case 'direct-etransfer':
      return { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', label: 'Direct' }
    case 'google':
      return { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', label: 'Google' }
    case 'wechalet':
      return { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-700', label: 'WeChalet' }
    case 'monsieurchalets':
      return { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', label: 'MonsieurChalets' }
    default:
      return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', label: platform || 'Unknown' }
  }
}

// Format date as "Feb 23"
function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function BookingEvent({ booking }: BookingEventProps) {
  const config = getPlatformConfig(booking.platform)

  return (
    <div
      className={`
        group relative w-full rounded-lg border-l-4 px-2.5 py-1.5 cursor-pointer
        transition-all hover:shadow-md hover:scale-[1.02]
        ${config.bg} ${config.border}
      `}
    >
      {/* Guest name */}
      <div className="flex items-center gap-1.5">
        <UserIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <span className={`text-xs font-semibold truncate ${config.text}`}>
          {booking.guestName}
        </span>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[10px] text-gray-500">
          {formatShortDate(booking.checkInDate)} → {booking.checkOutDate ? formatShortDate(booking.checkOutDate) : '?'}
        </span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {/* Platform badge */}
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${config.bg} ${config.text}`}>
          {config.label}
        </span>

        {/* Nights count */}
        {booking.numNights > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] text-gray-500 bg-gray-100 rounded">
            {booking.numNights} night{booking.numNights !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
