'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import type { CleaningProject, CleaningProjectStatus } from '@/services/types/cleaningProject'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import type { BarSize } from './TurnoverCalendar'
import { parseLocalDate, formatLocalDate, isToday } from './utils/calendarDateUtils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MAX_EVENTS_PER_CELL = 3

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
  barSize: BarSize
}

// ---- Color helpers ----

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

function getProjectColor(status: CleaningProjectStatus, isUnassigned: boolean, isAwaiting: boolean): { bg: string; text: string; border: string } {
  if (isUnassigned || isAwaiting) return { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' }
  const styles: Record<CleaningProjectStatus, { bg: string; text: string; border: string }> = {
    pending: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
    assigned: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    confirmed: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    in_progress: { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' },
    completed: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    cancelled: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
  }
  return styles[status] || styles.pending
}

// ---- Types ----

interface GridBooking {
  type: 'booking'
  booking: Booking
  startCol: number  // 0-6 column within the week row
  spanCols: number  // how many columns it spans in this week
  isClippedLeft: boolean
  isClippedRight: boolean
}

interface GridProject {
  type: 'project'
  project: CleaningProject
}

type GridEvent = GridBooking | GridProject

interface WeekRow {
  weekStart: Date  // Sunday of this week row
  dates: (string | null)[]  // 7 entries, null for padding cells
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
  barSize,
}: MonthGridViewProps) {
  const [popover, setPopover] = useState<{ dateStr: string; x: number; y: number } | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

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
    const startDow = firstDay.getDay() // 0=Sun

    const rows: WeekRow[] = []
    let currentDay = 1 - startDow // may be negative for padding

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
      const d = p.scheduledDate.slice(0, 10)
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
      // Get the date range for this week
      const weekDates = week.dates.filter((d): d is string => d !== null)
      if (weekDates.length === 0) {
        result.push([])
        continue
      }
      const weekStart = weekDates[0]
      const weekEnd = weekDates[weekDates.length - 1]

      for (const booking of bookings) {
        const checkIn = booking.checkInDate.slice(0, 10)
        const checkOut = booking.checkOutDate?.slice(0, 10) || checkIn

        // Skip if booking doesn't overlap this week
        if (checkOut < weekStart || checkIn > weekEnd) continue

        // Find start and end columns within this week
        let startCol = 0
        let endCol = 6
        let isClippedLeft = false
        let isClippedRight = false

        // Find the column for check-in
        const checkInIdx = week.dates.indexOf(checkIn)
        if (checkInIdx >= 0) {
          startCol = checkInIdx
        } else if (checkIn < weekStart) {
          startCol = week.dates.findIndex(d => d !== null)
          isClippedLeft = true
        }

        // Find the column for check-out
        const checkOutIdx = week.dates.indexOf(checkOut)
        if (checkOutIdx >= 0) {
          endCol = checkOutIdx
        } else if (checkOut > weekEnd) {
          endCol = week.dates.length - 1 - [...week.dates].reverse().findIndex(d => d !== null)
          isClippedRight = true
        }

        const spanCols = Math.max(endCol - startCol + 1, 1)

        weekBookings.push({
          type: 'booking',
          booking,
          startCol,
          spanCols,
          isClippedLeft,
          isClippedRight,
        })
      }

      // Sort by span (wider first) then by start col
      weekBookings.sort((a, b) => b.spanCols - a.spanCols || a.startCol - b.startCol)
      result.push(weekBookings)
    }

    return result
  }, [bookings, weekRows])

  // Get all events for a specific date cell
  const getEventsForDate = useCallback((dateStr: string): GridEvent[] => {
    const events: GridEvent[] = []
    const dateProjects = projectsByDate.get(dateStr) || []
    for (const p of dateProjects) {
      events.push({ type: 'project', project: p })
    }
    return events
  }, [projectsByDate])

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
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Week Rows */}
      {weekRows.map((week, weekIdx) => {
        const weekBookingItems = bookingsByWeek[weekIdx] || []

        return (
          <div key={weekIdx} className="relative grid grid-cols-7 border-b border-gray-100" style={{ minHeight: 120 }}>
            {/* Booking bars — absolute positioned spanning across cells */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
              {weekBookingItems.slice(0, MAX_EVENTS_PER_CELL).map((gb, laneIdx) => {
                const color = getPlatformColor(gb.booking.platform)
                const leftPct = (gb.startCol / 7) * 100
                const widthPct = (gb.spanCols / 7) * 100

                return (() => {
                  const MONTH_NOTCH = 5
                  const clipLeft = gb.isClippedLeft ? '0px' : `${MONTH_NOTCH}px`
                  const clipRight = gb.isClippedRight ? '100%' : `calc(100% - ${MONTH_NOTCH}px)`
                  const bookingClipPath = `polygon(${clipLeft} 0, 100% 0, ${clipRight} 100%, 0 100%)`

                  return (
                    <div
                      key={`booking-${gb.booking.id}-w${weekIdx}`}
                      className="absolute pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        top: 24 + laneIdx * 22,
                        height: 20,
                        backgroundColor: color,
                        clipPath: bookingClipPath,
                      }}
                      onClick={() => onBookingClick(gb.booking)}
                      title={`${gb.booking.guestName} · ${gb.booking.checkInDate.slice(0, 10)} → ${gb.booking.checkOutDate?.slice(0, 10) || '?'}`}
                    >
                      <div
                        className="flex items-center h-full overflow-hidden"
                        style={{
                          paddingLeft: gb.isClippedLeft ? 4 : MONTH_NOTCH + 2,
                          paddingRight: gb.isClippedRight ? 4 : MONTH_NOTCH + 2,
                        }}
                      >
                        <span className="text-[10px] font-medium text-white truncate">
                          {gb.booking.guestName}
                        </span>
                      </div>
                    </div>
                  )
                })()
              })}
            </div>

            {/* Day cells */}
            {week.dates.map((dateStr, colIdx) => {
              if (dateStr === null) {
                return <div key={`pad-${colIdx}`} className="border-r border-gray-100 bg-gray-50/20" />
              }

              const today = isToday(dateStr)
              const date = parseLocalDate(dateStr)
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const dayProjects = projectsByDate.get(dateStr) || []

              // Count bookings touching this cell
              const bookingsInCell = weekBookingItems.filter(
                gb => colIdx >= gb.startCol && colIdx < gb.startCol + gb.spanCols
              )

              // Projects start after booking lanes
              const projectStartLane = Math.min(bookingsInCell.length, MAX_EVENTS_PER_CELL)
              const totalEvents = projectStartLane + dayProjects.length
              const overflow = totalEvents > MAX_EVENTS_PER_CELL
              const visibleProjectCount = Math.max(0, MAX_EVENTS_PER_CELL - projectStartLane)

              return (
                <div
                  key={dateStr}
                  className={`relative border-r border-gray-100 ${today ? 'bg-blue-50/40' : isWeekend ? 'bg-gray-50/30' : ''}`}
                  style={{ minHeight: 120 }}
                >
                  {/* Day number */}
                  <div
                    className={`text-right px-1.5 pt-1 cursor-pointer hover:underline ${today ? 'font-bold text-blue-600' : 'text-gray-500'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDayClick(dateStr)
                    }}
                  >
                    <span className={`text-xs inline-flex items-center justify-center ${today ? 'bg-blue-600 text-white rounded-full w-5 h-5' : ''}`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Project blocks (below booking lanes) */}
                  <div className="px-0.5 relative" style={{ marginTop: Math.max(0, projectStartLane * 22) + 2, zIndex: 6 }}>
                    {dayProjects.slice(0, visibleProjectCount).map(project => {
                      const isUnassigned = !project.cleanerId
                      const isAwaiting = project.status === 'assigned' && project.cleanerAccepted === null
                      const colors = getProjectColor(project.status, isUnassigned, isAwaiting)

                      return (
                        <div
                          key={project.id}
                          className="mb-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity truncate"
                          style={{
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            height: 20,
                            lineHeight: '18px',
                            padding: '0 4px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onProjectClick(project)
                          }}
                          title={`${project.propertyName || 'Unknown'} · ${project.cleanerName || 'Unassigned'} · ${project.status}`}
                        >
                          <span className="text-[10px] font-medium truncate" style={{ color: colors.text }}>
                            {project.cleanerName || project.propertyName || 'Unassigned'}
                          </span>
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
                      <span className="text-[10px] text-blue-600 font-medium">
                        +{totalEvents - MAX_EVENTS_PER_CELL} more
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
            left: Math.min(popover.x, window.innerWidth - 280),
            top: popover.y,
            width: 260,
          }}
        >
          <div className="text-xs font-semibold text-gray-700 mb-1.5 px-1">
            {parseLocalDate(popover.dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>

          {/* Bookings for this date */}
          {bookings
            .filter(b => {
              const checkIn = b.checkInDate.slice(0, 10)
              const checkOut = b.checkOutDate?.slice(0, 10) || checkIn
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
            const isAwaiting = project.status === 'assigned' && project.cleanerAccepted === null
            const colors = getProjectColor(project.status, isUnassigned, isAwaiting)

            return (
              <div
                key={`pop-p-${project.id}`}
                className="flex items-center gap-1.5 px-1 py-1 rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setPopover(null)
                  onProjectClick(project)
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.border }} />
                <span className="text-[11px] truncate" style={{ color: colors.text }}>
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
