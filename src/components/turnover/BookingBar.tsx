'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Booking } from '@/services/types/booking'
import type { ZoomLevel } from './TurnoverCalendar'
import { parseLocalDate } from '@/utils/dateUtils'
import { isReservedName } from '@/utils/bookingUtils'

interface BookingBarProps {
  booking: Booking
  isClippedLeft?: boolean
  isClippedRight?: boolean
  isActivated?: boolean
  compact?: boolean
  zoomLevel?: ZoomLevel
}

const PLATFORM_ABBREV: Record<string, string> = {
  airbnb: 'Ab',
  booking: 'Bk',
  vrbo: 'VR',
  direct: 'Dir',
  'direct-etransfer': 'Dir',
  google: 'Go',
  wechalet: 'WC',
  monsieurchalets: 'MC',
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
      return { bg: '#fda4af', text: '#881337', border: '#f43f5e', label: 'Airbnb' }
    case 'booking':
      return { bg: '#93c5fd', text: '#1e3a8a', border: '#3b82f6', label: 'Booking.com' }
    case 'vrbo':
      return { bg: '#a5b4fc', text: '#312e81', border: '#6366f1', label: 'VRBO' }
    case 'direct':
    case 'direct-etransfer':
      return { bg: '#6ee7b7', text: '#064e3b', border: '#10b981', label: 'Direct' }
    case 'google':
      return { bg: '#fcd34d', text: '#78350f', border: '#f59e0b', label: 'Google' }
    case 'wechalet':
      return { bg: '#5eead4', text: '#134e4a', border: '#14b8a6', label: 'WeChalet' }
    case 'monsieurchalets':
      return { bg: '#fdba74', text: '#7c2d12', border: '#f97316', label: 'MonsieurChalets' }
    default:
      return { bg: '#d1d5db', text: '#1f2937', border: '#6b7280', label: platform || 'Unknown' }
  }
}

