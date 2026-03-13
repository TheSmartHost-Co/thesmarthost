'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Booking } from '@/services/types/booking'
import { parseLocalDate } from '@/utils/dateUtils'

const NOTCH = 10

interface BookingBarProps {
  booking: Booking
  isClippedLeft?: boolean
  isClippedRight?: boolean
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
  const date = parseLocalDate(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getPlatformStyle(platform: string): { bg: string; text: string; border: string; label: string } {
  switch (platform) {
    case 'airbnb':
      return { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', label: 'Airbnb' }
    case 'booking':
      return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Booking.com' }
    case 'vrbo':
      return { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', label: 'VRBO' }
    case 'direct':
    case 'direct-etransfer':
      return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', label: 'Direct' }
    case 'google':
      return { bg: '#fffbeb', text: '#b45309', border: '#fde68a', label: 'Google' }
    case 'wechalet':
      return { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4', label: 'WeChalet' }
    case 'monsieurchalets':
      return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', label: 'MonsieurChalets' }
    default:
      return { bg: '#f9fafb', text: '#4b5563', border: '#e5e7eb', label: platform || 'Unknown' }
  }
}

export default function BookingBar({ booking, isClippedLeft, isClippedRight }: BookingBarProps) {
  const style = getPlatformStyle(booking.platform)
  const checkoutTime = booking.defaultCheckoutTime || '11:00'
  const checkinTime = booking.defaultCheckinTime || '15:00'

  const computedNights = (() => {
    if (!booking.checkOutDate) return booking.numNights
    const checkIn = parseLocalDate(booking.checkInDate)
    const checkOut = parseLocalDate(booking.checkOutDate)
    const diff = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : booking.numNights
  })()

  const left = isClippedLeft ? '0px' : `${NOTCH}px`
  const right = isClippedRight ? '100%' : `calc(100% - ${NOTCH}px)`
  const clipPath = `polygon(${left} 0, 100% 0, ${right} 100%, 0 100%)`

  const nightsLabel = computedNights > 0 ? `${computedNights}n` : '\u2014'

  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

  return (
    <div
      className="group relative w-full h-full"
      onMouseEnter={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setHoverPos(null)}
    >
      <div
        className="absolute inset-0 transition-opacity group-hover:opacity-85"
        style={{
          backgroundColor: style.bg,
          clipPath,
          boxShadow: `inset 0 0 0 2px ${style.border}`,
        }}
      >
        <div
          className="absolute inset-0 flex items-center overflow-hidden"
          style={{
            paddingLeft: isClippedLeft ? 4 : NOTCH + 4,
            paddingRight: isClippedRight ? 4 : NOTCH + 4,
          }}
        >
          <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden min-w-0">
            <span className="text-[12px] font-semibold truncate" style={{ color: style.text }}>
              {booking.guestName}
            </span>
            <span className="text-[11px] flex-shrink-0" style={{ color: style.text, opacity: 0.7 }}>
              &middot; {style.label}
            </span>
            <span className="text-[11px] flex-shrink-0" style={{ color: style.text, opacity: 0.6 }}>
              &middot; {formatShortDate(booking.checkInDate)} &rarr; {booking.checkOutDate ? formatShortDate(booking.checkOutDate) : '?'}
            </span>
            <span className="text-[11px] flex-shrink-0" style={{ color: style.text, opacity: 0.6 }}>
              &middot; {formatShortTime(checkinTime)}&rarr;{formatShortTime(checkoutTime)}
            </span>
            <span className="text-[11px] flex-shrink-0" style={{ color: style.text, opacity: 0.6 }}>
              &middot; {nightsLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Tooltip — portaled to body */}
      {hoverPos && createPortal(
        <div
          className="fixed z-[200] pointer-events-none"
          style={{ left: hoverPos.x + 12, top: hoverPos.y - 12 }}
        >
          <div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg max-w-xs">
            <div className="font-semibold">{booking.guestName}</div>
            <div className="border-t border-gray-700 my-1" />
            <div className="text-gray-300">
              {formatShortDate(booking.checkInDate)} &rarr; {booking.checkOutDate ? formatShortDate(booking.checkOutDate) : '?'} &middot; {computedNights > 0 ? `${computedNights} nights` : '\u2014'}
            </div>
            <div className="text-gray-300 mt-0.5">
              In: {formatTime(checkinTime)} &middot; Out: {formatTime(checkoutTime)}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span style={{ color: style.text }} className="font-medium">{style.label}</span>
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
