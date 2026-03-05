'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Booking } from '@/services/types/booking'
import type { BarSize } from './TurnoverCalendar'

const NOTCH_SIZES = { sm: 8, md: 10, lg: 12 } as const
const FONT_SIZES = {
  sm: { name: 'text-[9px]', detail: 'text-[8px]' },
  md: { name: 'text-[11px]', detail: 'text-[10px]' },
  lg: { name: 'text-[13px]', detail: 'text-[11px]' },
} as const

const ICON_SIZES = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' } as const

interface BookingBarProps {
  booking: Booking
  isClippedLeft?: boolean
  isClippedRight?: boolean
  barSize?: BarSize
  isCompact?: boolean
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}

function formatShortTime(timeStr: string): string {
  const [h] = timeStr.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}${suffix}`
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getPlatformColor(platform: string): { bg: string; dot: string; label: string } {
  switch (platform) {
    case 'airbnb': return { bg: '#f43f5e', dot: '#f43f5e', label: 'Airbnb' }
    case 'booking': return { bg: '#3b82f6', dot: '#3b82f6', label: 'Booking.com' }
    case 'vrbo': return { bg: '#6366f1', dot: '#6366f1', label: 'VRBO' }
    case 'direct':
    case 'direct-etransfer': return { bg: '#10b981', dot: '#10b981', label: 'Direct' }
    case 'google': return { bg: '#f59e0b', dot: '#f59e0b', label: 'Google' }
    case 'wechalet': return { bg: '#14b8a6', dot: '#14b8a6', label: 'WeChalet' }
    case 'monsieurchalets': return { bg: '#f97316', dot: '#f97316', label: 'MonsieurChalets' }
    default: return { bg: '#6b7280', dot: '#6b7280', label: platform || 'Unknown' }
  }
}

function SuitcaseIcon({ barSize }: { barSize: BarSize }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={`${ICON_SIZES[barSize]} flex-shrink-0`}>
      <path d="M6 2a1 1 0 0 0-1 1v1H3.5A1.5 1.5 0 0 0 2 5.5v7A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 12.5 4H11V3a1 1 0 0 0-1-1H6zm0 1h4v1H6V3z"/>
    </svg>
  )
}

export default function BookingBar({ booking, isClippedLeft, isClippedRight, barSize = 'lg', isCompact = false }: BookingBarProps) {
  const color = getPlatformColor(booking.platform)
  const checkoutTime = booking.defaultCheckoutTime || '11:00'
  const checkinTime = booking.defaultCheckinTime || '15:00'
  const NOTCH_WIDTH = NOTCH_SIZES[barSize]
  const fonts = FONT_SIZES[barSize]

  // Build parallelogram clip-path with / diagonal on both edges
  const left = isClippedLeft ? '0px' : `${NOTCH_WIDTH}px`
  const right = isClippedRight ? '100%' : `calc(100% - ${NOTCH_WIDTH}px)`

  const clipPath = `polygon(${left} 0, 100% 0, ${right} 100%, 0 100%)`

  // Nights count
  const nightsLabel = booking.numNights > 0 ? `${booking.numNights}n` : '—'

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  return (
    <div
      className="group relative w-full h-full"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setMousePos(null)}
    >
      <div
        className="absolute inset-0 transition-opacity group-hover:opacity-85"
        style={{
          backgroundColor: color.bg,
          clipPath,
        }}
      >
        {/* Two-line content — hidden in compact (month) mode */}
        {!isCompact && (
          <div className="absolute inset-0 flex flex-col justify-center overflow-hidden"
            style={{ paddingLeft: isClippedLeft ? 6 : NOTCH_WIDTH + 4, paddingRight: isClippedRight ? 6 : NOTCH_WIDTH + 4 }}
          >
            <div className="flex items-center gap-1 leading-tight">
              <SuitcaseIcon barSize={barSize} />
              <span className={`${fonts.name} font-semibold text-white truncate leading-tight`}>
                {booking.guestName}
              </span>
            </div>
            {barSize !== 'sm' && (
              <div className="flex items-center gap-1 leading-tight">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
                />
                <span className={`${fonts.detail} text-white/80 truncate`}>
                  {color.label} · {nightsLabel} · {formatShortTime(checkinTime)}→{formatShortTime(checkoutTime)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tooltip — portaled to body to escape overflow/transform containers */}
      {mousePos && createPortal(
        <div
          className="fixed z-[200] pointer-events-none"
          style={{ left: mousePos.x + 12, top: mousePos.y - 12 }}
        >
          <div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg max-w-xs">
            <div className="font-semibold">{booking.guestName}</div>
            <div className="border-t border-gray-700 my-1" />
            <div className="text-gray-300">
              {formatShortDate(booking.checkInDate)} &rarr; {booking.checkOutDate ? formatShortDate(booking.checkOutDate) : '?'} &middot; {booking.numNights > 0 ? `${booking.numNights} nights` : '—'}
            </div>
            <div className="text-gray-300 mt-0.5">
              In: {formatTime(checkinTime)} &middot; Out: {formatTime(checkoutTime)}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span style={{ color: color.bg }} className="font-medium">{color.label}</span>
            </div>
            {booking.listingName && (
              <div className="text-gray-300 mt-0.5 truncate">Listing: {booking.listingName}</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
