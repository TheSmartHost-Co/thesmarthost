'use client'

import { useMemo, useEffect, useCallback, useState } from 'react'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import type { Booking } from '@/services/types/booking'
import type { ZoomLevel } from './TurnoverCalendar'
import ProjectEvent from './ProjectEvent'
import BookingBar from './BookingBar'
import { useCalendarScroll } from './hooks/useCalendarScroll'
import { useNowIndicator } from './hooks/useNowIndicator'
import { generateDateRange, addDays, formatColumnHeader, isToday, getDaysInMonth, parseLocalDate, toLocalDateStr } from './utils/calendarDateUtils'
import { layoutProjects, layoutBookings, applyProjectStacking, computeMaxStacks, getColumnLeft, getColumnWidth } from './utils/calendarEventLayout'

const SIDEBAR_WIDTH = 200
const DAY_SLOT_WIDTH = 110
const BUFFER_DAYS = 3
const SUB_ROW_GAP = 2
const STACK_GAP = 2
const BAR_HEIGHT = 80
const BOOKING_BAR_HEIGHT = 36
const NOTCH_PX = 10
const ROW_PADDING = 5

interface CleanerRowViewProps {
  projects: CleaningProject[]
  cleaners: Cleaner[]
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

export default function CleanerRowView({
  projects,
  cleaners,
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
}: CleanerRowViewProps) {
  const isMonthView = zoomLevel === 'month'
  const visibleColumns = isMonthView
    ? getDaysInMonth(parseLocalDate(dateRange.start))
    : (zoomLevel as number)
  const [containerWidth, setContainerWidth] = useState(0)
  const bufferCols = isMonthView ? 0 : BUFFER_DAYS

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
  const positionedProjects = useMemo(() => {
    const pp = layoutProjects(projects, allDates)
    applyProjectStacking(pp, p => p.cleanerId || 'unassigned')
    return pp
  }, [projects, allDates])
  const positionedBookings = useMemo(() => layoutBookings(bookings, allDates), [bookings, allDates])

  // Compute max project stack depth per cleaner for dynamic row heights
  const maxStackByCleaner = useMemo(() => computeMaxStacks(positionedProjects, p => p.cleanerId || 'unassigned'), [positionedProjects])

  // Map bookingId → cleanerId via projects
  const bookingToCleanerMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const project of projects) {
      if (project.bookingId && project.cleanerId) {
        map.set(project.bookingId, project.cleanerId)
      }
    }
    return map
  }, [projects])

  // Group bookings by cleaner row
  const bookingsByResource = useMemo(() => {
    const map = new Map<string, typeof positionedBookings>()
    for (const pb of positionedBookings) {
      const cleanerId = bookingToCleanerMap.get(pb.booking.id) || 'unassigned'
      if (!map.has(cleanerId)) map.set(cleanerId, [])
      map.get(cleanerId)!.push(pb)
    }
    return map
  }, [positionedBookings, bookingToCleanerMap])

  const unassignedCount = useMemo(() => projects.filter(p => !p.cleanerId).length, [projects])

  type ResourceRow = {
    id: string
    label: string
    sublabel: string
    isUnassigned: boolean
    count?: number
  }

  const resourceRows: ResourceRow[] = useMemo(() => [
    {
      id: 'unassigned',
      label: 'Unassigned',
      sublabel: 'Needs assignment',
      isUnassigned: true,
      count: unassignedCount,
    },
    ...cleaners.map(c => ({
      id: c.id,
      label: c.name || c.email || 'Unnamed',
      sublabel: c.email || c.phone || 'No contact',
      isUnassigned: false,
    })),
  ], [cleaners, unassignedCount])

  const projectsByResource = useMemo(() => {
    const map = new Map<string, typeof positionedProjects>()
    for (const pp of positionedProjects) {
      const key = pp.project.cleanerId || 'unassigned'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(pp)
    }
    return map
  }, [positionedProjects])

  // For each project, find the next booking check-in date for the same property after the project's scheduled date
  const nextCheckinByProject = useMemo(() => {
    const map = new Map<string, string>()
    const sortedByProp = new Map<string, string[]>()
    for (const b of bookings) {
      if (!b.checkInDate) continue
      const dates = sortedByProp.get(b.propertyId) || []
      dates.push(toLocalDateStr(b.checkInDate))
      sortedByProp.set(b.propertyId, dates)
    }
    for (const dates of sortedByProp.values()) {
      dates.sort()
    }
    for (const project of projects) {
      const propDates = sortedByProp.get(project.propertyId)
      if (!propDates) continue
      const projDate = toLocalDateStr(project.scheduledDate)
      const next = propDates.find(d => d > projDate)
      if (next) map.set(project.id, next)
    }
    return map
  }, [bookings, projects])

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

  // Compute effective row height per cleaner
  const getRowHeight = useCallback((cleanerId: string) => {
    const stackCount = maxStackByCleaner.get(cleanerId) ?? 1
    const projectSubRowHeight = stackCount * BAR_HEIGHT + (stackCount - 1) * STACK_GAP
    return BOOKING_BAR_HEIGHT + SUB_ROW_GAP + Math.max(projectSubRowHeight, BAR_HEIGHT) + ROW_PADDING * 2
  }, [maxStackByCleaner])

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, cleanerId: string) => {
    e.preventDefault()
    const projectId = e.dataTransfer.getData('text/project-id')
    if (!projectId || !onProjectDrop) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    let cumulative = 0
    for (let i = 0; i < allDates.length; i++) {
      const colW = getColumnWidth(allDates[i], expandedDate, slotWidth)
      if (x < cumulative + colW) {
        onProjectDrop(projectId, allDates[i], cleanerId === 'unassigned' ? undefined : cleanerId)
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
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Cleaners</span>
        </div>
        {resourceRows.map(row => {
          const rowHeight = getRowHeight(row.id)
          return (
            <div
              key={row.id}
              className={`border-b-2 transition-colors ${
                row.isUnassigned ? 'border-amber-200 bg-amber-50/30' : 'border-gray-300 hover:bg-gray-50/30'
              }`}
              style={{ height: rowHeight }}
            >
              <div className="py-2 px-3 flex flex-col justify-center overflow-hidden" style={{ height: rowHeight }}>
                <div className={`font-medium text-[13px] flex items-center gap-1.5 leading-tight ${row.isUnassigned ? 'text-amber-700' : 'text-gray-800'}`}>
                  {row.label}
                  {row.isUnassigned && row.count !== undefined && row.count > 0 && (
                    <span className="px-1 py-0.5 text-[10px] bg-amber-100 text-amber-600 rounded">{row.count}</span>
                  )}
                </div>
                <div className={`text-[11px] truncate leading-tight ${row.isUnassigned ? 'text-amber-500' : 'text-gray-400'}`}>
                  {row.sublabel}
                </div>
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
          {resourceRows.map(row => {
            const rowProjects = projectsByResource.get(row.id) || []
            const rowHeight = getRowHeight(row.id)

            return (
              <div
                key={row.id}
                className={`relative border-b-2 transition-colors ${
                  row.isUnassigned ? 'border-amber-200 bg-amber-50/20' : 'border-gray-300 hover:bg-gray-50/20'
                }`}
                style={{ height: rowHeight }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, row.id)}
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
                        className={`flex-shrink-0 relative ${today ? 'bg-blue-50/30' : headerInfo.isWeekend && isMonthView ? 'bg-gray-50/30' : ''} ${isExp ? 'bg-blue-50/20' : ''}`}
                        style={{
                          width: colWidth,
                          borderRight: '1px solid rgba(0,0,0,0.12)',
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
                  />
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
                {(bookingsByResource.get(row.id) || []).map(pb => {
                  const startLeft = getColumnLeft(pb.startColIndex, allDates, expandedDate, slotWidth)
                  const startColW = getColumnWidth(allDates[pb.startColIndex] || '', expandedDate, slotWidth)
                  const barLeft = startLeft + pb.checkinOffset * startColW
                  const endLeft = getColumnLeft(pb.endColIndex - 1, allDates, expandedDate, slotWidth)
                  const endColW = getColumnWidth(allDates[pb.endColIndex - 1] || '', expandedDate, slotWidth)
                  const right = endLeft + pb.checkoutOffset * endColW
                  const barWidth = Math.max(right - barLeft, 20) + NOTCH_PX

                  // Compute sticky offset
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
                {rowProjects.map(pp => {
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
                      key={pp.project.id}
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
                        showProperty
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
