'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  ReportField,
  ReportFieldFormat,
  ColumnType,
  TotalsFunction,
  SectionFieldReference,
  DataSource,
  DataSourceColumn,
} from '@/services/types/reportTemplate'
import FormulaBuilderInput from './FormulaBuilderInput'
import {
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  HashtagIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

// Helper function to convert display name to logical name
const toLogicalName = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const COLUMN_TYPE_OPTIONS: { value: ColumnType; label: string; icon: typeof DocumentTextIcon }[] = [
  { value: 'text', label: 'Text', icon: DocumentTextIcon },
  { value: 'numeric', label: 'Numeric', icon: HashtagIcon },
  { value: 'currency', label: 'Currency', icon: CurrencyDollarIcon },
  { value: 'date', label: 'Date', icon: CalendarDaysIcon },
  { value: 'calculated', label: 'Calculated', icon: CalculatorIcon },
]

const TOTALS_FUNCTION_OPTIONS: { value: TotalsFunction; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'SUM', label: 'Sum' },
  { value: 'AVG', label: 'Average' },
  { value: 'COUNT', label: 'Count' },
]

// Change info type
interface ChangeInfo {
  type: 'added' | 'modified' | 'deleted'
  field?: string
  previousValue?: string
  currentValue?: string
}

interface TableColumnItemProps {
  field: ReportField
  allSections: SectionFieldReference[]
  currentSectionId: string
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: (updates: Partial<ReportField>) => void
  onDelete: () => void
  disabled?: boolean
  changeInfo?: ChangeInfo
  dataSourceColumns?: DataSourceColumn[]
  dataSource?: DataSource
  externalError?: string
}

