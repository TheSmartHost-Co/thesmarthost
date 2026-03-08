'use client'

import { useMemo, useEffect, useCallback, useState } from 'react'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import type { ZoomLevel } from './TurnoverCalendar'
import ProjectEvent from './ProjectEvent'
import BookingBar from './BookingBar'
import { useCalendarScroll } from './hooks/useCalendarScroll'
import { useNowIndicator } from './hooks/useNowIndicator'
import { generateDateRange, addDays, formatColumnHeader, isToday, getDaysInMonth, parseLocalDate } from './utils/calendarDateUtils'
import { layoutBookings, layoutProjects, applyProjectStacking, computeMaxStacks, getColumnLeft, getColumnWidth } from './utils/calendarEventLayout'

const SIDEBAR_WIDTH = 200
const DAY_SLOT_WIDTH = 110
const BUFFER_DAYS = 3
const SUB_ROW_GAP = 2
const STACK_GAP = 2
const BAR_HEIGHT = 80
const BOOKING_BAR_HEIGHT = 36
const NOTCH_PX = 10
const ROW_PADDING = 5

interface PropertyRowViewProps {
  projects: CleaningProject[]
  properties: Property[]
  dateRange: { start: string; end: string }
  onProjectClick: (project: CleaningProject) => void
  onBookingClick?: (booking: Booking) => void
  issueCountsMap?: Record<string, number>
  supplyListCountsMap?: Record<string, number>
  bookings?: Booking[]
  zoomLevel?: ZoomLevel
  onRequestDateShift?: (days: number) => void
  onProjectDrop?: (projectId: string, newDate: string, newCleanerId?: string) => void
  expandedDate?: string | null
  onExpandDate?: (date: string | null) => void
  onDayClick?: (dateStr: string) => void
}

