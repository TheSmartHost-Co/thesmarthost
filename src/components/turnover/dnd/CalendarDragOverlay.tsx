'use client'

import { DragOverlay } from '@dnd-kit/core'
import type { DragItem, ProjectDragData, BookingDragData } from './types'
import ProjectEvent from '../ProjectEvent'
import BookingBar from '../BookingBar'
import type { ZoomLevel } from '../TurnoverCalendar'

interface CalendarDragOverlayProps {
  activeDragItem: DragItem | null
  zoomLevel?: ZoomLevel
}

export default function CalendarDragOverlay({
  activeDragItem,
  zoomLevel = 7,
}: CalendarDragOverlayProps) {
  return (
    <DragOverlay dropAnimation={null} zIndex={999}>
      {activeDragItem?.type === 'project' && (
        <div
          style={{
            width: 160,
            height: 80,
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            borderRadius: 8,
            pointerEvents: 'none',
          }}
        >
          <ProjectEvent
            project={(activeDragItem as ProjectDragData).project}
            zoomLevel={zoomLevel}
            nextCheckinDate={null}
          />
        </div>
      )}
      {activeDragItem?.type === 'booking' && (
        <div
          style={{
            width: 200,
            height: 36,
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            borderRadius: 8,
            pointerEvents: 'none',
          }}
        >
          <BookingBar
            booking={(activeDragItem as BookingDragData).booking}
          />
        </div>
      )}
    </DragOverlay>
  )
}
