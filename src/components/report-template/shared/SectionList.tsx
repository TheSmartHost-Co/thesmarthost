'use client'

import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReportSection } from '@/services/types/reportTemplate'
import {
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

interface SortableSectionItemProps {
  section: ReportSection & { fields: any[] }
  isSelected: boolean
  onSelect: () => void
  onEdit: (name: string) => void
  onDelete: () => void
  disabled?: boolean
}

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({
  section,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(section.name)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleSave = () => {
    if (editName.trim()) {
      onEdit(editName.trim())
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditName(section.name)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer ${
        isDragging
          ? 'opacity-50 bg-blue-50 border-blue-200'
          : isSelected
            ? 'bg-blue-50 border-blue-300 shadow-sm'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={() => !isEditing && onSelect()}
    >
      {/* Drag handle */}
      {!disabled && (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <Bars3Icon className="w-4 h-4" />
        </button>
      )}

      {/* Section name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleSave}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{section.name}</span>
            <span className="text-xs text-gray-500">
              ({section.fields?.length || 0} fields)
            </span>
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && !isEditing && (
        <ChevronRightIcon className="w-4 h-4 text-blue-600" />
      )}

      {/* Actions */}
      {!isEditing && !disabled && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Edit section name"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete section"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

interface SectionListProps {
  sections: (ReportSection & { fields: any[] })[]
  selectedSectionId: string | null
  onSelectSection: (sectionId: string) => void
  onReorder: (sections: (ReportSection & { fields: any[] })[]) => void
  onEditSection: (sectionId: string, name: string) => void
  onDeleteSection: (sectionId: string) => void
  onAddSection: () => void
  disabled?: boolean
}

const SectionList: React.FC<SectionListProps> = ({
  sections,
  selectedSectionId,
  onSelectSection,
  onReorder,
  onEditSection,
  onDeleteSection,
  onAddSection,
  disabled = false,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id)
      const newIndex = sections.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(sections, oldIndex, newIndex)
      onReorder(reordered)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Sections
        </h3>
        {!disabled && (
          <button
            type="button"
            onClick={onAddSection}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Add Section
          </button>
        )}
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">No sections yet</p>
          {!disabled && (
            <button
              type="button"
              onClick={onAddSection}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first section
            </button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sections.map((section) => (
                <SortableSectionItem
                  key={section.id}
                  section={section}
                  isSelected={selectedSectionId === section.id}
                  onSelect={() => onSelectSection(section.id)}
                  onEdit={(name) => onEditSection(section.id, name)}
                  onDelete={() => onDeleteSection(section.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

export default SectionList
