'use client'

import React, { useState, useEffect } from 'react'
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
import type { ReportSection, SectionMode, DataSource } from '@/services/types/reportTemplate'
import {
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ChevronRightIcon,
  DocumentIcon,
  TableCellsIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline'

// Section type badge config
const SECTION_TYPE_BADGES: Record<SectionMode, { label: string; icon: typeof DocumentIcon; color: string }> = {
  header: { label: 'H', icon: DocumentIcon, color: 'bg-purple-100 text-purple-700' },
  table: { label: 'T', icon: TableCellsIcon, color: 'bg-blue-100 text-blue-700' },
  field: { label: 'F', icon: CalculatorIcon, color: 'bg-green-100 text-green-700' },
}

// Change info types (imported from parent for type safety)
interface ChangeInfo {
  type: 'added' | 'modified' | 'deleted'
  field?: string
  previousValue?: string
  currentValue?: string
}

interface SectionChangeInfo {
  change: ChangeInfo
  fields: { [fieldId: string]: ChangeInfo }
}

// Helper function to convert display name to logical name
const toLogicalName = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with _
    .replace(/^_|_$/g, '')         // Trim leading/trailing _
}

interface SortableSectionItemProps {
  section: ReportSection & { fields: any[] }
  isSelected: boolean
  onSelect: () => void
  onEdit: (name: string, logicalName: string) => void
  onDelete: () => void
  disabled?: boolean
  changeInfo?: SectionChangeInfo
}

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({
  section,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  disabled = false,
  changeInfo,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(section.name)
  const [editLogicalName, setEditLogicalName] = useState(section.logicalName || toLogicalName(section.name))
  const [logicalNameManuallyEdited, setLogicalNameManuallyEdited] = useState(false)

  // Derive change status
  const isNew = changeInfo?.change.type === 'added'
  const isModified = changeInfo?.change.type === 'modified'
  const hasFieldChanges = changeInfo && Object.keys(changeInfo.fields).length > 0
  const showChangeIndicator = isNew || isModified || hasFieldChanges

  // Reset when section changes
  useEffect(() => {
    setEditName(section.name)
    setEditLogicalName(section.logicalName || toLogicalName(section.name))
    setLogicalNameManuallyEdited(false)
  }, [section.id, section.name, section.logicalName])

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
      const finalLogicalName = editLogicalName.trim() || toLogicalName(editName.trim())
      onEdit(editName.trim(), finalLogicalName)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditName(section.name)
    setEditLogicalName(section.logicalName || toLogicalName(section.name))
    setLogicalNameManuallyEdited(false)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setEditName(newName)
    // Auto-generate logical name if not manually edited
    if (!logicalNameManuallyEdited) {
      setEditLogicalName(toLogicalName(newName))
    }
  }

  const handleLogicalNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditLogicalName(e.target.value)
    setLogicalNameManuallyEdited(true)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
        isDragging
          ? 'opacity-50 bg-blue-50 border-blue-200'
          : isSelected
            ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 border-blue-300 shadow-sm ring-1 ring-blue-100'
            : isNew
              ? 'bg-green-50/50 border-green-300 hover:border-green-400'
              : isModified || hasFieldChanges
                ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
      }`}
      onClick={() => !isEditing && onSelect()}
    >
      {/* Drag handle */}
      {!disabled && (
        <button
          type="button"
          className="p-1 mt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <Bars3Icon className="w-4 h-4" />
        </button>
      )}

      {/* Section name */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {isEditing ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {/* Display name input */}
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={handleNameChange}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Invoice Summary"
              />
            </div>
            {/* Logical name input */}
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">
                Logical Name <span className="text-gray-400">(for formulas)</span>
              </label>
              <input
                type="text"
                value={editLogicalName}
                onChange={handleLogicalNameChange}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. invoice_summary"
              />
            </div>
            {/* Action buttons */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleSave}
                className="p-1 text-green-600 hover:bg-green-50 rounded flex-shrink-0"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded flex-shrink-0"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              {/* Section type badge */}
              {(() => {
                const badge = SECTION_TYPE_BADGES[section.sectionMode || 'field']
                const BadgeIcon = badge.icon
                return (
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium flex-shrink-0 ${badge.color}`} title={section.sectionMode || 'field'}>
                    <BadgeIcon className="w-3 h-3" />
                  </span>
                )
              })()}
              {showChangeIndicator && (
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isNew ? 'bg-green-500' : 'bg-amber-500'
                }`} />
              )}
              <span className="font-medium text-gray-900 break-words leading-snug">{section.name}</span>
            </div>
            {section.logicalName && (
              <span className="text-xs text-gray-400 font-mono truncate ml-6">{section.logicalName}</span>
            )}
            <div className="flex items-center gap-2 ml-6">
              <span className="text-xs text-gray-500">
                {section.fields?.length || 0} field{section.fields?.length !== 1 ? 's' : ''}
              </span>
              {isNew && (
                <span className="text-xs text-green-600 font-medium">new</span>
              )}
              {isModified && changeInfo?.change.field?.includes('name') && changeInfo.change.previousValue && (
                <span className="text-xs text-amber-600 italic truncate" title={`Was: "${changeInfo.change.previousValue}"`}>
                  was: &quot;{changeInfo.change.previousValue}&quot;
                </span>
              )}
              {!isNew && !isModified && hasFieldChanges && (
                <span className="text-xs text-amber-600 font-medium">
                  {Object.keys(changeInfo!.fields).length} field{Object.keys(changeInfo!.fields).length !== 1 ? 's' : ''} changed
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selection indicator & Actions */}
      <div className="flex items-center gap-1 mt-0.5 flex-shrink-0">
        {isSelected && !isEditing && (
          <ChevronRightIcon className="w-4 h-4 text-blue-600" />
        )}

        {!isEditing && !disabled && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit section name"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete section"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface SectionListProps {
  sections: (ReportSection & { fields: any[] })[]
  selectedSectionId: string | null
  onSelectSection: (sectionId: string) => void
  onReorder: (sections: (ReportSection & { fields: any[] })[]) => void
  onEditSection: (sectionId: string, name: string, logicalName: string) => void
  onDeleteSection: (sectionId: string) => void
  onAddSection: () => void
  disabled?: boolean
  changeStatus?: { [sectionId: string]: SectionChangeInfo }
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
  changeStatus,
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
                  onEdit={(name, logicalName) => onEditSection(section.id, name, logicalName)}
                  onDelete={() => onDeleteSection(section.id)}
                  disabled={disabled}
                  changeInfo={changeStatus?.[section.id]}
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
