'use client'

import { useMemo, useEffect, useCallback, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import type { ZoomLevel } from './TurnoverCalendar'
import ProjectEvent from './ProjectEvent'
import { useCalendarScroll } from './hooks/useCalendarScroll'
import { useNowIndicator } from './hooks/useNowIndicator'
import { useStickyHeader } from './hooks/useStickyHeader'
import { generateDateRange, addDays, formatColumnHeader, isToday, getDaysInMonth, parseLocalDate } from './utils/calendarDateUtils'
import { layoutProjects, applyProjectStacking, computeMaxStacks, getColumnLeft, getColumnWidth } from './utils/calendarEventLayout'

const SIDEBAR_WIDTH = 200
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
  stickyPortal?: RefObject<HTMLDivElement | null>
  expandedDate?: string | null
  onExpandDate?: (date: string | null) => void
  onDayClick?: (dateStr: string) => void
  scrollContainer?: RefObject<HTMLElement | null>
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
  stickyPortal,
  expandedDate = null,
  onExpandDate,
  onDayClick,
  scrollContainer,
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

  const translateX = -(bufferCols * slotWidth) - scrollOffset

  const { headerRef, isStuck } = useStickyHeader(scrollContainer)

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
    <div className="flex overflow-x-hidden overflow-y-visible select-none" style={{ cursor: 'grab', overscrollBehaviorX: 'none' }}>
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
      <div ref={timelineRef} className="flex-1 overflow-x-hidden overflow-y-visible relative" style={{ overscrollBehaviorX: 'none' }}>
        <div
          className="relative"
          style={{
            width: trackWidth,
            transform: `translateX(${translateX}px)`,
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
                        nextCheckinDate={null}
                      />
                    </div>
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
            className="flex-shrink-0 flex items-center px-4 border-r-2 border-gray-300 bg-white/95"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Cleaners</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div
              className="flex h-10"
              style={{ width: trackWidth, transform: `translateX(${translateX}px)` }}
            >
              {renderColumnHeaders()}
            </div>
          </div>
        </div>,
        stickyPortal.current
      )}
    </div>
  )
}
