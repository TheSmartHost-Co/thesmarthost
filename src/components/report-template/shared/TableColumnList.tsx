'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type {
  ReportField,
  ColumnType,
  TotalsFunction,
  SectionFieldReference,
  DataSource,
  DataSourceColumn,
} from '@/services/types/reportTemplate'
import TableColumnItem from './TableColumnItem'
import FormulaBuilderInput from './FormulaBuilderInput'
import {
  PlusIcon,
  CheckIcon,
  HashtagIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

// Helper function to convert display name to logical name
const toLogicalName = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

// Change info type
interface ChangeInfo {
  type: 'added' | 'modified' | 'deleted'
  field?: string
  previousValue?: string
  currentValue?: string
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

interface TableColumnListProps {
  fields: ReportField[]
  allSections: SectionFieldReference[]
  currentSectionId: string
  onReorder: (fields: ReportField[]) => void
  onEditField: (fieldId: string, updates: Partial<ReportField>) => void
  onDeleteField: (fieldId: string) => void
  onAddField: (data: Partial<ReportField>) => void
  disabled?: boolean
  changeStatus?: { [fieldId: string]: ChangeInfo }
  dataSource?: DataSource
  dataSourceColumns?: DataSourceColumn[]
}

const TableColumnList: React.FC<TableColumnListProps> = ({
  fields,
  allSections,
  currentSectionId,
  onReorder,
  onEditField,
  onDeleteField,
  onAddField,
  disabled = false,
  changeStatus,
  dataSource = 'booking',
  dataSourceColumns = [],
}) => {
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null)
  const [isAddingColumn, setIsAddingColumn] = useState(false)

  // Build column maps from dataSourceColumns prop
  const columnsByType = useMemo(() => {
    const result: { text: DataSourceColumn[]; numeric: DataSourceColumn[]; date: DataSourceColumn[]; currency: DataSourceColumn[] } = {
      text: [],
      numeric: [],
      date: [],
      currency: [],
    }
    for (const col of dataSourceColumns) {
      if (col.columnType === 'text') result.text.push(col)
      if (col.columnType === 'numeric') result.numeric.push(col)
      if (col.columnType === 'date') result.date.push(col)
      if (col.columnType === 'currency') result.currency.push(col)
    }
    return result
  }, [dataSourceColumns])

  const columnLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    for (const col of dataSourceColumns) {
      labels[col.formula] = col.name
    }
    return labels
  }, [dataSourceColumns])

  // Helper to get source columns for a type
  const getColumnsForType = (columnType: ColumnType): DataSourceColumn[] => {
    switch (columnType) {
      case 'text':
        return columnsByType.text
      case 'numeric':
        return columnsByType.numeric
      case 'currency':
        return columnsByType.currency
      case 'date':
        return columnsByType.date
      default:
        return []
    }
  }

  // Compute section column names for formula validation (same pattern as TableColumnItem)
  const currentSectionColumnNames = useMemo(() =>
    allSections.find(s => s.sectionId === currentSectionId)
      ?.fields.map(f => f.logicalName) || [],
    [allSections, currentSectionId]
  )

  // New column form state
  const [newName, setNewName] = useState('')
  const [newLogicalName, setNewLogicalName] = useState('')
  const [newLogicalNameManuallyEdited, setNewLogicalNameManuallyEdited] = useState(false)
  const [newColumnType, setNewColumnType] = useState<ColumnType>('text')
  const [newSourceColumn, setNewSourceColumn] = useState('')
  const [newFormula, setNewFormula] = useState('')
  const [newTotalsFunction, setNewTotalsFunction] = useState<TotalsFunction>('NONE')

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

  const handleStartAddColumn = () => {
    setExpandedFieldId(null)
    setIsAddingColumn(true)
    // Set default source column
    const defaultColumns = getColumnsForType('text')
    setNewSourceColumn(defaultColumns.length > 0 ? defaultColumns[0].formula : '')
  }

  const handleSaveNewColumn = () => {
    if (!newName.trim()) return
    if (newColumnType !== 'calculated' && !newSourceColumn) return
    if (newColumnType === 'calculated' && !newFormula.trim()) return

    const finalLogicalName = newLogicalName.trim() || toLogicalName(newName.trim())

    onAddField({
      name: newName.trim(),
      logicalName: finalLogicalName,
      fieldMode: 'table_column',
      columnType: newColumnType,
      sourceColumn: newColumnType !== 'calculated' ? newSourceColumn : undefined,
      formula: newColumnType === 'calculated' ? newFormula.trim() : '',
      format: newColumnType === 'currency' ? 'currency' : (newColumnType === 'numeric' || newColumnType === 'calculated') ? 'numeric' : 'text',
      totalsFunction: newTotalsFunction,
    })

    resetNewColumnForm()
  }

  const resetNewColumnForm = () => {
    setNewName('')
    setNewLogicalName('')
    setNewLogicalNameManuallyEdited(false)
    setNewColumnType('text')
    setNewSourceColumn('')
    setNewFormula('')
    setNewTotalsFunction('NONE')
    setIsAddingColumn(false)
  }

  const handleNewNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setNewName(name)
    if (!newLogicalNameManuallyEdited) {
      setNewLogicalName(toLogicalName(name))
    }
  }

  const handleNewLogicalNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewLogicalName(e.target.value)
    setNewLogicalNameManuallyEdited(true)
  }

  const handleNewColumnTypeChange = (newType: ColumnType) => {
    setNewColumnType(newType)
    if (newType !== 'calculated') {
      const columns = getColumnsForType(newType)
      setNewSourceColumn(columns.length > 0 ? columns[0].formula : '')
    }
    if (newType === 'text' || newType === 'date') {
      setNewTotalsFunction('NONE')
    } else if (newType === 'currency' || newType === 'numeric' || newType === 'calculated') {
      setNewTotalsFunction('SUM')
    }
  }

  // New column form JSX
  const newColumnFormJSX = isAddingColumn ? (
    <div className="border rounded-lg bg-white border-blue-300 shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
          <PlusIcon className="w-4 h-4 text-blue-600" />
        </div>
        <span className="text-sm font-medium text-blue-700">New Table Column</span>
      </div>

      {/* Column Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Column Name</label>
        <input
          type="text"
          value={newName}
          onChange={handleNewNameChange}
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
          value={newLogicalName}
          onChange={handleNewLogicalNameChange}
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
              onClick={() => handleNewColumnTypeChange(option.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                newColumnType === option.value
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
      {newColumnType !== 'calculated' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Column</label>
          <select
            value={newSourceColumn}
            onChange={(e) => setNewSourceColumn(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a source column</option>
            {getColumnsForType(newColumnType).map((col) => (
              <option key={col.formula} value={col.formula}>
                {col.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Formula (for calculated type) */}
      {newColumnType === 'calculated' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Formula</label>
          <FormulaBuilderInput
            value={newFormula}
            onChange={setNewFormula}
            allSections={allSections}
            currentSectionId={currentSectionId}
            placeholder="e.g. nightlyRate + cleaningFee"
            dataSource={dataSource}
            validationMode="table"
            columnType={newColumnType === 'calculated' ? 'calculated' : undefined}
            sectionColumns={currentSectionColumnNames}
            externalDataSourceColumns={dataSourceColumns}
          />
        </div>
      )}

      {/* Totals Function (only for numeric/integer/calculated) */}
      {(newColumnType === 'numeric' || newColumnType === 'currency' || newColumnType === 'calculated') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Totals Row</label>
          <div className="flex flex-wrap gap-2">
            {TOTALS_FUNCTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setNewTotalsFunction(option.value)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  newTotalsFunction === option.value
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
          onClick={resetNewColumnForm}
          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveNewColumn}
          disabled={
            !newName.trim() ||
            (newColumnType !== 'calculated' && !newSourceColumn) ||
            (newColumnType === 'calculated' && !newFormula.trim())
          }
          className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckIcon className="w-4 h-4" />
          Add Column
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Table Columns
        </h3>
        {!disabled && !isAddingColumn && (
          <button
            type="button"
            onClick={handleStartAddColumn}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Add Column
          </button>
        )}
      </div>

      {fields.length === 0 && !isAddingColumn ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">No columns in this table section</p>
          {!disabled && (
            <button
              type="button"
              onClick={handleStartAddColumn}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first column
            </button>
          )}
        </div>
      ) : fields.length === 0 && isAddingColumn ? (
        newColumnFormJSX
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
                <TableColumnItem
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
                  dataSourceColumns={dataSourceColumns}
                  dataSource={dataSource}
                />
              ))}

              {newColumnFormJSX}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Help text */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs text-blue-700">
          <strong>Table Mode:</strong> Each column will display booking data in a table format.
          Use Numeric or Calculated columns to add a totals row with aggregation functions.
        </p>
      </div>
    </div>
  )
}

export default TableColumnList
