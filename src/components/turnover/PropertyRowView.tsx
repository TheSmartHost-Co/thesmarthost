'use client'

import { useMemo, useEffect, useLayoutEffect, useCallback, useState, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import type { ZoomLevel, CalendarSizeConfig } from './TurnoverCalendar'
import { NORMAL_SIZE_CONFIG } from './TurnoverCalendar'
import type { DragItem, PendingDrop, ProjectDragData, BookingDragData, InvalidDropInfo, ActivatedItem } from './dnd/types'
import { validateProjectDrop, validateBookingDrop } from './dnd/dropValidation'
import ProjectEvent from './ProjectEvent'
import BookingBar from './BookingBar'
import DraggableProject from './dnd/DraggableProject'
import DraggableBooking from './dnd/DraggableBooking'
import CalendarDragOverlay from './dnd/CalendarDragOverlay'
import { useCalendarScroll } from './hooks/useCalendarScroll'
import { useCalendarDrag } from './hooks/useCalendarDrag'
import { useNowIndicator } from './hooks/useNowIndicator'
import { useStickyHeader } from './hooks/useStickyHeader'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getSidebarWidth } from './utils/sidebarUtils'
import { generateDateRange, addDays, formatColumnHeader, isToday, getDaysInMonth, parseLocalDate, toLocalDateStr } from './utils/calendarDateUtils'
import { layoutBookings, layoutProjects, applyProjectStacking, computeMaxStacks, getColumnLeft, getColumnWidth } from './utils/calendarEventLayout'
import { HomeModernIcon } from '@heroicons/react/24/outline'
const DAY_SLOT_WIDTH = 110
const BUFFER_DAYS = 3
const SUB_ROW_GAP = 2
const STACK_GAP = 2
const BAR_HEIGHT_DESKTOP = 80
const BAR_HEIGHT_MOBILE = 96
const BOOKING_BAR_HEIGHT_DESKTOP = 36
const BOOKING_BAR_HEIGHT_MOBILE = 44
const NOTCH_PX_DESKTOP = 10
const NOTCH_PX_MOBILE = 5
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
  onBookingDrop?: (bookingId: string, newCheckInDate: string, numNights: number) => void
  onPendingDrop?: (drop: PendingDrop) => void
  onInvalidDrop?: (info: InvalidDropInfo) => void
  stickyPortal?: RefObject<HTMLDivElement | null>
  expandedDate?: string | null
  onExpandDate?: (date: string | null) => void
  onDayClick?: (dateStr: string) => void
  scrollContainer?: RefObject<HTMLElement | null>
  navigationEpoch?: number
  allBookingsForValidation?: Booking[]
  activatedItem?: ActivatedItem
  onOpenProjectModal?: (project: CleaningProject) => void
  onOpenBookingModal?: (booking: Booking) => void
  disableDnd?: boolean
  sizeConfig?: CalendarSizeConfig
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
  onBookingDrop,
  onPendingDrop,
  onInvalidDrop,
  stickyPortal,
  expandedDate = null,
  onExpandDate,
  onDayClick,
  scrollContainer,
  navigationEpoch = 0,
  allBookingsForValidation = [],
  activatedItem,
  onOpenProjectModal,
  onOpenBookingModal,
  disableDnd = false,
  sizeConfig = NORMAL_SIZE_CONFIG,
}: PropertyRowViewProps) {
  const { t } = useTranslation('turnover')
  const isMobile = useIsMobile()
  const sidebarWidth = getSidebarWidth(isMobile)

  const BAR_HEIGHT = isMobile ? BAR_HEIGHT_MOBILE : sizeConfig.barHeightDesktop
  const BOOKING_BAR_HEIGHT = isMobile ? BOOKING_BAR_HEIGHT_MOBILE : sizeConfig.bookingBarHeightDesktop
  const NOTCH_PX = isMobile ? NOTCH_PX_MOBILE : sizeConfig.notchPxDesktop
  const ROW_PAD = isMobile ? ROW_PADDING : sizeConfig.rowPadding
  const SUB_GAP = isMobile ? SUB_ROW_GAP : sizeConfig.subRowGap
  const STK_GAP = isMobile ? STACK_GAP : sizeConfig.stackGap
  const compactDensity = !isMobile && sizeConfig.barHeightDesktop < 80

  const isMonthView = zoomLevel === 'month'
  const visibleColumns = isMonthView
    ? getDaysInMonth(parseLocalDate(dateRange.start))
    : (zoomLevel as number)
  const [containerWidth, setContainerWidth] = useState(0)
  const bufferCols = isMonthView ? 0 : BUFFER_DAYS
  const trackContainerRef = useRef<HTMLDivElement>(null)

  // Base slot width (for normal, non-expanded columns)
  const expandedInView = expandedDate && !isMonthView
  const effectiveVisibleSlots = expandedInView ? visibleColumns + 3 : visibleColumns
  const slotWidth = containerWidth > 0
    ? containerWidth / effectiveVisibleSlots
    : DAY_SLOT_WIDTH

  // Refs for layout params used in imperative scroll-frame callback
  const bufferColsRef = useRef(bufferCols)
  const layoutSlotWidthRef = useRef(slotWidth)
  const stickyTrackRef = useRef<HTMLDivElement>(null)
  const prevDateStartRef = useRef(dateRange.start)

  // Stable scroll-frame callback — directly updates DOM transforms (no React re-render)
  const handleScrollFrame = useCallback((offset: number) => {
    const tx = -(bufferColsRef.current * layoutSlotWidthRef.current) - offset
    if (trackContainerRef.current) {
      trackContainerRef.current.style.transform = `translateX(${tx}px)`
    }
    if (stickyTrackRef.current) {
      stickyTrackRef.current.style.transform = `translateX(${tx}px)`
    }
  }, [])

  const allDates = useMemo(() => {
    const start = addDays(dateRange.start, -bufferCols)
    const totalCols = visibleColumns + bufferCols * 2
    return generateDateRange(start, totalCols)
  }, [dateRange.start, bufferCols, visibleColumns])

  // DnD hook (skipped when DnD is disabled)
  const dndHook = useCalendarDrag(disableDnd ? {
    allDates: [],
    expandedDate: null,
    slotWidth: 0,
    translateX: 0,
    bufferCols: 0,
  } : {
    allDates,
    expandedDate,
    slotWidth,
    translateX: -(bufferCols * slotWidth),
    bufferCols,
  })
  const {
    sensors,
    activeDragItem,
    isDraggingRef,
    handleDragStart,
    handleDragCancel,
  } = dndHook

  const { scrollOffsetRef, pendingShiftRef, timelineRef, resetOffset } = useCalendarScroll({
    slotWidth,
    onRequestDateShift: onRequestDateShift || (() => {}),
    isDraggingRef,
    onScrollFrame: handleScrollFrame,
    dragScale: isMobile ? 2 : 1,
  })

  // Sync layout refs and DOM transform when layout params change (zoom, resize)
  useLayoutEffect(() => {
    bufferColsRef.current = bufferCols
    layoutSlotWidthRef.current = slotWidth
    handleScrollFrame(scrollOffsetRef.current)
  }, [bufferCols, slotWidth, handleScrollFrame, scrollOffsetRef])

  // After React commits a scroll-induced date shift, atomically wrap offset to match new allDates.
  // Runs BEFORE browser paint → zero visual desync.
  useLayoutEffect(() => {
    const prev = prevDateStartRef.current
    prevDateStartRef.current = dateRange.start
    if (prev === dateRange.start) return
    // Only wrap for scroll-induced shifts (pendingShiftRef > 0), not arrow navigation
    if (pendingShiftRef.current === 0) return

    const prevDate = parseLocalDate(prev)
    const currDate = parseLocalDate(dateRange.start)
    const shiftedDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000)
    if (shiftedDays === 0) return

    scrollOffsetRef.current -= shiftedDays * layoutSlotWidthRef.current
    pendingShiftRef.current -= shiftedDays
    handleScrollFrame(scrollOffsetRef.current)
  }, [dateRange.start, handleScrollFrame, scrollOffsetRef, pendingShiftRef])

  // Measure container width synchronously before first paint to avoid layout flash
  useLayoutEffect(() => {
    const el = timelineRef.current
    if (el && containerWidth === 0) {
      const w = el.getBoundingClientRect().width
      if (w > 0) setContainerWidth(w)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => { resetOffset() }, [navigationEpoch, resetOffset])

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

  // Compute total track width accounting for expanded column
  const trackWidth = useMemo(() => {
    let w = 0
    for (const d of allDates) w += getColumnWidth(d, expandedDate, slotWidth)
    return w
  }, [allDates, expandedDate, slotWidth])

  const { headerRef, isStuck } = useStickyHeader(scrollContainer)

  // When sticky header portal mounts, immediately apply the correct translateX
  // so the day columns don't flash at position 0 before the next scroll event.
  useLayoutEffect(() => {
    if (isStuck) {
      handleScrollFrame(scrollOffsetRef.current)
    }
  }, [isStuck, handleScrollFrame, scrollOffsetRef])

  // Render column header cells (shared between original and sticky clone)
  const renderColumnHeaders = useCallback(() => {
    return allDates.map(dateStr => {
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
              <span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} font-medium uppercase ${today ? 'text-blue-500' : header.isWeekend ? 'text-gray-300' : 'text-gray-400'}`}>
                {isMobile ? header.weekday.charAt(0) : header.weekday}
              </span>
            )}
            <span className={`${isMonthView ? 'text-[10px]' : isMobile ? 'text-[10px]' : 'text-xs'} font-semibold ${today ? 'text-blue-600' : 'text-gray-600'}`}>
              {header.day}
            </span>
          </div>
        </div>
      )
    })
  }, [allDates, expandedDate, slotWidth, isMonthView, onDayClick])

  // Subdivision lines for day columns (3-14 day views only)
  const subdivisions = useMemo(() => {
    if (isMonthView || typeof zoomLevel !== 'number') return []
    if (zoomLevel <= 14) return [0.25, 0.5, 0.75]
    return []
  }, [isMonthView, zoomLevel])

  // Compute effective row height per property
  const getRowHeight = useCallback((propertyId: string) => {
    const stackCount = maxStackByProperty.get(propertyId) ?? 1
    const projectSubRowHeight = stackCount * BAR_HEIGHT + (stackCount - 1) * STK_GAP
    return BOOKING_BAR_HEIGHT + SUB_GAP + Math.max(projectSubRowHeight, BAR_HEIGHT) + ROW_PAD * 2
  }, [maxStackByProperty, BAR_HEIGHT, STK_GAP, BOOKING_BAR_HEIGHT, SUB_GAP, ROW_PAD])

  // DnD drag end handler
  const handleDragEndForView = useCallback((event: DragEndEvent) => {
    const data = event.active.data.current as DragItem | undefined
    if (!data) {
      handleDragCancel()
      return
    }

    // Resolve target date from pointer position
    if (!timelineRef.current) {
      handleDragCancel()
      return
    }

    const containerRect = timelineRef.current.getBoundingClientRect()
    const pointerX = (event.activatorEvent as PointerEvent)?.clientX
    const deltaX = event.delta.x
    if (pointerX === undefined) {
      handleDragCancel()
      return
    }

    const currentTranslateX = -(bufferColsRef.current * layoutSlotWidthRef.current) - scrollOffsetRef.current
    const x = (pointerX + deltaX) - containerRect.left - currentTranslateX

    let targetDate: string | null = null
    let cumulative = 0
    for (let i = 0; i < allDates.length; i++) {
      const colW = getColumnWidth(allDates[i], expandedDate, slotWidth)
      if (x < cumulative + colW) {
        targetDate = allDates[i]
        break
      }
      cumulative += colW
    }

    isDraggingRef.current = false

    if (!targetDate) return

    if (data.type === 'project') {
      const projectData = data as ProjectDragData
      const sourceDate = toLocalDateStr(projectData.project.projectDate)

      const invalid = validateProjectDrop(projectData, targetDate)
      if (invalid) {
        onInvalidDrop?.(invalid)
        return
      }

      if (targetDate === sourceDate) return

      if (onPendingDrop) {
        onPendingDrop({
          item: data,
          targetDate,
          sourceDate,
          sourceCleanerId: projectData.project.cleanerId || null,
        })
      }
    } else if (data.type === 'booking') {
      const bookingData = data as BookingDragData
      const sourceDate = toLocalDateStr(bookingData.booking.checkInDate)

      if (targetDate === sourceDate) return

      const invalid = validateBookingDrop(bookingData, targetDate, allBookingsForValidation)
      if (invalid) {
        onInvalidDrop?.(invalid)
        return
      }

      if (onPendingDrop) {
        onPendingDrop({
          item: data,
          targetDate,
          sourceDate,
        })
      }
    }
  }, [allDates, expandedDate, slotWidth, scrollOffsetRef, timelineRef, onPendingDrop, onInvalidDrop, isDraggingRef, handleDragCancel, allBookingsForValidation])

  const calendarContent = (
      <div className="flex overflow-x-hidden overflow-y-visible select-none" style={{ cursor: disableDnd ? 'default' : activeDragItem ? 'grabbing' : 'grab', overscrollBehaviorX: 'none' }}>
        {/* Sticky Sidebar */}
        <div
          className="flex-shrink-0 border-r-2 border-gray-300 bg-white z-20 relative"
          style={{ width: sidebarWidth }}
        >
          <div className="flex items-center justify-center border-b-2 border-gray-200 bg-gray-50/80 h-10 px-2">
            {isMobile ? (
              <HomeModernIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('propertiesHeader')}</span>
            )}
          </div>
          {properties.map(property => {
            const rowHeight = getRowHeight(property.id)
            const secondaryName = property.listingName || property.internalName || property.externalName
            return (
              <div
                key={property.id}
                className="border-b-2 border-gray-300 hover:bg-gray-50/30 transition-colors relative"
                style={{ height: rowHeight }}
              >
                {isMobile ? (
                  <div className="flex items-center justify-center overflow-hidden" style={{ height: rowHeight }}>
                    <span
                      className="text-[9px] font-semibold text-gray-600 whitespace-nowrap leading-none select-none"
                      style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                        maxHeight: rowHeight - 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {property.address}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col justify-center overflow-hidden ${compactDensity ? 'py-1 px-2' : 'py-2 px-3'}`} style={{ height: rowHeight }}>
                    <div className={`font-medium text-gray-800 truncate leading-tight ${compactDensity ? 'text-[11px]' : 'text-[13px]'}`}>
                      {property.address}
                    </div>
                    {!compactDensity && secondaryName && (
                      <div className="text-[11px] text-gray-400 truncate leading-tight">{secondaryName}</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Scrollable Timeline */}
        <div ref={timelineRef} className="flex-1 overflow-x-hidden overflow-y-visible relative" style={{ overscrollBehaviorX: 'none' }}>
          <div
            ref={trackContainerRef}
            className="relative"
            style={{
              width: trackWidth,
              willChange: 'transform',
            }}
          >
            {/* Column Headers */}
            <div ref={headerRef} className="flex border-b-2 border-gray-200 bg-gray-50/80 h-10 z-10">
              {renderColumnHeaders()}
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
                      top: ROW_PAD + BOOKING_BAR_HEIGHT + SUB_GAP / 2,
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

                    const isBookingActivated = activatedItem?.type === 'booking' && activatedItem.id === pb.booking.id

                    const bookingBarContent = (
                        <BookingBar
                          booking={pb.booking}
                          isClippedLeft={pb.startColIndex < bufferCols}
                          isClippedRight={pb.endColIndex > allDates.length - bufferCols}
                          isActivated={isBookingActivated}
                          compact={isMobile || compactDensity}
                          zoomLevel={zoomLevel}
                        />
                    )

                    const bookingClassName = `absolute z-[5] hover:z-[100] ${isBookingActivated ? 'z-[200]' : ''}`
                    const bookingStyle = {
                      left: barLeft,
                      width: barWidth,
                      top: ROW_PAD,
                      height: BOOKING_BAR_HEIGHT,
                    }
                    const bookingOnClick = (e: React.MouseEvent) => {
                      e.stopPropagation()
                      onBookingClick?.(pb.booking)
                    }

                    if (disableDnd) {
                      return (
                        <div
                          key={`booking-${pb.booking.id}`}
                          className={bookingClassName}
                          style={bookingStyle}
                          onClick={bookingOnClick}
                        >
                          {bookingBarContent}
                        </div>
                      )
                    }

                    return (
                      <DraggableBooking
                        key={`booking-${pb.booking.id}`}
                        booking={pb.booking}
                        className={bookingClassName}
                        style={bookingStyle}
                        isActivated={isBookingActivated}
                        onOpenModal={onOpenBookingModal ? () => onOpenBookingModal(pb.booking) : undefined}
                        onClick={bookingOnClick}
                      >
                        {bookingBarContent}
                      </DraggableBooking>
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
                    const stackTop = ROW_PAD + BOOKING_BAR_HEIGHT + SUB_GAP + pp.stackIndex * (BAR_HEIGHT + STK_GAP)

                    const isProjectActivated = activatedItem?.type === 'project' && activatedItem.id === pp.project.id

                    const projectEventContent = (
                        <ProjectEvent
                          project={pp.project}
                          openIssueCount={issueCountsMap[pp.project.id] || 0}
                          pendingSupplyListCount={supplyListCountsMap[pp.project.id] || 0}
                          zoomLevel={zoomLevel}
                          isExpanded={isExp}
                          isActivated={isProjectActivated}
                          compact={isMobile || compactDensity}
                          isMobile={isMobile}
                        />
                    )

                    const projectClassName = `absolute z-[6] hover:z-[100] ${isProjectActivated ? 'z-[200]' : ''}`
                    const projectStyle = {
                      left: projLeft,
                      width: projWidth,
                      top: stackTop,
                      height: BAR_HEIGHT,
                    }
                    const projectOnClick = (e: React.MouseEvent) => {
                      e.stopPropagation()
                      onProjectClick(pp.project)
                    }

                    if (disableDnd) {
                      return (
                        <div
                          key={`project-${pp.project.id}`}
                          className={projectClassName}
                          style={projectStyle}
                          onClick={projectOnClick}
                        >
                          {projectEventContent}
                        </div>
                      )
                    }

                    return (
                      <DraggableProject
                        key={`project-${pp.project.id}`}
                        project={pp.project}
                        className={projectClassName}
                        style={projectStyle}
                        isActivated={isProjectActivated}
                        onOpenModal={onOpenProjectModal ? () => onOpenProjectModal(pp.project) : undefined}
                        onClick={projectOnClick}
                      >
                        {projectEventContent}
                      </DraggableProject>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sticky header portal — rendered outside overflow-hidden */}
        {isStuck && stickyPortal?.current && createPortal(
          <div className="flex h-10 bg-gray-50/95 backdrop-blur-sm border-b-2 border-gray-200 shadow-sm">
            <div
              className="flex-shrink-0 flex items-center justify-center border-r-2 border-gray-300 bg-white/95 px-2"
              style={{ width: sidebarWidth }}
            >
              {isMobile ? (
                <HomeModernIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('propertiesHeader')}</span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <div
                ref={stickyTrackRef}
                className="flex h-10"
                style={{ width: trackWidth, willChange: 'transform' }}
              >
                {renderColumnHeaders()}
              </div>
            </div>
          </div>,
          stickyPortal.current
        )}
      </div>

  )

  if (disableDnd) {
    return calendarContent
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndForView}
      onDragCancel={handleDragCancel}
    >
      {calendarContent}
      <CalendarDragOverlay activeDragItem={activeDragItem} zoomLevel={zoomLevel} />
    </DndContext>
  )
}