const TableColumnItem: React.FC<TableColumnItemProps> = ({
  field,
  allSections,
  currentSectionId,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  disabled = false,
  changeInfo,
  dataSourceColumns = [],
  dataSource = 'booking',
  externalError,
}) => {
  const [editName, setEditName] = useState(field.name)
  const [editLogicalName, setEditLogicalName] = useState(field.logicalName || toLogicalName(field.name))
  const [logicalNameManuallyEdited, setLogicalNameManuallyEdited] = useState(false)
  const [editColumnType, setEditColumnType] = useState<ColumnType>(field.columnType || 'text')
  const [editSourceColumn, setEditSourceColumn] = useState(field.formula || '')
  const [editFormula, setEditFormula] = useState(field.formula || '')
  const [editTotalsFunction, setEditTotalsFunction] = useState<TotalsFunction>(field.totalsFunction || 'NONE')
  const [editFormat, setEditFormat] = useState<ReportFieldFormat>(field.format || 'text')

  // Validation state for source column (non-calculated types)
  const [validationState, setValidationState] = useState<{
    valid: boolean | null
    error: string | null
    checking: boolean
    suggestions?: string[]
  }>({ valid: null, error: null, checking: false })

  // Derive change status
  const isNew = changeInfo?.type === 'added'
  const isModified = changeInfo?.type === 'modified'

  // Helper to get source columns for a type from the prop
  const getSourceColumnsForType = (columnType: ColumnType): DataSourceColumn[] => {
    return dataSourceColumns.filter(c => c.columnType === columnType)
  }

  // Build column labels map
  const columnLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    for (const col of dataSourceColumns) {
      labels[col.formula] = col.name
    }
    return labels
  }, [dataSourceColumns])

  // Reset when field changes
  useEffect(() => {
    setEditName(field.name)
    setEditLogicalName(field.logicalName || toLogicalName(field.name))
    setLogicalNameManuallyEdited(false)
    setEditColumnType(field.columnType || 'text')
    setEditSourceColumn(field.formula || '')
    setEditFormula(field.formula || '')
    setEditTotalsFunction(field.totalsFunction || 'NONE')
    setEditFormat(field.format || 'text')
  }, [field.id, field.name, field.logicalName, field.columnType, field.formula, field.totalsFunction, field.format])

  // Validate source column for non-calculated types (local validation)
  useEffect(() => {
    // Only validate when expanded and column type is NOT calculated
    if (!isExpanded || editColumnType === 'calculated') {
      setValidationState({ valid: null, error: null, checking: false })
      return
    }

    if (!editSourceColumn) {
      setValidationState({ valid: null, error: null, checking: false })
      return
    }

    // Validate that sourceColumn exists in available columns (match by formula field)
    const validFormulas = dataSourceColumns.map(c => c.formula)
    const isValid = validFormulas.includes(editSourceColumn)

    setValidationState({
      valid: isValid,
      error: isValid ? null : `Unknown column: ${editSourceColumn}`,
      checking: false,
    })
  }, [editColumnType, editSourceColumn, isExpanded, dataSourceColumns])

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
    // Derive format: for calculated columns use the user-chosen format, otherwise derive from columnType
    const derivedFormat: ReportFieldFormat =
      editColumnType === 'calculated' ? editFormat :
      editColumnType === 'currency' ? 'currency' :
      editColumnType === 'numeric' ? 'numeric' : 'text'
    onEdit({
      name: editName.trim(),
      logicalName: finalLogicalName,
      columnType: editColumnType,
      formula: editColumnType === 'calculated' ? editFormula.trim() : editSourceColumn,
      format: derivedFormat,
      totalsFunction: editTotalsFunction,
    })
    onToggleExpand()
  }

  const handleCancel = () => {
    setEditName(field.name)
    setEditLogicalName(field.logicalName || toLogicalName(field.name))
    setLogicalNameManuallyEdited(false)
    setEditColumnType(field.columnType || 'text')
    setEditSourceColumn(field.formula || '')
    setEditFormula(field.formula || '')
    setEditTotalsFunction(field.totalsFunction || 'NONE')
    setEditFormat(field.format || 'text')
    onToggleExpand()
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setEditName(newName)
    if (!logicalNameManuallyEdited) {
      setEditLogicalName(toLogicalName(newName))
    }

    // Auto-search for matching source column based on name (for non-calculated types)
    if (editColumnType !== 'calculated' && newName.trim()) {
      const searchTerm = newName.toLowerCase().replace(/\s+/g, '')
      const columns = getSourceColumnsForType(editColumnType)

      // Try to find a matching column
      const match = columns.find((col) => {
        const formulaLower = col.formula.toLowerCase()
        const labelLower = col.name.toLowerCase().replace(/\s+/g, '')
        return formulaLower.includes(searchTerm) || labelLower.includes(searchTerm) ||
               searchTerm.includes(formulaLower) || searchTerm.includes(labelLower)
      })

      if (match) {
        setEditSourceColumn(match.formula)
      }
    }
  }

  const handleLogicalNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditLogicalName(e.target.value)
    setLogicalNameManuallyEdited(true)
  }

  const handleColumnTypeChange = (newType: ColumnType) => {
    setEditColumnType(newType)
    // Reset source column when type changes (unless calculated)
    if (newType !== 'calculated') {
      const columns = getSourceColumnsForType(newType)
      setEditSourceColumn(columns.length > 0 ? columns[0].formula : '')
    }
    // Set default totals function based on type
    if (newType === 'text' || newType === 'date') {
      setEditTotalsFunction('NONE')
    } else if (newType === 'numeric' || newType === 'currency' || newType === 'calculated') {
      // Default to SUM for numeric/currency/calculated columns
      setEditTotalsFunction('SUM')
    }
  }

  // Memoize sectionColumns to avoid creating a new array on every render
  const currentSectionColumnNames = useMemo(() =>
    allSections.find(s => s.sectionId === currentSectionId)
      ?.fields.map(f => f.logicalName) || [],
    [allSections, currentSectionId]
  )

  const TypeIcon = COLUMN_TYPE_OPTIONS.find((t) => t.value === (field.columnType || 'text'))?.icon || DocumentTextIcon

  // Get display text for source column or formula
  const getSourceDisplay = () => {
    if (field.columnType === 'calculated') {
      return field.formula || 'No formula'
    }
    return columnLabels[field.formula || ''] || field.formula || 'No source'
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

          {/* Type icon */}
          <div className={`w-6 h-6 rounded flex items-center justify-center relative ${
            isNew ? 'bg-green-100' : isModified ? 'bg-amber-100' : 'bg-gray-100'
          }`}>
            <TypeIcon className={`w-4 h-4 ${
              isNew ? 'text-green-600' : isModified ? 'text-amber-600' : 'text-gray-500'
            }`} />
          </div>

          {/* Column info */}
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
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="capitalize">{field.columnType || 'text'}</span>
              <span className="text-gray-300">|</span>
              <span className="font-mono truncate">{getSourceDisplay()}</span>
              {field.totalsFunction && field.totalsFunction !== 'NONE' && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-blue-600">Totals: {field.totalsFunction}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {!disabled && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={onToggleExpand}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Edit column"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete column"
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
          {/* Column Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Column Name</label>
            <input
              type="text"
              value={editName}
              onChange={handleNameChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Guest Name"
            />
          </div>

          {/* Logical Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logical Name <span className="text-gray-400 font-normal">(used in formulas)</span>
            </label>
            <input
              type="text"
              value={editLogicalName}
              onChange={handleLogicalNameChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. guest_name"
            />
          </div>

          {/* Column Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Column Type</label>
            <div className="flex flex-wrap gap-2">
              {COLUMN_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleColumnTypeChange(option.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    editColumnType === option.value
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

          {/* Source Column (for non-calculated types) */}
          {editColumnType !== 'calculated' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Column</label>
              <div className="relative">
                <select
                  value={editSourceColumn}
                  onChange={(e) => setEditSourceColumn(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 pr-10 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationState.valid === false ? 'border-red-300' :
                    validationState.valid === true ? 'border-green-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a source column</option>
                  {getSourceColumnsForType(editColumnType).map((col) => (
                    <option key={col.formula} value={col.formula}>
                      {col.name}
                    </option>
                  ))}
                </select>
                {/* Validation indicator */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-8 pointer-events-none">
                  {validationState.valid === true && (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  )}
                  {validationState.valid === false && (
                    <ExclamationCircleIcon className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              {validationState.error && (
                <p className="text-xs text-red-600 mt-1">{validationState.error}</p>
              )}
            </div>
          )}

          {/* Formula (for calculated type) */}
          {editColumnType === 'calculated' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Formula</label>
              <FormulaBuilderInput
                value={editFormula}
                onChange={setEditFormula}
                allSections={allSections}
                currentSectionId={currentSectionId}
                placeholder="e.g. nightlyRate + cleaningFee"
                validationMode="table"
                columnType="calculated"
                sectionColumns={currentSectionColumnNames}
                dataSource={dataSource}
                externalDataSourceColumns={dataSourceColumns}
                externalError={externalError}
                sectionMode="table"
              />
            </div>
          )}

          {/* Format picker (only for calculated columns) */}
          {editColumnType === 'calculated' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Format</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'currency' as ReportFieldFormat, label: 'Currency ($)', icon: CurrencyDollarIcon },
                  { value: 'numeric' as ReportFieldFormat, label: 'Numeric', icon: HashtagIcon },
                ]).map((option) => (
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
          )}

          {/* Totals Function (only for numeric/currency/calculated) */}
          {(editColumnType === 'numeric' || editColumnType === 'currency' || editColumnType === 'calculated') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Totals Row</label>
              <div className="flex flex-wrap gap-2">
                {TOTALS_FUNCTION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEditTotalsFunction(option.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      editTotalsFunction === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              disabled={validationState.checking || validationState.valid === false}
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

export default TableColumnItem
