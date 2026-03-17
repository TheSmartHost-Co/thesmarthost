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
  isActivated?: boolean
  onOpenModal?: () => void
}

export default function DraggableProject({
  project,
  children,
  style,
  className,
  onClick,
  isActivated = false,
  onOpenModal,
}: DraggableProjectProps) {
  const canDrag = isDraggableProject(project)
  const isDragEnabled = isActivated && canDrag

  const dragData: ProjectDragData = {
    type: 'project',
    project,
    previousBookingCheckOut: project.previousBookingCheckOut || null,
    nextBookingCheckIn: project.nextBookingCheckIn || null,
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `project-${project.id}`,
    data: dragData,
    disabled: !isDragEnabled,
  })

  return (
    <div
      ref={setNodeRef}
      {...(isDragEnabled ? listeners : {})}
      {...(isDragEnabled ? attributes : {})}
      data-dnd-item
      data-no-drag
      className={className}
      style={{
        ...style,
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragEnabled ? 'grab' : 'pointer',
      }}
      onClick={onClick}
    >
      {children}
      {isActivated && onOpenModal && (
        <button
          className="absolute top-0.5 right-0.5 z-10 w-5 h-5 flex items-center justify-center rounded bg-white/80 shadow-sm border border-gray-200 hover:bg-white text-gray-500 hover:text-gray-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onOpenModal()
          }}
          title="Open details"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}