export default function BookingBar({ booking, isClippedLeft, isClippedRight, isActivated = false, compact = false, zoomLevel = 7 }: BookingBarProps) {
  const NOTCH = compact ? 5 : 10
  const style = getPlatformStyle(booking.platform)

  // Display tier: determines how much text to show
  const isNarrow = typeof zoomLevel === 'number' && zoomLevel >= 10
  const displayTier = compact
    ? (isNarrow ? 4 : 3)
    : (isNarrow ? 2 : 1)
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

  // Outline clip-path: same parallelogram but 2px larger on all sides
  const outlineLeft = isClippedLeft ? '-2px' : `${NOTCH - 1}px`
  const outlineRight = isClippedRight ? 'calc(100% + 2px)' : `calc(100% - ${NOTCH - 1}px)`
  const outlineClipPath = `polygon(${outlineLeft} -2px, calc(100% + 2px) -2px, ${outlineRight} calc(100% + 2px), -2px calc(100% + 2px))`

  return (
    <div
      className="group relative w-full h-full"
      style={{
        zIndex: isActivated ? 200 : undefined,
        transform: isActivated ? 'scale(1.04)' : undefined,
        filter: isActivated ? 'drop-shadow(0 6px 20px rgba(0,0,0,0.25))' : undefined,
        transition: 'transform 0.15s ease, filter 0.15s ease',
      }}
      onMouseEnter={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setHoverPos(null)}
    >
      {/* Dark outline layer — parallelogram-shaped, shown only when activated */}
      {isActivated && (
        <div
          className="absolute"
          style={{
            inset: -2,
            backgroundColor: '#1f2937',
            clipPath: outlineClipPath,
          }}
        />
      )}
      <div
        className="absolute inset-0 transition-opacity group-hover:opacity-85"
        style={{
          backgroundColor: style.bg,
          clipPath,
          boxShadow: `inset 0 0 0 2px ${style.border}`,
        }}
      >
        {/* Grip dots handle — visible when activated */}
        {isActivated && (
          <div
            className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-[2px] opacity-40"
            style={{ left: isClippedLeft ? 4 : NOTCH + 4, cursor: 'grab' }}
          >
            <div className="flex gap-[2px]">
              <span className="w-[2px] h-[2px] rounded-full" style={{ backgroundColor: style.text }} />
              <span className="w-[2px] h-[2px] rounded-full" style={{ backgroundColor: style.text }} />
            </div>
            <div className="flex gap-[2px]">
              <span className="w-[2px] h-[2px] rounded-full" style={{ backgroundColor: style.text }} />
              <span className="w-[2px] h-[2px] rounded-full" style={{ backgroundColor: style.text }} />
            </div>
            <div className="flex gap-[2px]">
              <span className="w-[2px] h-[2px] rounded-full" style={{ backgroundColor: style.text }} />
              <span className="w-[2px] h-[2px] rounded-full" style={{ backgroundColor: style.text }} />
            </div>
          </div>
        )}
        <div
          className={`absolute inset-0 overflow-hidden ${displayTier >= 3 ? 'flex items-center' : displayTier === 2 ? 'flex flex-col justify-center' : 'flex items-center'}`}
          style={{
            paddingLeft: isClippedLeft ? 4 : NOTCH + 4,
            paddingRight: isClippedRight ? 4 : NOTCH + 4,
          }}
        >
          {displayTier === 1 && (
            /* Tier 1 — Full: name · platform · dates · times · nights */
            <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden min-w-0">
              <span className="text-[12px] font-semibold truncate" style={{ color: style.text }}>
                {!isReservedName(booking.guestName) && booking.guestName}
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
          )}
          {displayTier === 2 && (
            /* Tier 2 — Tall-narrow: 2-line stacked (name · platform / dates · nights) */
            <>
              <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden min-w-0">
                <span className="text-[11px] font-semibold truncate" style={{ color: style.text }}>
                  {!isReservedName(booking.guestName) && booking.guestName}
                </span>
                <span className="text-[10px] flex-shrink-0 opacity-70" style={{ color: style.text }}>
                  &middot; {style.label}
                </span>
              </div>
              <div className="whitespace-nowrap overflow-hidden min-w-0">
                <span className="text-[10px]" style={{ color: style.text, opacity: 0.6 }}>
                  {formatShortDate(booking.checkInDate)} &rarr; {booking.checkOutDate ? formatShortDate(booking.checkOutDate) : '?'} &middot; {nightsLabel}
                </span>
              </div>
            </>
          )}
          {displayTier === 3 && (
            /* Tier 3 — Short-wide: single line (name · platform · nights) */
            <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden min-w-0">
              <span className="text-[10px] font-semibold truncate" style={{ color: style.text }}>
                {!isReservedName(booking.guestName) && booking.guestName}
              </span>
              <span className="text-[9px] flex-shrink-0 opacity-70" style={{ color: style.text }}>
                &middot; {style.label}
              </span>
              <span className="text-[9px] flex-shrink-0" style={{ color: style.text, opacity: 0.6 }}>
                &middot; {nightsLabel}
              </span>
            </div>
          )}
          {displayTier === 4 && (
            /* Tier 4 — Minimal: truncated name · platform abbreviation */
            <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden min-w-0">
              <span className="text-[9px] font-semibold truncate" style={{ color: style.text }}>
                {!isReservedName(booking.guestName) && booking.guestName}
              </span>
              <span className="text-[9px] flex-shrink-0 opacity-70" style={{ color: style.text }}>
                &middot; {PLATFORM_ABBREV[booking.platform] || style.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tooltip — portaled to body */}
      {hoverPos && createPortal(
        <div
          className="fixed z-[200] pointer-events-none"
          style={{ left: hoverPos.x + 12, top: hoverPos.y - 12 }}
        >
          <div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg max-w-xs">
            {!isReservedName(booking.guestName) && <div className="font-semibold">{booking.guestName}</div>}
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
