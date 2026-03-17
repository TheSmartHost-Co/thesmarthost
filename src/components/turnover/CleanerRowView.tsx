'use client'

import { useMemo, useEffect, useLayoutEffect, useCallback, useState, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import type { ZoomLevel } from './TurnoverCalendar'
import type { DragItem, PendingDrop, ProjectDragData, InvalidDropInfo, ActivatedItem } from './dnd/types'
import { validateProjectDrop, validateCleanerViewDrop } from './dnd/dropValidation'
import ProjectEvent from './ProjectEvent'
import DraggableProject from './dnd/DraggableProject'
import CalendarDragOverlay from './dnd/CalendarDragOverlay'
import { useCalendarScroll } from './hooks/useCalendarScroll'
import { useCalendarDrag } from './hooks/useCalendarDrag'
import { useNowIndicator } from './hooks/useNowIndicator'
import { useStickyHeader } from './hooks/useStickyHeader'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getSidebarWidth } from './utils/sidebarUtils'
import { generateDateRange, addDays, formatColumnHeader, isToday, getDaysInMonth, parseLocalDate, toLocalDateStr } from './utils/calendarDateUtils'
import { layoutProjects, applyProjectStacking, computeMaxStacks, getColumnLeft, getColumnWidth } from './utils/calendarEventLayout'
import { UserCircleIcon } from '@heroicons/react/24/outline'
const DAY_SLOT_WIDTH = 110
const BUFFER_DAYS = 3
const STACK_GAP = 2
const BAR_HEIGHT = 80
const ROW_PADDING = 5

interface CleanerRowViewProps {
  projects: CleaningProject[]
  cleaners: Cleaner[]
  dateRange: { start: string; end: string }
  onProjectClick: (project: CleaningProject) => void
  issueCountsMap?: Record<string, number>
  supplyListCountsMap?: Record<string, number>
  zoomLevel?: ZoomLevel
  onRequestDateShift?: (days: number) => void
  onProjectDrop?: (projectId: string, newDate: string, newCleanerId?: string) => void
  onPendingDrop?: (drop: PendingDrop) => void
  onInvalidDrop?: (info: InvalidDropInfo) => void
  stickyPortal?: RefObject<HTMLDivElement | null>
  expandedDate?: string | null
  onExpandDate?: (date: string | null) => void
  onDayClick?: (dateStr: string) => void
  scrollContainer?: RefObject<HTMLElement | null>
  navigationEpoch?: number
  activatedItem?: ActivatedItem
  onOpenProjectModal?: (project: CleaningProject) => void
}

