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
import type { ReportField, ReportFieldFormat, SectionFieldReference } from '@/services/types/reportTemplate'
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

// Change info type
interface ChangeInfo {
  type: 'added' | 'modified' | 'deleted'
  field?: string
  previousValue?: string
  currentValue?: string
}

// Helper function to convert display name to logical name
const toLogicalName = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with _
    .replace(/^_|_$/g, '')         // Trim leading/trailing _
}

const FORMAT_OPTIONS: { value: ReportFieldFormat; label: string; icon: typeof CurrencyDollarIcon }[] = [
  { value: 'currency', label: 'Currency', icon: CurrencyDollarIcon },
  { value: 'percentage', label: 'Percentage', icon: CalculatorIcon },
  { value: 'number', label: 'Number', icon: HashtagIcon },
  { value: 'text', label: 'Text', icon: DocumentTextIcon },
]

interface SortableFieldItemProps {
  field: ReportField
  allSections: SectionFieldReference[]
  currentSectionId: string
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: (updates: { name?: string; logicalName?: string; formula?: string; format?: ReportFieldFormat }) => void
  onDelete: () => void
  disabled?: boolean
  changeInfo?: ChangeInfo
}

const SortableFieldItem: React.FC<SortableFieldItemProps> = ({
  field,
  allSections,
  currentSectionId,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  disabled = false,
  changeInfo,
}) => {
  const [editName, setEditName] = useState(field.name)
  const [editLogicalName, setEditLogicalName] = useState(field.logicalName || toLogicalName(field.name))
  const [logicalNameManuallyEdited, setLogicalNameManuallyEdited] = useState(false)
  const [editFormula, setEditFormula] = useState(field.formula)
  const [editFormat, setEditFormat] = useState<ReportFieldFormat>(field.format)

  // Derive change status
  const isNew = changeInfo?.type === 'added'
  const isModified = changeInfo?.type === 'modified'
  const showChangeIndicator = isNew || isModified

  // Reset when field changes
  useEffect(() => {
    setEditName(field.name)
    setEditLogicalName(field.logicalName || toLogicalName(field.name))
    setLogicalNameManuallyEdited(false)
    setEditFormula(field.formula)
    setEditFormat(field.format)
  }, [field.id, field.name, field.logicalName, field.formula, field.format])

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
    const finalLogicalName = editLogicalName.trim() || toLogicalName(editName.trim())
    onEdit({
      name: editName.trim(),
      logicalName: finalLogicalName,
      formula: editFormula.trim(),
      format: editFormat,
    })
    onToggleExpand()
  }

  const handleCancel = () => {
    setEditName(field.name)
    setEditLogicalName(field.logicalName || toLogicalName(field.name))
    setLogicalNameManuallyEdited(false)
    setEditFormula(field.formula)
    setEditFormat(field.format)
    onToggleExpand()
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
            : isNew
              ? 'bg-green-50/50 border-green-300 hover:border-green-400'
              : isModified
                ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
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

          {/* Format icon with change indicator */}
          <div className={`w-6 h-6 rounded flex items-center justify-center relative ${
            isNew ? 'bg-green-100' : isModified ? 'bg-amber-100' : 'bg-gray-100'
          }`}>
            <FormatIcon className={`w-4 h-4 ${
              isNew ? 'text-green-600' : isModified ? 'text-amber-600' : 'text-gray-500'
            }`} />
            {showChangeIndicator && (
              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isNew ? 'bg-green-500' : 'bg-amber-500'
              }`} />
            )}
          </div>

          {/* Field info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-medium text-gray-900 truncate">{field.name}</span>
              {field.logicalName && (
                <span className="text-xs text-gray-400 font-mono truncate">({field.logicalName})</span>
              )}
              {isNew && (
                <span className="text-xs text-green-600 font-medium">new</span>
              )}
              {isModified && (
                <span className="text-xs text-amber-600 font-medium">edited</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono truncate">{field.formula}</span>
            </div>
            {isModified && changeInfo?.previousValue && (
              <div className="text-xs text-amber-600/80 italic truncate" title={`Previous: ${changeInfo.previousValue}`}>
                was: {changeInfo.field?.includes('formula') ? (
                  <span className="font-mono">{changeInfo.previousValue}</span>
                ) : (
                  <span>&quot;{changeInfo.previousValue}&quot;</span>
                )}
              </div>
            )}
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
          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={editName}
              onChange={handleNameChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Total Revenue"
            />
          </div>

          {/* Logical name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logical Name <span className="text-gray-400 font-normal">(used in formulas)</span>
            </label>
            <input
              type="text"
              value={editLogicalName}
              onChange={handleLogicalNameChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. total_revenue"
            />
          </div>

          {/* Formula */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Formula</label>
            <FormulaBuilderInput
              value={editFormula}
              onChange={setEditFormula}
              allSections={allSections}
              currentSectionId={currentSectionId}
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
  allSections: SectionFieldReference[]  // All sections for cross-section references
  currentSectionId: string              // Current section ID
  onReorder: (fields: ReportField[]) => void
  onEditField: (fieldId: string, updates: { name?: string; logicalName?: string; formula?: string; format?: ReportFieldFormat }) => void
  onDeleteField: (fieldId: string) => void
  onAddField: (data: { name: string; logicalName: string; formula: string; format: ReportFieldFormat }) => void
  disabled?: boolean
  changeStatus?: { [fieldId: string]: ChangeInfo }
}

const FieldList: React.FC<FieldListProps> = ({
  fields,
  allSections,
  currentSectionId,
  onReorder,
  onEditField,
  onDeleteField,
  onAddField,
  disabled = false,
  changeStatus,
}) => {
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null)
  const [isAddingField, setIsAddingField] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldLogicalName, setNewFieldLogicalName] = useState('')
  const [newLogicalNameManuallyEdited, setNewLogicalNameManuallyEdited] = useState(false)
  const [newFieldFormula, setNewFieldFormula] = useState('')
  const [newFieldFormat, setNewFieldFormat] = useState<ReportFieldFormat>('currency')

  const handleSaveNewField = () => {
    if (!newFieldName.trim() || !newFieldFormula.trim()) return
    const finalLogicalName = newFieldLogicalName.trim() || toLogicalName(newFieldName.trim())
    onAddField({
      name: newFieldName.trim(),
      logicalName: finalLogicalName,
      formula: newFieldFormula.trim(),
      format: newFieldFormat,
    })
    // Reset form
    setNewFieldName('')
    setNewFieldLogicalName('')
    setNewLogicalNameManuallyEdited(false)
    setNewFieldFormula('')
    setNewFieldFormat('currency')
    setIsAddingField(false)
  }

  const handleCancelAdd = () => {
    setNewFieldName('')
    setNewFieldLogicalName('')
    setNewLogicalNameManuallyEdited(false)
    setNewFieldFormula('')
    setNewFieldFormat('currency')
    setIsAddingField(false)
  }

  const handleStartAddField = () => {
    setExpandedFieldId(null) // Collapse any expanded field
    setIsAddingField(true)
  }

  const handleNewNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setNewFieldName(newName)
    // Auto-generate logical name if not manually edited
    if (!newLogicalNameManuallyEdited) {
      setNewFieldLogicalName(toLogicalName(newName))
    }
  }

  const handleNewLogicalNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewFieldLogicalName(e.target.value)
    setNewLogicalNameManuallyEdited(true)
  }

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

  // New field form component (used in both empty and non-empty states)
  const NewFieldForm = () => (
    <div className="border rounded-lg bg-white border-blue-300 shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
          <PlusIcon className="w-4 h-4 text-blue-600" />
        </div>
        <span className="text-sm font-medium text-blue-700">New Field</span>
      </div>

      {/* Display name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
        <input
          type="text"
          value={newFieldName}
          onChange={handleNewNameChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Total Revenue"
          autoFocus
        />
      </div>

      {/* Logical name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Logical Name <span className="text-gray-400 font-normal">(used in formulas)</span>
        </label>
        <input
          type="text"
          value={newFieldLogicalName}
          onChange={handleNewLogicalNameChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. total_revenue"
        />
      </div>

      {/* Formula */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Formula</label>
        <FormulaBuilderInput
          value={newFieldFormula}
          onChange={setNewFieldFormula}
          allSections={allSections}
          currentSectionId={currentSectionId}
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
              onClick={() => setNewFieldFormat(option.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                newFieldFormat === option.value
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
          onClick={handleCancelAdd}
          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveNewField}
          disabled={!newFieldName.trim() || !newFieldFormula.trim()}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckIcon className="w-4 h-4" />
          Save
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Fields
        </h3>
        {!disabled && !isAddingField && (
          <button
            type="button"
            onClick={handleStartAddField}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Add Field
          </button>
        )}
      </div>

      {fields.length === 0 && !isAddingField ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">No fields in this section</p>
          {!disabled && (
            <button
              type="button"
              onClick={handleStartAddField}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first field
            </button>
          )}
        </div>
      ) : fields.length === 0 && isAddingField ? (
        <NewFieldForm />
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
              {fields.map((field) => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  allSections={allSections}
                  currentSectionId={currentSectionId}
                  isExpanded={expandedFieldId === field.id}
                  onToggleExpand={() =>
                    setExpandedFieldId(expandedFieldId === field.id ? null : field.id)
                  }
                  onEdit={(updates) => onEditField(field.id, updates)}
                  onDelete={() => onDeleteField(field.id)}
                  disabled={disabled}
                  changeInfo={changeStatus?.[field.id]}
                />
              ))}

              {/* Add New Field Form (when there are existing fields) */}
              {isAddingField && <NewFieldForm />}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

export default FieldList
