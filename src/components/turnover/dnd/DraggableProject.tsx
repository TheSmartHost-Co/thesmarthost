'use client'

import { useDraggable } from '@dnd-kit/core'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { ProjectDragData } from './types'
import { isDraggableProject } from '../hooks/useCalendarDrag'

interface DraggableProjectProps {
  project: CleaningProject
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export default function DraggableProject({
  project,
  children,
  style,
  className,
  onClick,
}: DraggableProjectProps) {
  const canDrag = isDraggableProject(project)

  const dragData: ProjectDragData = {
    type: 'project',
    project,
    previousBookingCheckOut: project.previousBookingCheckOut || null,
    nextBookingCheckIn: project.nextBookingCheckIn || null,
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `project-${project.id}`,
    data: dragData,
    disabled: !canDrag,
  })

  return (
    <div
      ref={setNodeRef}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      data-dnd-item
      data-no-drag
      className={className}
      style={{
        ...style,
        opacity: isDragging ? 0.4 : 1,
        cursor: canDrag ? 'grab' : 'pointer',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