export default function CleanerRowView({
  projects,
  cleaners,
  dateRange,
  onProjectClick,
  issueCountsMap = {},
  supplyListCountsMap = {},
  zoomLevel = 7,
  onRequestDateShift,
  onProjectDrop,
  onPendingDrop,
  onInvalidDrop,
  stickyPortal,
  expandedDate = null,
  onExpandDate,
  onDayClick,
  scrollContainer,
  navigationEpoch = 0,
  activatedItem,
  onOpenProjectModal,
}: CleanerRowViewProps) {
  const isMobile = useIsMobile()
  const sidebarWidth = getSidebarWidth(isMobile)

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

  // Refs for layout params used in imperative scroll-frame callback
  const bufferColsRef = useRef(bufferCols)
  const layoutSlotWidthRef = useRef(slotWidth)
  const trackContainerRef = useRef<HTMLDivElement>(null)
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

  // DnD hook
  const {
    sensors,
    activeDragItem,
    isDraggingRef,
    handleDragStart,
    handleDragCancel,
  } = useCalendarDrag({
    allDates,
    expandedDate,
    slotWidth,
    translateX: -(bufferCols * slotWidth),
    bufferCols,
  })

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
  const positionedProjects = useMemo(() => {
    const pp = layoutProjects(projects, allDates)
    applyProjectStacking(pp, p => p.cleanerId || 'unassigned')
    return pp
  }, [projects, allDates])

  // Compute max project stack depth per cleaner for dynamic row heights
  const maxStackByCleaner = useMemo(() => computeMaxStacks(positionedProjects, p => p.cleanerId || 'unassigned'), [positionedProjects])

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

  // Build cleaner name lookup for confirmation modal
  const cleanerNameById = useMemo(() => {
    const map = new Map<string, string>()
    map.set('unassigned', 'Unassigned')
    for (const c of cleaners) {
      map.set(c.id, c.name || c.email || 'Unnamed')
    }
    return map
  }, [cleaners])

  const projectsByResource = useMemo(() => {
    const map = new Map<string, typeof positionedProjects>()
    for (const pp of positionedProjects) {
      const key = pp.project.cleanerId || 'unassigned'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(pp)
    }
    return map
  }, [positionedProjects])

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
              <span className={`text-[10px] font-medium uppercase ${today ? 'text-blue-500' : header.isWeekend ? 'text-gray-300' : 'text-gray-400'}`}>
                {header.weekday}
              </span>
            )}
            <span className={`${isMonthView ? 'text-[10px]' : 'text-xs'} font-semibold ${today ? 'text-blue-600' : 'text-gray-600'}`}>
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

  // Compute effective row height per cleaner
  const getRowHeight = useCallback((cleanerId: string) => {
    const stackCount = maxStackByCleaner.get(cleanerId) ?? 1
    const projectSubRowHeight = stackCount * BAR_HEIGHT + (stackCount - 1) * STACK_GAP
    return Math.max(projectSubRowHeight, BAR_HEIGHT) + ROW_PADDING * 2
  }, [maxStackByCleaner])

  // Resolve which row a drop landed on based on Y coordinate
  const resolveDropRow = useCallback((event: DragEndEvent): string | undefined => {
    if (!timelineRef.current) return undefined
    const containerRect = timelineRef.current.getBoundingClientRect()
    const pointerY = (event.activatorEvent as PointerEvent)?.clientY
    const deltaY = event.delta.y
    if (pointerY === undefined) return undefined

    const y = (pointerY + deltaY) - containerRect.top
    const headerHeight = 40 // h-10

    let cumY = headerHeight
    for (const row of resourceRows) {
      const rowH = getRowHeight(row.id)
      if (y < cumY + rowH) {
        return row.id
      }
      cumY += rowH
    }
    return undefined
  }, [timelineRef, resourceRows, getRowHeight])

  // DnD drag end handler
  const handleDragEndForView = useCallback((event: DragEndEvent) => {
    const data = event.active.data.current as DragItem | undefined
    if (!data || data.type !== 'project') {
      isDraggingRef.current = false
      return
    }

    if (!timelineRef.current) {
      isDraggingRef.current = false
      return
    }

    const containerRect = timelineRef.current.getBoundingClientRect()
    const pointerX = (event.activatorEvent as PointerEvent)?.clientX
    const deltaX = event.delta.x
    if (pointerX === undefined) {
      isDraggingRef.current = false
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

    const projectData = data as ProjectDragData
    const project = projectData.project
    const sourceDate = toLocalDateStr(project.projectDate)

    // Cleaner view: block date changes (reassignment only)
    const dateChangeInvalid = validateCleanerViewDrop(projectData, targetDate, sourceDate)
    if (dateChangeInvalid) {
      onInvalidDrop?.(dateChangeInvalid)
      return
    }

    // Constraint validation
    const invalid = validateProjectDrop(projectData, targetDate)
    if (invalid) {
      onInvalidDrop?.(invalid)
      return
    }

    // Resolve target row (cleaner)
    const targetRowId = resolveDropRow(event)
    const targetCleanerId = targetRowId === 'unassigned' ? null : (targetRowId || null)
    const sourceCleanerId = project.cleanerId || null

    // No-op if same date and same cleaner
    if (targetDate === sourceDate && targetCleanerId === sourceCleanerId) return

    if (onPendingDrop) {
      onPendingDrop({
        item: data,
        targetDate,
        targetCleanerId: targetRowId !== undefined ? targetCleanerId : undefined,
        targetCleanerName: targetRowId ? cleanerNameById.get(targetRowId) || null : null,
        sourceDate,
        sourceCleanerId,
      })
    }
  }, [allDates, expandedDate, slotWidth, scrollOffsetRef, timelineRef, onPendingDrop, onInvalidDrop, isDraggingRef, resolveDropRow, cleanerNameById])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndForView}
      onDragCancel={handleDragCancel}
    >
      <div className="flex overflow-x-hidden overflow-y-visible select-none" style={{ cursor: activeDragItem ? 'grabbing' : 'grab', overscrollBehaviorX: 'none' }}>
        {/* Sticky Sidebar */}
        <div
          className="flex-shrink-0 border-r-2 border-gray-300 bg-white z-20 relative"
          style={{ width: sidebarWidth }}
        >
          <div className="flex items-center justify-center border-b-2 border-gray-200 bg-gray-50/80 h-10 px-2">
            {isMobile ? (
              <UserCircleIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Cleaners</span>
            )}
          </div>
          {resourceRows.map(row => {
            const rowHeight = getRowHeight(row.id)
            return (
              <div
                key={row.id}
                className={`border-b-2 transition-colors relative ${
                  row.isUnassigned ? 'border-amber-200 bg-amber-50/30' : 'border-gray-300 hover:bg-gray-50/30'
                }`}
                style={{ height: rowHeight }}
              >
                {isMobile ? (
                  <div className="flex items-center justify-center overflow-hidden" style={{ height: rowHeight }}>
                    <span
                      className={`text-[11px] font-semibold whitespace-nowrap leading-none select-none ${row.isUnassigned ? 'text-amber-700' : 'text-gray-600'}`}
                      style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                        maxHeight: rowHeight - 8,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {row.label}
                    </span>
                  </div>
                ) : (
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

                  {/* Project bars with stacking */}
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
                    const stackTop = ROW_PADDING + pp.stackIndex * (BAR_HEIGHT + STACK_GAP)

                    const isProjectActivated = activatedItem?.type === 'project' && activatedItem.id === pp.project.id

                    return (
                      <DraggableProject
                        key={pp.project.id}
                        project={pp.project}
                        className={`absolute z-[6] hover:z-[100] ${isProjectActivated ? 'z-[200]' : ''}`}
                        style={{
                          left: projLeft,
                          width: projWidth,
                          top: stackTop,
                          height: BAR_HEIGHT,
                        }}
                        isActivated={isProjectActivated}
                        onOpenModal={onOpenProjectModal ? () => onOpenProjectModal(pp.project) : undefined}
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
                          isActivated={isProjectActivated}
                        />
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
                <UserCircleIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Cleaners</span>
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

      {/* Drag Overlay */}
      <CalendarDragOverlay activeDragItem={activeDragItem} zoomLevel={zoomLevel} />
    </DndContext>
  )
}
