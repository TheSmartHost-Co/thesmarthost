'use client'

import { useMemo, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import type { ClientPortalProperty, ClientPortalBooking, ClientPortalCleaningProject } from '@/services/types/clientPortal'
import { PLATFORM_BAR_COLORS, formatPlatformName, formatCurrency } from '@/components/client-portal/shared/platformUtils'
import { formatLocalDate } from '@/utils/dateUtils'

interface ClientCalendarProps {
  properties: ClientPortalProperty[]
  bookings: ClientPortalBooking[]
  cleaningProjects: ClientPortalCleaningProject[]
  startDate: Date
  endDate: Date
  onBookingClick?: (booking: ClientPortalBooking) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function toDateStr(d: Date): string {
  return formatLocalDate(d)
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(a: string, b: string): number {
  const da = parseDateStr(a)
  const db = parseDateStr(b)
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

function generateDates(start: Date, end: Date): string[] {
  const result: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    result.push(toDateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

function getColumnWidth(zoomDays: number): number {
  if (zoomDays <= 7) return 100
  if (zoomDays <= 14) return 60
  return 40
}

function formatHeaderDay(dateStr: string): { weekday: string; day: string; isWeekend: boolean } {
  const d = parseDateStr(dateStr)
  const dow = d.getDay()
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(d.getDate()),
    isWeekend: dow === 0 || dow === 6,
  }
}

function formatShortDate(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getCleaningStatusColor(status: string): { bg: string; border: string; text: string } {
  switch (status.toLowerCase()) {
    case 'completed':
      return { bg: '#dcfce7', border: '#22c55e', text: '#166534' }
    case 'in_progress':
      return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }
    case 'assigned':
      return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }
    default:
      return { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }
  }
}

// ---------------------------------------------------------------------------
// Tooltip types
// ---------------------------------------------------------------------------

interface BookingTooltipData {
  kind: 'booking'
  guestName: string
  platform: string
  checkIn: string
  checkOut: string
  totalPayout: number | null | undefined
  rect: DOMRect
}

interface CleaningTooltipData {
  kind: 'cleaning'
  propertyName: string
  date: string
  time: string
  cleanerName: string
  status: string
  rect: DOMRect
}

type TooltipData = BookingTooltipData | CleaningTooltipData

// ---------------------------------------------------------------------------
// Tooltip Component (portal-based)
// ---------------------------------------------------------------------------

function CalendarTooltip({ data, onClose }: { data: TooltipData; onClose: () => void }) {
  const style: React.CSSProperties = {
    position: 'fixed',
    top: data.rect.bottom + 6,
    left: data.rect.left + data.rect.width / 2,
    transform: 'translateX(-50%)',
    zIndex: 9999,
  }

  // Prevent tooltip from going off-screen right/left
  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      style={style}
      className="bg-gray-900 text-white text-xs rounded-lg shadow-xl px-3 py-2 pointer-events-none max-w-[240px]"
      onMouseLeave={onClose}
    >
      {data.kind === 'booking' ? (
        <div className="space-y-1">
          <p className="font-semibold">{data.guestName || 'No guest name'}</p>
          <p className="text-gray-300">{formatPlatformName(data.platform)}</p>
          <p className="text-gray-300">
            {formatShortDate(data.checkIn)} &rarr; {formatShortDate(data.checkOut)}
          </p>
          {data.totalPayout != null && (
            <p className="text-emerald-300 font-medium">{formatCurrency(data.totalPayout)}</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <p className="font-semibold">{data.propertyName}</p>
          <p className="text-gray-300">{formatShortDate(data.date)}{data.time ? ` at ${data.time}` : ''}</p>
          {data.cleanerName && <p className="text-gray-300">Cleaner: {data.cleanerName}</p>}
          <p className="text-gray-300 capitalize">{data.status.replace(/_/g, ' ')}</p>
        </div>
      )}
    </motion.div>,
    document.body
  )
}

// ---------------------------------------------------------------------------
// Main Calendar Component
// ---------------------------------------------------------------------------

const ClientCalendar: React.FC<ClientCalendarProps> = ({
  properties,
  bookings,
  cleaningProjects,
  startDate,
  endDate,
  onBookingClick,
}) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dates = useMemo(() => generateDates(startDate, endDate), [startDate, endDate])
  const zoomDays = dates.length
  const colW = getColumnWidth(zoomDays)
  const todayStr = toDateStr(new Date())
  const startStr = dates[0]

  // Index bookings and cleanings by propertyId
  const bookingsByProperty = useMemo(() => {
    const map: Record<string, ClientPortalBooking[]> = {}
    for (const b of bookings) {
      if (!map[b.propertyId]) map[b.propertyId] = []
      map[b.propertyId].push(b)
    }
    return map
  }, [bookings])

  const cleaningsByProperty = useMemo(() => {
    const map: Record<string, ClientPortalCleaningProject[]> = {}
    for (const c of cleaningProjects) {
      if (!map[c.propertyId]) map[c.propertyId] = []
      map[c.propertyId].push(c)
    }
    return map
  }, [cleaningProjects])

  const showTooltip = useCallback((data: TooltipData) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setTooltip(data)
  }, [])

  const hideTooltip = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => setTooltip(null), 100)
  }, [])

  const PROPERTY_COL_W = 192 // w-48

  const totalWidth = PROPERTY_COL_W + colW * dates.length

  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden w-full">
      <div className="overflow-x-auto">
        <div style={{ minWidth: totalWidth }}>

          {/* Header Row */}
          <div className="flex border-b border-gray-200 bg-gray-50/80">
            {/* Property label column */}
            <div
              className="sticky left-0 z-20 bg-gray-50/80 border-r border-gray-200 flex items-end px-3 py-2 shrink-0"
              style={{ width: PROPERTY_COL_W, minWidth: PROPERTY_COL_W }}
            >
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Property</span>
            </div>

            {/* Date columns — flex to fill available width */}
            {dates.map((dateStr) => {
              const { weekday, day, isWeekend } = formatHeaderDay(dateStr)
              const isT = dateStr === todayStr
              return (
                <div
                  key={dateStr}
                  className={`flex-1 flex flex-col items-center justify-end py-2 border-r border-gray-100 last:border-r-0 ${
                    isT ? 'bg-emerald-50/60' : isWeekend ? 'bg-gray-50' : ''
                  }`}
                  style={{ minWidth: colW }}
                >
                  <span className={`text-[10px] font-medium ${isT ? 'text-emerald-700' : 'text-gray-400'}`}>
                    {weekday}
                  </span>
                  <span
                    className={`text-xs font-semibold mt-0.5 ${
                      isT
                        ? 'bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                        : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Property Rows — only show properties with bookings or cleanings in range */}
          {(() => {
            const activeProperties = properties.filter((property) => {
              const hasBookings = (bookingsByProperty[property.id] || []).length > 0
              const hasCleanings = (cleaningsByProperty[property.id] || []).length > 0
              return hasBookings || hasCleanings
            })

            if (activeProperties.length === 0) {
              return (
                <div className="px-6 py-12 text-center text-sm text-gray-400">
                  No bookings or cleaning projects in this date range
                </div>
              )
            }

            return activeProperties.map((property) => {
              const propBookings = bookingsByProperty[property.id] || []
              const propCleanings = cleaningsByProperty[property.id] || []

              return (
                <div
                  key={property.id}
                  className="flex border-b border-gray-100 last:border-b-0 group hover:bg-gray-50/30 transition-colors"
                >
                  {/* Property name sticky col */}
                  <div
                    className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/30 border-r border-gray-200 px-3 py-3 flex flex-col justify-center shrink-0"
                    style={{ width: PROPERTY_COL_W, minWidth: PROPERTY_COL_W }}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate" title={property.listingName}>
                      {property.listingName}
                    </p>
                    {property.address && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5" title={property.address}>
                        {property.address}
                      </p>
                    )}
                  </div>

                  {/* Timeline area — flex to fill, use percentage positions */}
                  <div
                    className="relative flex-1"
                    style={{
                      minWidth: colW * dates.length,
                      minHeight: 64,
                    }}
                  >
                    {/* Day column backgrounds */}
                    {/* Day column backgrounds — use percentage positioning */}
                    {dates.map((dateStr, idx) => {
                      const { isWeekend } = formatHeaderDay(dateStr)
                      const isT = dateStr === todayStr
                      const pctLeft = (idx / dates.length) * 100
                      const pctWidth = (1 / dates.length) * 100
                      return (
                        <div
                          key={dateStr}
                          className={`absolute top-0 bottom-0 border-r border-gray-100 last:border-r-0 ${
                            isT ? 'bg-emerald-50/30' : isWeekend ? 'bg-gray-50/50' : ''
                          }`}
                          style={{ left: `${pctLeft}%`, width: `${pctWidth}%` }}
                        />
                      )
                    })}

                    {/* Today indicator line */}
                    {dates.includes(todayStr) && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-emerald-500/60 z-[5]"
                        style={{ left: `${((dates.indexOf(todayStr) + 0.5) / dates.length) * 100}%` }}
                      />
                    )}

                    {/* Booking bars — percentage-based positions */}
                    {propBookings.map((booking) => {
                      const checkIn = booking.checkInDate.split('T')[0]
                      const checkOut = booking.checkOutDate.split('T')[0]
                      const lastDateStr = dates[dates.length - 1]

                      // Skip if booking is entirely outside visible range
                      if (checkOut <= startStr || checkIn > lastDateStr) return null

                      const isClippedLeft = checkIn < startStr
                      const isClippedRight = checkOut > lastDateStr

                      const visibleStart = isClippedLeft ? startStr : checkIn
                      const visibleEnd = isClippedRight ? lastDateStr : checkOut

                      const startCol = daysBetween(startStr, visibleStart)
                      const spanDays = daysBetween(visibleStart, visibleEnd)

                      if (spanDays <= 0) return null

                      const pctLeft = (startCol / dates.length) * 100
                      const pctWidth = (spanDays / dates.length) * 100

                      const platform = booking.platform?.toLowerCase() || ''
                      const style = PLATFORM_BAR_COLORS[platform] || { bg: '#d1d5db', text: '#1f2937', border: '#6b7280' }
                      const abbrev = PLATFORM_ABBREV[platform] || ''

                      const borderRadius = `${isClippedLeft ? '0' : '6px'} ${isClippedRight ? '0' : '6px'} ${isClippedRight ? '0' : '6px'} ${isClippedLeft ? '0' : '6px'}`

                      return (
                        <div
                          key={booking.id}
                          className={`absolute z-[3] flex items-center overflow-hidden ${onBookingClick ? 'cursor-pointer hover:brightness-95 transition-all' : 'cursor-default'}`}
                          style={{
                            top: 8,
                            left: `calc(${pctLeft}% + 2px)`,
                            width: `calc(${pctWidth}% - 4px)`,
                            height: 28,
                            backgroundColor: style.bg,
                            color: style.text,
                            borderRadius,
                            border: `1px solid ${style.border}`,
                          }}
                          onClick={() => onBookingClick?.(booking)}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            showTooltip({
                              kind: 'booking',
                              guestName: booking.guestName || 'Guest',
                              platform,
                              checkIn,
                              checkOut,
                              totalPayout: booking.totalPayout,
                              rect,
                            })
                          }}
                          onMouseLeave={hideTooltip}
                        >
                          <span className="text-[10px] font-bold px-1.5 truncate whitespace-nowrap leading-none">
                            {abbrev && <span className="opacity-70 mr-1">{abbrev}</span>}
                            {spanDays >= 2 && (booking.guestName || '')}
                          </span>
                        </div>
                      )
                    })}

                    {/* Cleaning markers — percentage-based */}
                    {propCleanings.map((cleaning) => {
                      const cleanDate = cleaning.projectDate.split('T')[0]
                      if (!dates.includes(cleanDate)) return null

                      const col = dates.indexOf(cleanDate)
                      const statusColor = getCleaningStatusColor(cleaning.status)
                      const pctCenter = ((col + 0.5) / dates.length) * 100

                      return (
                        <div
                          key={cleaning.id}
                          className="absolute z-[4] flex items-center justify-center cursor-default"
                          style={{
                            top: 40,
                            left: `calc(${pctCenter}% - 10px)`,
                            width: 20,
                            height: 20,
                          }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            showTooltip({
                              kind: 'cleaning',
                              propertyName: cleaning.propertyName,
                              date: cleanDate,
                              time: cleaning.projectStartTime || '',
                              cleanerName: cleaning.cleanerName || '',
                              status: cleaning.status,
                              rect,
                            })
                          }}
                          onMouseLeave={hideTooltip}
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm"
                            style={{
                              backgroundColor: statusColor.bg,
                              border: `1.5px solid ${statusColor.border}`,
                              color: statusColor.text,
                            }}
                            title={`Cleaning: ${cleaning.status.replace(/_/g, ' ')}`}
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M3 21h18M5 21V7l8-4v18M13 21V3l6 4v14" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>{tooltip && <CalendarTooltip data={tooltip} onClose={() => setTooltip(null)} />}</AnimatePresence>
    </div>
  )
}

export default ClientCalendar
