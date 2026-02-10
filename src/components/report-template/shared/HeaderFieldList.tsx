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
import type { ReportField, ReportFieldFormat } from '@/services/types/reportTemplate'
import { HEADER_VARIABLES } from '@/services/types/reportTemplate'
import { validateHeaderField } from '@/utils/formulaValidator'
import {
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
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
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

// Variable display labels
const VARIABLE_LABELS: Record<string, string> = {
  propertyName: 'Property Name',
  ownerNames: 'Owner Names',
  reportPeriod: 'Report Period',
  generatedDate: 'Generated Date',
  propertyAddress: 'Property Address',
  hostName: 'Host Name',
  hostEmail: 'Host Email',
  logo: 'Logo',
}

interface SortableHeaderFieldProps {
  field: ReportField
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: (updates: { name?: string; logicalName?: string; formula?: string }) => void
  onDelete: () => void
  disabled?: boolean
  changeInfo?: ChangeInfo
}

const SortableHeaderField: React.FC<SortableHeaderFieldProps> = ({
  field,
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
  const [editValue, setEditValue] = useState(field.formula)
  const [validationError, setValidationError] = useState<string | null>(null)

  const isNew = changeInfo?.type === 'added'
  const isModified = changeInfo?.type === 'modified'

  useEffect(() => {
    setEditName(field.name)
    setEditLogicalName(field.logicalName || toLogicalName(field.name))
    setLogicalNameManuallyEdited(false)
    setEditValue(field.formula)
    setValidationError(null)
  }, [field.id, field.name, field.logicalName, field.formula])

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

  const handleValueChange = (value: string) => {
    setEditValue(value)
    const result = validateHeaderField(value)
    setValidationError(result.valid ? null : result.error || null)
  }

  const handleSave = () => {
    const result = validateHeaderField(editValue)
    if (!result.valid) {
      setValidationError(result.error || 'Invalid value')
      return
    }

    const finalLogicalName = editLogicalName.trim() || toLogicalName(editName.trim())
    onEdit({
      name: editName.trim(),
      logicalName: finalLogicalName,
      formula: editValue.trim(),
    })
    onToggleExpand()
  }

  const handleCancel = () => {
    setEditName(field.name)
    setEditLogicalName(field.logicalName || toLogicalName(field.name))
    setLogicalNameManuallyEdited(false)
    setEditValue(field.formula)
    setValidationError(null)
    onToggleExpand()
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setEditName(newName)
    if (!logicalNameManuallyEdited) {
      setEditLogicalName(toLogicalName(newName))
    }
  }

  const insertVariable = (variable: string) => {
    const newValue = editValue ? `${editValue} {${variable}}` : `{${variable}}`
    handleValueChange(newValue.trim())
  }

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

          <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
            <DocumentTextIcon className="w-4 h-4 text-purple-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-medium text-gray-900 truncate">{field.name}</span>
              {isNew && <span className="text-xs text-green-600 font-medium">new</span>}
              {isModified && <span className="text-xs text-amber-600 font-medium">edited</span>}
            </div>
            <span className="text-xs text-gray-500 font-mono truncate block">{field.formula}</span>
          </div>

          {!disabled && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={onToggleExpand}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={editName}
              onChange={handleNameChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Property Header"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logical Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={editLogicalName}
              onChange={(e) => {
                setEditLogicalName(e.target.value)
                setLogicalNameManuallyEdited(true)
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. property_header"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input
              type="text"
              value={editValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 ${
                validationError
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="e.g. {propertyName} or plain text"
            />
            {validationError && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <ExclamationCircleIcon className="w-3 h-3" />
                {validationError}
              </p>
            )}
          </div>

          {/* Variable chips */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Insert Variable</label>
            <div className="flex flex-wrap gap-1.5">
              {HEADER_VARIABLES.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="px-2 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 rounded border border-purple-200 font-mono transition-colors"
                >
                  {`{${variable}}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Click to insert at end. Mix variables with plain text like &quot;Report for {'{propertyName}'}&quot;
            </p>
          </div>

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
              disabled={!!validationError}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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

interface HeaderFieldListProps {
  fields: ReportField[]
  onReorder: (fields: ReportField[]) => void
  onEditField: (fieldId: string, updates: { name?: string; logicalName?: string; formula?: string }) => void
  onDeleteField: (fieldId: string) => void
  onAddField: (data: { name: string; logicalName: string; formula: string; format: ReportFieldFormat }) => void
  disabled?: boolean
  changeStatus?: { [fieldId: string]: ChangeInfo }
}

const HeaderFieldList: React.FC<HeaderFieldListProps> = ({
  fields,
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
  const [newFieldValue, setNewFieldValue] = useState('')
  const [newFieldError, setNewFieldError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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

  const handleNewValueChange = (value: string) => {
    setNewFieldValue(value)
    const result = validateHeaderField(value)
    setNewFieldError(result.valid ? null : result.error || null)
  }

  const handleSaveNewField = () => {
    if (!newFieldName.trim() || !newFieldValue.trim()) return

    const result = validateHeaderField(newFieldValue)
    if (!result.valid) {
      setNewFieldError(result.error || 'Invalid value')
      return
    }

    const finalLogicalName = newFieldLogicalName.trim() || toLogicalName(newFieldName.trim())
    onAddField({
      name: newFieldName.trim(),
      logicalName: finalLogicalName,
      formula: newFieldValue.trim(),
      format: 'text',
    })
    resetNewFieldForm()
  }

  const resetNewFieldForm = () => {
    setNewFieldName('')
    setNewFieldLogicalName('')
    setNewLogicalNameManuallyEdited(false)
    setNewFieldValue('')
    setNewFieldError(null)
    setIsAddingField(false)
  }

  const handleNewNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setNewFieldName(newName)
    if (!newLogicalNameManuallyEdited) {
      setNewFieldLogicalName(toLogicalName(newName))
    }
  }

  const insertNewVariable = (variable: string) => {
    const newValue = newFieldValue ? `${newFieldValue} {${variable}}` : `{${variable}}`
    handleNewValueChange(newValue.trim())
  }

  // Inline JSX for new field form to prevent focus loss on re-render
  const newFieldFormJSX = isAddingField ? (
    <div className="border rounded-lg bg-white border-blue-300 shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
          <PlusIcon className="w-4 h-4 text-blue-600" />
        </div>
        <span className="text-sm font-medium text-blue-700">New Header Field</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
        <input
          type="text"
          value={newFieldName}
          onChange={handleNewNameChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Property Header"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Logical Name <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={newFieldLogicalName}
          onChange={(e) => {
            setNewFieldLogicalName(e.target.value)
            setNewLogicalNameManuallyEdited(true)
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. property_header"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
        <input
          type="text"
          value={newFieldValue}
          onChange={(e) => handleNewValueChange(e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 ${
            newFieldError
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
          placeholder="e.g. {propertyName} or plain text"
        />
        {newFieldError && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <ExclamationCircleIcon className="w-3 h-3" />
            {newFieldError}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Insert Variable</label>
        <div className="flex flex-wrap gap-1.5">
          {HEADER_VARIABLES.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertNewVariable(variable)}
              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 rounded border border-purple-200 font-mono transition-colors"
            >
              {`{${variable}}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={resetNewFieldForm}
          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveNewField}
          disabled={!newFieldName.trim() || !newFieldValue.trim() || !!newFieldError}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckIcon className="w-4 h-4" />
          Add Field
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Header Fields
        </h3>
        {!disabled && !isAddingField && (
          <button
            type="button"
            onClick={() => {
              setExpandedFieldId(null)
              setIsAddingField(true)
            }}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Add Field
          </button>
        )}
      </div>

      {fields.length === 0 && !isAddingField ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">No header fields yet</p>
          {!disabled && (
            <button
              type="button"
              onClick={() => setIsAddingField(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first header field
            </button>
          )}
        </div>
      ) : fields.length === 0 && isAddingField ? (
        newFieldFormJSX
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
                <SortableHeaderField
                  key={field.id}
                  field={field}
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

              {newFieldFormJSX}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
        <p className="text-xs text-purple-700">
          <strong>Header Mode:</strong> Display property metadata using variables like{' '}
          <code className="bg-purple-100 px-1 rounded">{'{propertyName}'}</code> or mix with plain text.
        </p>
      </div>
    </div>
  )
}

export default HeaderFieldList
