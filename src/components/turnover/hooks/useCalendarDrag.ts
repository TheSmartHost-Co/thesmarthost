'use client'

import { useState, useRef, useCallback } from 'react'
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from '@dnd-kit/core'
import type { DragItem, PendingDrop, ProjectDragData, BookingDragData } from '../dnd/types'
import type { CleaningProject } from '@/services/types/cleaningProject'
import { getColumnLeft, getColumnWidth } from '../utils/calendarEventLayout'
import { toLocalDateStr, addDays } from '../utils/calendarDateUtils'

interface UseCalendarDragOptions {
  allDates: string[]
  expandedDate: string | null
  slotWidth: number
  translateX: number
  bufferCols: number
}

interface UseCalendarDragReturn {
  sensors: ReturnType<typeof useSensors>
  activeDragItem: DragItem | null
  isDraggingRef: React.MutableRefObject<boolean>
  pendingDrop: PendingDrop | null
  setPendingDrop: (drop: PendingDrop | null) => void
  handleDragStart: (event: DragStartEvent) => void
  handleDragEnd: (event: DragEndEvent, containerRef: React.RefObject<HTMLDivElement | null>, resourceId?: string) => void
  handleDragCancel: (event?: DragCancelEvent) => void
  resolveDropDate: (event: DragEndEvent, containerRef: React.RefObject<HTMLDivElement | null>) => string | null
}

// Draggable statuses — only these can be dragged
const DRAGGABLE_STATUSES = new Set<CleaningProject['status']>(['pending', 'assigned', 'confirmed'])

export function isDraggableProject(project: CleaningProject): boolean {
  return DRAGGABLE_STATUSES.has(project.status)
}

export function useCalendarDrag({
  allDates,
  expandedDate,
  slotWidth,
  translateX,
  bufferCols,
}: UseCalendarDragOptions): UseCalendarDragReturn {
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const isDraggingRef = useRef(false)

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  })
  const keyboardSensor = useSensor(KeyboardSensor)
  const sensors = useSensors(pointerSensor, keyboardSensor)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItem | undefined
    if (!data) return
    isDraggingRef.current = true
    setActiveDragItem(data)
  }, [])

  const resolveDropDate = useCallback((event: DragEndEvent, containerRef: React.RefObject<HTMLDivElement | null>): string | null => {
    if (!containerRef.current) return null
    const over = event.over
    // Use the activator event if available, otherwise fall back to over coordinates
    const pointerX = (event.activatorEvent as PointerEvent)?.clientX
    const deltaX = event.delta.x
    if (pointerX === undefined) return null

    const containerRect = containerRef.current.getBoundingClientRect()
    const x = (pointerX + deltaX) - containerRect.left - translateX

    let cumulative = 0
    for (let i = 0; i < allDates.length; i++) {
      const colW = getColumnWidth(allDates[i], expandedDate, slotWidth)
      if (x < cumulative + colW) {
        return allDates[i]
      }
      cumulative += colW
    }
    return null
  }, [allDates, expandedDate, slotWidth, translateX])

  const handleDragEnd = useCallback((event: DragEndEvent, containerRef: React.RefObject<HTMLDivElement | null>, resourceId?: string) => {
    isDraggingRef.current = false
    const data = event.active.data.current as DragItem | undefined
    if (!data) {
      setActiveDragItem(null)
      return
    }

    const targetDate = resolveDropDate(event, containerRef)
    if (!targetDate) {
      setActiveDragItem(null)
      return
    }

    if (data.type === 'project') {
      const projectData = data as ProjectDragData
      const sourceDate = toLocalDateStr(projectData.project.projectDate)

      // Constraint validation
      if (projectData.previousBookingCheckOut && targetDate < projectData.previousBookingCheckOut) {
        setActiveDragItem(null)
        return
      }
      if (projectData.nextBookingCheckIn && targetDate >= projectData.nextBookingCheckIn) {
        setActiveDragItem(null)
        return
      }

      // No-op if same date and same cleaner
      const sourceCleanerId = projectData.project.cleanerId || null
      const targetCleanerId = resourceId !== undefined ? (resourceId === 'unassigned' ? null : resourceId) : sourceCleanerId
      if (targetDate === sourceDate && targetCleanerId === sourceCleanerId) {
        setActiveDragItem(null)
        return
      }

      setPendingDrop({
        item: data,
        targetDate,
        targetCleanerId: resourceId !== undefined ? (resourceId === 'unassigned' ? null : resourceId) : undefined,
        targetCleanerName: null, // will be filled in by the view component
        sourceDate,
        sourceCleanerId,
      })
    } else if (data.type === 'booking') {
      const bookingData = data as BookingDragData
      const sourceDate = toLocalDateStr(bookingData.booking.checkInDate)

      if (targetDate === sourceDate) {
        setActiveDragItem(null)
        return
      }

      setPendingDrop({
        item: data,
        targetDate,
        sourceDate,
      })
    }

    setActiveDragItem(null)
  }, [resolveDropDate])

  const handleDragCancel = useCallback((_event?: DragCancelEvent) => {
    isDraggingRef.current = false
    setActiveDragItem(null)
  }, [])

  return {
    sensors,
    activeDragItem,
    isDraggingRef,
    pendingDrop,
    setPendingDrop,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    resolveDropDate,
  }
}