export default function PropertyRowView({
  projects,
  properties,
  dateRange,
  onProjectClick,
  onBookingClick,
  issueCountsMap = {},
  supplyListCountsMap = {},
  bookings = [],
  zoomLevel = 7,
  onRequestDateShift,
  onProjectDrop,
  expandedDate = null,
  onExpandDate,
  onDayClick,
}: PropertyRowViewProps) {
  const isMonthView = zoomLevel === 'month'
  const visibleColumns = isMonthView
    ? getDaysInMonth(parseLocalDate(dateRange.start))
    : (zoomLevel as number)
  const [containerWidth, setContainerWidth] = useState(0)
  const bufferCols = isMonthView ? 0 : BUFFER_DAYS

  // Base slot width (for normal, non-expanded columns)
  const expandedInView = expandedDate && !isMonthView
  const effectiveVisibleSlots = expandedInView ? visibleColumns + 3 : visibleColumns
  const slotWidth = containerWidth > 0
    ? containerWidth / effectiveVisibleSlots
    : DAY_SLOT_WIDTH

  const { scrollOffset, timelineRef, resetOffset } = useCalendarScroll({
    slotWidth,
    onRequestDateShift: onRequestDateShift || (() => {}),
  })

  useEffect(() => {
    const el = timelineRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0
      if (w > 0) setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [timelineRef])

  useEffect(() => { resetOffset() }, [zoomLevel, dateRange.start, resetOffset])

  const allDates = useMemo(() => {
    const start = addDays(dateRange.start, -bufferCols)
    const totalCols = visibleColumns + bufferCols * 2
    return generateDateRange(start, totalCols)
  }, [dateRange.start, bufferCols, visibleColumns])

  const nowPos = useNowIndicator(allDates, 6, 24)

  const positionedBookings = useMemo(() => layoutBookings(bookings, allDates), [bookings, allDates])
  const positionedProjects = useMemo(() => {
    const pp = layoutProjects(projects, allDates)
    applyProjectStacking(pp, p => p.propertyId)
    return pp
  }, [projects, allDates])

  // Compute max project stack depth per property for dynamic row heights
  const maxStackByProperty = useMemo(() => computeMaxStacks(positionedProjects, p => p.propertyId), [positionedProjects])

  const projectsByProperty = useMemo(() => {
    const map = new Map<string, typeof positionedProjects>()
    for (const pp of positionedProjects) {
      const key = pp.project.propertyId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(pp)
    }
    return map
  }, [positionedProjects])

  const bookingsByProperty = useMemo(() => {
    const map = new Map<string, typeof positionedBookings>()
    for (const pb of positionedBookings) {
      const key = pb.booking.propertyId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(pb)
    }
    return map
  }, [positionedBookings])

  // For each project, find the next booking check-in date for the same property after the project's scheduled date
  const nextCheckinByProject = useMemo(() => {
    const map = new Map<string, string>()
    // Sort bookings by checkInDate per property
    const sortedByProp = new Map<string, string[]>()
    for (const b of bookings) {
      if (!b.checkInDate) continue
      const dates = sortedByProp.get(b.propertyId) || []
      dates.push(b.checkInDate.slice(0, 10))
      sortedByProp.set(b.propertyId, dates)
    }
    for (const dates of sortedByProp.values()) {
      dates.sort()
    }
    for (const project of projects) {
      const propDates = sortedByProp.get(project.propertyId)
      if (!propDates) continue
      const projDate = project.scheduledDate.slice(0, 10)
      // Find first booking check-in after the project's scheduled date
      const next = propDates.find(d => d > projDate)
      if (next) map.set(project.id, next)
    }
    return map
  }, [bookings, projects])

  // Compute total track width accounting for expanded column
  const trackWidth = useMemo(() => {
    let w = 0
    for (const d of allDates) w += getColumnWidth(d, expandedDate, slotWidth)
    return w
  }, [allDates, expandedDate, slotWidth])

  const translateX = -(bufferCols * slotWidth) - scrollOffset

  // Subdivision lines for day columns (3-14 day views only)
  const subdivisions = useMemo(() => {
    if (isMonthView || typeof zoomLevel !== 'number') return []
    if (zoomLevel <= 14) return [0.25, 0.5, 0.75]
    return []
  }, [isMonthView, zoomLevel])

  // Compute effective row height per property
  const getRowHeight = useCallback((propertyId: string) => {
    const stackCount = maxStackByProperty.get(propertyId) ?? 1
    const projectSubRowHeight = stackCount * BAR_HEIGHT + (stackCount - 1) * STACK_GAP
    return BOOKING_BAR_HEIGHT + SUB_ROW_GAP + Math.max(projectSubRowHeight, BAR_HEIGHT) + ROW_PADDING * 2
  }, [maxStackByProperty])

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const projectId = e.dataTransfer.getData('text/project-id')
    if (!projectId || !onProjectDrop) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    let cumulative = 0
    for (let i = 0; i < allDates.length; i++) {
      const colW = getColumnWidth(allDates[i], expandedDate, slotWidth)
      if (x < cumulative + colW) {
        onProjectDrop(projectId, allDates[i])
        return
      }
      cumulative += colW
    }
  }, [slotWidth, allDates, onProjectDrop, expandedDate])

  return (
    <div className="flex overflow-x-hidden overflow-y-visible select-none" style={{ cursor: 'grab' }}>
      {/* Sticky Sidebar */}
      <div className="flex-shrink-0 border-r-2 border-gray-300 bg-white z-20 relative" style={{ width: SIDEBAR_WIDTH }}>
        <div className="flex items-center px-4 border-b-2 border-gray-200 bg-gray-50/80 h-10">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Properties</span>
        </div>
        {properties.map(property => {
          const rowHeight = getRowHeight(property.id)
          return (
            <div
              key={property.id}
              className="border-b-2 border-gray-300 hover:bg-gray-50/30 transition-colors"
              style={{ height: rowHeight }}
            >
              <div className="py-2 px-3 flex flex-col justify-center overflow-hidden" style={{ height: rowHeight }}>
                <div className="font-medium text-gray-800 text-[13px] truncate leading-tight">
                  {property.listingName || property.internalName || property.address}
                </div>
                <div className="text-[11px] text-gray-400 truncate leading-tight">{property.address}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable Timeline */}
      <div ref={timelineRef} className="flex-1 overflow-x-hidden overflow-y-visible relative">
        <div
          className="relative"
          style={{
            width: trackWidth,
            transform: `translateX(${translateX}px)`,
            willChange: 'transform',
          }}
        >
          {/* Column Headers */}
          <div className="flex border-b-2 border-gray-200 bg-gray-50/80 h-10 sticky top-0 z-10">
            {allDates.map(dateStr => {
              const header = formatColumnHeader(dateStr)
              const today = isToday(dateStr)
              const colWidth = getColumnWidth(dateStr, expandedDate, slotWidth)
              const canClick = !isMonthView && onDayClick

              return (
                <div
                  key={dateStr}
                  className={`flex-shrink-0 flex items-center justify-center ${today ? 'bg-blue-50/60' : header.isWeekend && isMonthView ? 'bg-gray-50/40' : ''} ${canClick ? 'cursor-pointer hover:bg-gray-100/60' : ''}`}
                  style={{ width: colWidth, borderRight: '1px solid rgba(0,0,0,0.12)', position: 'relative' }}
                  onClick={canClick ? () => onDayClick(dateStr) : undefined}
                  data-no-drag={canClick ? true : undefined}
                >
                  <div className="flex flex-col items-center">
                    {!isMonthView && (
                      <span className={`text-[10px] font-medium uppercase ${today ? 'text-blue-500' : header.isWeekend ? 'text-gray-300' : 'text-gray-400'}`}>
                        {header.weekday}
                      </span>
                    )}
                    <span className={`${isMonthView ? 'text-[10px]' : 'text-xs'} font-semibold ${today ? 'text-blue-600' : 'text-gray-600'}`}>
                      {header.day}
                    </span>
                  </div>
                  {subdivisions.map(frac => (
                    <div key={frac} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${frac * 100}%`, width: 1, borderLeft: '1px dashed rgba(0,0,0,0.06)' }} />
                  ))}
                </div>
              )
            })}
          </div>

          {/* Resource Rows */}
          {properties.map(property => {
            const propertyBookings = bookingsByProperty.get(property.id) || []
            const propertyProjects = projectsByProperty.get(property.id) || []
            const rowHeight = getRowHeight(property.id)

            return (
              <div
                key={property.id}
                className="relative border-b-2 border-gray-300 hover:bg-gray-50/20 transition-colors"
                style={{ height: rowHeight }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {/* Column grid lines + today highlight */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {allDates.map((dateStr) => {
                    const today = isToday(dateStr)
                    const headerInfo = formatColumnHeader(dateStr)
                    const colWidth = getColumnWidth(dateStr, expandedDate, slotWidth)
                    const isExp = dateStr === expandedDate
                    return (
                      <div
                        key={dateStr}
                        className={`flex-shrink-0 border-r relative ${today ? 'bg-blue-50/30' : headerInfo.isWeekend && isMonthView ? 'bg-gray-50/30' : ''} ${isExp ? 'bg-blue-50/20' : ''}`}
                        style={{
                          width: colWidth,
                          borderColor: 'rgba(0,0,0,0.12)',
                        }}
                      >
                        {subdivisions.map(frac => (
                          <div key={frac} className="absolute top-0 bottom-0" style={{ left: `${frac * 100}%`, width: 1, borderLeft: '1px dashed rgba(0,0,0,0.06)' }} />
                        ))}
                      </div>
                    )
                  })}
                </div>

                {/* Now indicator */}
                {nowPos && (
                  <div
                    className="absolute top-0 bottom-0 z-10 pointer-events-none"
                    style={{
                      left: getColumnLeft(nowPos.dayIndex, allDates, expandedDate, slotWidth) + nowPos.subDayFraction * getColumnWidth(allDates[nowPos.dayIndex], expandedDate, slotWidth),
                      width: 1,
                      backgroundColor: '#ef4444',
                    }}
                  >
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
                  </div>
                )}

                {/* Sub-row separator line */}
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{
                    top: ROW_PADDING + BOOKING_BAR_HEIGHT + SUB_ROW_GAP / 2,
                    height: 0,
                    borderTop: '1px dashed rgba(0,0,0,0.15)',
                  }}
                />

                {/* Booking bars — top sub-row */}
                {propertyBookings.map(pb => {
                  const startLeft = getColumnLeft(pb.startColIndex, allDates, expandedDate, slotWidth)
                  const startColW = getColumnWidth(allDates[pb.startColIndex] || '', expandedDate, slotWidth)
                  const barLeft = startLeft + pb.checkinOffset * startColW
                  const endLeft = getColumnLeft(pb.endColIndex - 1, allDates, expandedDate, slotWidth)
                  const endColW = getColumnWidth(allDates[pb.endColIndex - 1] || '', expandedDate, slotWidth)
                  const right = endLeft + pb.checkoutOffset * endColW
                  const barWidth = Math.max(right - barLeft, 20) + NOTCH_PX

                  // Compute sticky offset: shift text to stay visible at viewport left edge
                  const viewportLeft = bufferCols * slotWidth - scrollOffset
                  const rawStickyOffset = Math.max(0, viewportLeft - barLeft)
                  const maxOffset = Math.max(0, barWidth - 120)
                  const stickyOffset = Math.min(rawStickyOffset, maxOffset)

                  return (
                    <div
                      key={`booking-${pb.booking.id}`}
                      className="absolute z-[5] hover:z-[100] cursor-pointer"
                      data-no-drag
                      style={{
                        left: barLeft,
                        width: barWidth,
                        top: ROW_PADDING,
                        height: BOOKING_BAR_HEIGHT,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onBookingClick?.(pb.booking)
                      }}
                    >
                      <BookingBar
                        booking={pb.booking}
                        isClippedLeft={pb.startColIndex < bufferCols}
                        isClippedRight={pb.endColIndex > allDates.length - bufferCols}
                        stickyOffset={stickyOffset}
                      />
                    </div>
                  )
                })}

                {/* Project bars — bottom sub-row with stacking */}
                {propertyProjects.map(pp => {
                  const colLeft = getColumnLeft(pp.colIndex, allDates, expandedDate, slotWidth)
                  const colW = getColumnWidth(allDates[pp.colIndex] || '', expandedDate, slotWidth)
                  const projLeft = isMonthView
                    ? colLeft
                    : colLeft + pp.startOffset * colW
                  const projRight = isMonthView
                    ? colLeft + colW
                    : colLeft + pp.endOffset * colW
                  const projWidth = Math.max(projRight - projLeft, 20)
                  const isExp = allDates[pp.colIndex] === expandedDate
                  const stackTop = ROW_PADDING + BOOKING_BAR_HEIGHT + SUB_ROW_GAP + pp.stackIndex * (BAR_HEIGHT + STACK_GAP)

                  return (
                    <div
                      key={`project-${pp.project.id}`}
                      className="absolute z-[6] hover:z-[100] cursor-pointer"
                      data-no-drag
                      style={{
                        left: projLeft,
                        width: projWidth,
                        top: stackTop,
                        height: BAR_HEIGHT,
                      }}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/project-id', pp.project.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onProjectClick(pp.project)
                      }}
                    >
                      <ProjectEvent
                        project={pp.project}
                        openIssueCount={issueCountsMap[pp.project.id] || 0}
                        pendingSupplyListCount={supplyListCountsMap[pp.project.id] || 0}
                        zoomLevel={zoomLevel}
                        isExpanded={isExp}
                        nextCheckinDate={nextCheckinByProject.get(pp.project.id) || null}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
