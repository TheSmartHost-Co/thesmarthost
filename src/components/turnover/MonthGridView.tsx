'use client'

import { useMemo, useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import BookingBar from './BookingBar'
import ProjectEvent from './ProjectEvent'
import type { ActivatedItem } from './dnd/types'
import { useStickyHeader } from './hooks/useStickyHeader'
import { parseLocalDate, formatLocalDate, isToday, toLocalDateStr } from './utils/calendarDateUtils'
import { timeToFraction } from './utils/calendarEventLayout'
import { useIsMobile } from '@/hooks/useIsMobile'

const WEEKDAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const
const MAX_EVENTS_PER_CELL = 3
const MAX_EVENTS_PER_CELL_MOBILE = 2
const PROJECT_ZONE_TOP_DESKTOP = 24 + MAX_EVENTS_PER_CELL * 26 + 8
const PROJECT_ZONE_TOP_MOBILE = 20 + MAX_EVENTS_PER_CELL_MOBILE * 20 + 4
const BOOKING_BAR_HEIGHT_DESKTOP = 24
const BOOKING_BAR_HEIGHT_MOBILE = 16
const PROJECT_BAR_HEIGHT_DESKTOP = 24
const PROJECT_BAR_HEIGHT_MOBILE = 18

interface MonthGridViewProps {
  projects: CleaningProject[]
  properties: Property[]
  bookings: Booking[]
  dateRange: { start: string; end: string }
  onProjectClick: (project: CleaningProject) => void
  onBookingClick: (booking: Booking) => void
  onDayClick: (dateStr: string) => void
  issueCountsMap: Record<string, number>
  supplyListCountsMap: Record<string, number>
  stickyPortal?: RefObject<HTMLDivElement | null>
  scrollContainer?: RefObject<HTMLElement | null>
  activatedItem?: ActivatedItem
}

// ---- Color helpers (for popover only) ----

function getPlatformColor(platform: string): string {
  switch (platform) {
    case 'airbnb': return '#f43f5e'
    case 'booking': return '#3b82f6'
    case 'vrbo': return '#6366f1'
    case 'direct':
    case 'direct-etransfer': return '#10b981'
    case 'google': return '#f59e0b'
    case 'wechalet': return '#14b8a6'
    case 'monsieurchalets': return '#f97316'
    default: return '#6b7280'
  }
}

function getProjectBorderColor(status: string, isUnassigned: boolean, isAwaiting: boolean): string {
  if (isUnassigned || isAwaiting) return '#d97706'
  const borders: Record<string, string> = {
    pending: '#f59e0b', assigned: '#3b82f6', confirmed: '#6366f1',
    in_progress: '#a855f7', completed: '#22c55e', cancelled: '#6b7280',
  }
  return borders[status] || borders.pending
}

// ---- Types ----

interface GridBooking {
  type: 'booking'
  booking: Booking
  startCol: number
  spanCols: number
  isClippedLeft: boolean
  isClippedRight: boolean
  checkoutFraction: number
}

interface WeekRow {
  weekStart: Date
  dates: (string | null)[]
}

// ---- Component ----

export default function MonthGridView({
  projects,
  properties,
  bookings,
  dateRange,
  onProjectClick,
  onBookingClick,
  onDayClick,
  issueCountsMap,
  supplyListCountsMap,
  stickyPortal,
  scrollContainer,
  activatedItem,
}: MonthGridViewProps) {
  const isMobile = useIsMobile()
  const WEEKDAYS = isMobile ? WEEKDAYS_SHORT : WEEKDAYS_FULL
  const maxEventsPerCell = isMobile ? MAX_EVENTS_PER_CELL_MOBILE : MAX_EVENTS_PER_CELL
  const PROJECT_ZONE_TOP = isMobile ? PROJECT_ZONE_TOP_MOBILE : PROJECT_ZONE_TOP_DESKTOP
  const BOOKING_BAR_HEIGHT = isMobile ? BOOKING_BAR_HEIGHT_MOBILE : BOOKING_BAR_HEIGHT_DESKTOP
  const PROJECT_BAR_HEIGHT = isMobile ? PROJECT_BAR_HEIGHT_MOBILE : PROJECT_BAR_HEIGHT_DESKTOP
  const cellMinHeight = isMobile ? 60 : 160

  const [popover, setPopover] = useState<{ dateStr: string; x: number; y: number } | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const { headerRef, isStuck } = useStickyHeader(scrollContainer)

  // Close popover on outside click
  useEffect(() => {
    if (!popover) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popover])

  // Build week rows for the month grid
  const weekRows = useMemo<WeekRow[]>(() => {
    const firstDay = parseLocalDate(dateRange.start)
    const year = firstDay.getFullYear()
    const month = firstDay.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startDow = firstDay.getDay()

    const rows: WeekRow[] = []
    let currentDay = 1 - startDow

    while (currentDay <= daysInMonth) {
      const dates: (string | null)[] = []
      const weekSunday = new Date(year, month, currentDay)
      for (let col = 0; col < 7; col++) {
        const dayNum = currentDay + col
        if (dayNum < 1 || dayNum > daysInMonth) {
          dates.push(null)
        } else {
          dates.push(formatLocalDate(new Date(year, month, dayNum)))
        }
      }
      rows.push({ weekStart: weekSunday, dates })
      currentDay += 7
    }
    return rows
  }, [dateRange.start])

  // Index projects by date
  const projectsByDate = useMemo(() => {
    const map = new Map<string, CleaningProject[]>()
    for (const p of projects) {
      const d = toLocalDateStr(p.projectDate)
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(p)
    }
    return map
  }, [projects])

  // Build booking spans per week row
  const bookingsByWeek = useMemo(() => {
    const result: GridBooking[][] = []

    for (const week of weekRows) {
      const weekBookings: GridBooking[] = []
      const weekDates = week.dates.filter((d): d is string => d !== null)
      if (weekDates.length === 0) {
        result.push([])
        continue
      }
      const weekStart = weekDates[0]
      const weekEnd = weekDates[weekDates.length - 1]

      for (const booking of bookings) {
        const checkIn = toLocalDateStr(booking.checkInDate)
        const checkOut = booking.checkOutDate ? toLocalDateStr(booking.checkOutDate) : checkIn

        if (checkOut < weekStart || checkIn > weekEnd) continue

        let startCol = 0
        let endCol = 6
        let isClippedLeft = false
        let isClippedRight = false

        const checkInIdx = week.dates.indexOf(checkIn)
        if (checkInIdx >= 0) {
          startCol = checkInIdx
        } else if (checkIn < weekStart) {
          startCol = week.dates.findIndex(d => d !== null)
          isClippedLeft = true
        }

        const checkOutIdx = week.dates.indexOf(checkOut)
        if (checkOutIdx >= 0) {
          endCol = checkOutIdx
        } else if (checkOut > weekEnd) {
          endCol = week.dates.length - 1 - [...week.dates].reverse().findIndex(d => d !== null)
          isClippedRight = true
        }

        const spanCols = Math.max(endCol - startCol + 1, 1)

        // Compute checkout fraction for partial-day rendering
        const checkoutFraction = isClippedRight
          ? 1
          : timeToFraction(booking.defaultCheckoutTime, 0.458)

        weekBookings.push({
          type: 'booking',
          booking,
          startCol,
          spanCols,
          isClippedLeft,
          isClippedRight,
          checkoutFraction,
        })
      }

      weekBookings.sort((a, b) => b.spanCols - a.spanCols || a.startCol - b.startCol)
      result.push(weekBookings)
    }

    return result
  }, [bookings, weekRows])

  // Property name lookup
  const propertyNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of properties) {
      map.set(p.id, p.listingName || p.internalName || p.address || 'Unknown')
    }
    return map
  }, [properties])

  return (
    <div className="relative select-none">
      {/* Weekday Header */}
      <div ref={headerRef} className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80">
        {WEEKDAYS.map((day, i) => (
          <div key={i} className={`text-center ${isMobile ? 'py-1.5 text-[9px]' : 'py-2 text-[11px]'} font-medium text-gray-500 uppercase tracking-wider`}>
            {day}
          </div>
        ))}
      </div>

      {/* Sticky weekday header portal */}
      {isStuck && stickyPortal?.current && createPortal(
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm shadow-sm">
          {WEEKDAYS.map((day, i) => (
            <div key={i} className={`text-center ${isMobile ? 'py-1.5 text-[9px]' : 'py-2 text-[11px]'} font-medium text-gray-500 uppercase tracking-wider`}>
              {day}
            </div>
          ))}
        </div>,
        stickyPortal.current
      )}

      {/* Week Rows */}
      {weekRows.map((week, weekIdx) => {
        const weekBookingItems = bookingsByWeek[weekIdx] || []

        return (
          <div key={weekIdx} className="relative grid grid-cols-7 border-b border-gray-300" style={{ minHeight: cellMinHeight }}>
            {/* Booking bars — absolute positioned spanning across cells using BookingBar component */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
              {weekBookingItems.slice(0, maxEventsPerCell).map((gb, laneIdx) => {
                const leftPct = (gb.startCol / 7) * 100
                const fullWidthPct = (gb.spanCols / 7) * 100
                const reductionPct = gb.isClippedRight ? 0 : ((1 - gb.checkoutFraction) / 7) * 100
                const widthPct = fullWidthPct - reductionPct
                const isBookingActivated = activatedItem?.type === 'booking' && activatedItem.id === gb.booking.id
                const laneHeight = isMobile ? 18 : 26

                return (
                  <div
                    key={`booking-${gb.booking.id}-w${weekIdx}`}
                    className={`absolute pointer-events-auto cursor-pointer ${isBookingActivated ? 'z-[200]' : ''}`}
                    style={{
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      top: (isMobile ? 20 : 24) + laneIdx * laneHeight,
                      height: BOOKING_BAR_HEIGHT,
                    }}
                    onClick={() => onBookingClick(gb.booking)}
                  >
                    <BookingBar
                      booking={gb.booking}
                      isClippedLeft={gb.isClippedLeft}
                      isClippedRight={gb.isClippedRight}
                      isActivated={isBookingActivated}
                      compact={isMobile}
                    />
                  </div>
                )
              })}
            </div>

            {/* Day cells */}
            {week.dates.map((dateStr, colIdx) => {
              if (dateStr === null) {
                return <div key={`pad-${colIdx}`} className="border-r border-gray-200 bg-gray-50/20" />
              }

              const today = isToday(dateStr)
              const date = parseLocalDate(dateStr)
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const dayProjects = projectsByDate.get(dateStr) || []

              const bookingsInCell = weekBookingItems.filter(
                gb => colIdx >= gb.startCol && colIdx < gb.startCol + gb.spanCols
              )

              const totalEvents = Math.min(bookingsInCell.length, maxEventsPerCell) + dayProjects.length
              const overflow = dayProjects.length > 3

              const visibleProjectCount = isMobile ? 2 : 3

              return (
                <div
                  key={dateStr}
                  className={`relative border-r border-gray-200 ${today ? 'bg-blue-50/40' : isWeekend ? 'bg-gray-50/30' : ''}`}
                  style={{ minHeight: 160 }}
                >
                  {/* Day number */}
                  <div
                    className={`text-right px-1 sm:px-1.5 pt-0.5 sm:pt-1 cursor-pointer hover:underline ${today ? 'font-bold text-blue-600' : 'text-gray-500'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDayClick(dateStr)
                    }}
                  >
                    <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} inline-flex items-center justify-center ${today ? 'bg-blue-600 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5' : ''}`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Separator between booking lanes and project zone */}
                  {dayProjects.length > 0 && (
                    <div
                      className="absolute left-1 right-1 pointer-events-none"
                      style={{
                        top: PROJECT_ZONE_TOP - 4,
                        height: 0,
                        borderTop: '1px dashed rgba(0,0,0,0.08)',
                      }}
                    />
                  )}

                  {/* Project blocks using ProjectEvent component */}
                  <div className="px-0.5 absolute left-0 right-0" style={{ top: PROJECT_ZONE_TOP, zIndex: 6 }}>
                    {dayProjects.slice(0, visibleProjectCount).map(project => {
                      const isProjectActivated = activatedItem?.type === 'project' && activatedItem.id === project.id
                      return (
                        <div
                          key={project.id}
                          className={`mb-0.5 cursor-pointer ${isProjectActivated ? 'z-[200] relative' : ''}`}
                          style={{ height: PROJECT_BAR_HEIGHT }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onProjectClick(project)
                          }}
                        >
                          <ProjectEvent
                            project={project}
                            openIssueCount={issueCountsMap[project.id] || 0}
                            pendingSupplyListCount={supplyListCountsMap[project.id] || 0}
                            zoomLevel="month"
                            isActivated={isProjectActivated}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* "+N more" overflow */}
                  {overflow && (
                    <div
                      className="px-1 cursor-pointer hover:underline relative"
                      style={{ zIndex: 7 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        setPopover({ dateStr, x: rect.left, y: rect.bottom + 4 })
                      }}
                    >
                      <span className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} text-blue-600 font-medium`}>
                        +{totalEvents - maxEventsPerCell} more
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Popover for overflow events */}
      {popover && (
        <div
          ref={popoverRef}
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 max-h-64 overflow-y-auto"
          style={{
            left: Math.min(popover.x, window.innerWidth - (isMobile ? 220 : 280)),
            top: popover.y,
            width: Math.min(260, window.innerWidth - 32),
          }}
        >
          <div className="text-xs font-semibold text-gray-700 mb-1.5 px-1">
            {parseLocalDate(popover.dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>

          {/* Bookings for this date */}
          {bookings
            .filter(b => {
              const checkIn = toLocalDateStr(b.checkInDate)
              const checkOut = b.checkOutDate ? toLocalDateStr(b.checkOutDate) : checkIn
              return popover.dateStr >= checkIn && popover.dateStr <= checkOut
            })
            .map(booking => (
              <div
                key={`pop-b-${booking.id}`}
                className="flex items-center gap-1.5 px-1 py-1 rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setPopover(null)
                  onBookingClick(booking)
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getPlatformColor(booking.platform) }} />
                <span className="text-[11px] text-gray-700 truncate">{booking.guestName}</span>
                <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{booking.numNights}n</span>
              </div>
            ))
          }

          {/* Projects for this date */}
          {(projectsByDate.get(popover.dateStr) || []).map(project => {
            const isUnassigned = !project.cleanerId
            const isAwaiting = project.status === 'assigned'
            const borderColor = getProjectBorderColor(project.status, isUnassigned, isAwaiting)

            return (
              <div
                key={`pop-p-${project.id}`}
                className="flex items-center gap-1.5 px-1 py-1 rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setPopover(null)
                  onProjectClick(project)
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: borderColor }} />
                <span className="text-[11px] truncate text-gray-700">
                  {project.cleanerName || 'Unassigned'}
                </span>
                <span className="text-[10px] text-gray-400 ml-auto truncate max-w-[80px] flex-shrink-0">
                  {propertyNameMap.get(project.propertyId) || ''}
                </span>
              </div>
            )
          })}

          {/* Close button */}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              className="w-full text-[10px] text-gray-400 hover:text-gray-600 text-center py-0.5"
              onClick={() => setPopover(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
