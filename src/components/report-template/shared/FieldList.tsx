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
import type { ReportField, ReportFieldFormat } from '@/services/types/reportTemplate'
import FormulaBuilderInput from './FormulaBuilderInput'
import {
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  HashtagIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

const FORMAT_OPTIONS: { value: ReportFieldFormat; label: string; icon: typeof CurrencyDollarIcon }[] = [
  { value: 'currency', label: 'Currency', icon: CurrencyDollarIcon },
  { value: 'percentage', label: 'Percentage', icon: CalculatorIcon },
  { value: 'number', label: 'Number', icon: HashtagIcon },
  { value: 'text', label: 'Text', icon: DocumentTextIcon },
]

interface SortableFieldItemProps {
  field: ReportField
  existingFieldNames: string[]
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: (updates: { name?: string; formula?: string; format?: ReportFieldFormat }) => void
  onDelete: () => void
  disabled?: boolean
}

const SortableFieldItem: React.FC<SortableFieldItemProps> = ({
  field,
  existingFieldNames,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  disabled = false,
}) => {
  const [editName, setEditName] = useState(field.name)
  const [editFormula, setEditFormula] = useState(field.formula)
  const [editFormat, setEditFormat] = useState<ReportFieldFormat>(field.format)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleSave = () => {
    onEdit({
      name: editName.trim(),
      formula: editFormula.trim(),
      format: editFormat,
    })
    onToggleExpand()
  }

  const handleCancel = () => {
    setEditName(field.name)
    setEditFormula(field.formula)
    setEditFormat(field.format)
    onToggleExpand()
  }

  const FormatIcon = FORMAT_OPTIONS.find((f) => f.value === field.format)?.icon || HashtagIcon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group border rounded-lg transition-all ${
        isDragging
          ? 'opacity-50 bg-blue-50 border-blue-200'
          : isExpanded
            ? 'bg-white border-blue-300 shadow-sm'
            : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Collapsed view */}
      {!isExpanded && (
        <div className="flex items-center gap-2 p-3">
          {/* Drag handle */}
          {!disabled && (
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <Bars3Icon className="w-4 h-4" />
            </button>
          )}

          {/* Format icon */}
          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
            <FormatIcon className="w-4 h-4 text-gray-500" />
          </div>

          {/* Field info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">{field.name}</div>
            <div className="text-xs text-gray-500 font-mono truncate">{field.formula}</div>
          </div>

          {/* Actions */}
          {!disabled && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={onToggleExpand}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Edit field"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete field"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Expanded edit view */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Field name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Total Revenue"
            />
          </div>

          {/* Formula */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Formula</label>
            <FormulaBuilderInput
              value={editFormula}
              onChange={setEditFormula}
              existingFields={existingFieldNames}
            />
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Format</label>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEditFormat(option.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    editFormat === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <CheckIcon className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface FieldListProps {
  fields: ReportField[]
  onReorder: (fields: ReportField[]) => void
  onEditField: (fieldId: string, updates: { name?: string; formula?: string; format?: ReportFieldFormat }) => void
  onDeleteField: (fieldId: string) => void
  onAddField: () => void
  disabled?: boolean
}

const FieldList: React.FC<FieldListProps> = ({
  fields,
  onReorder,
  onEditField,
  onDeleteField,
  onAddField,
  disabled = false,
}) => {
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null)

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
      const oldIndex = fields.findIndex((f) => f.id === active.id)
      const newIndex = fields.findIndex((f) => f.id === over.id)
      const reordered = arrayMove(fields, oldIndex, newIndex)
      onReorder(reordered)
    }
  }

  // Get field names for fields above the current one (for cross-references)
  const getExistingFieldNames = (fieldIndex: number) => {
    return fields.slice(0, fieldIndex).map((f) => f.name)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Fields
        </h3>
        {!disabled && (
          <button
            type="button"
            onClick={onAddField}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Add Field
          </button>
        )}
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">No fields in this section</p>
          {!disabled && (
            <button
              type="button"
              onClick={onAddField}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first field
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
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {fields.map((field, index) => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  existingFieldNames={getExistingFieldNames(index)}
                  isExpanded={expandedFieldId === field.id}
                  onToggleExpand={() =>
                    setExpandedFieldId(expandedFieldId === field.id ? null : field.id)
                  }
                  onEdit={(updates) => onEditField(field.id, updates)}
                  onDelete={() => onDeleteField(field.id)}
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

export default FieldList
