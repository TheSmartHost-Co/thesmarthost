'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getDataSourceColumns } from '@/services/reportTemplateService'
import type { SectionFieldReference, ColumnType, DataSource, DataSourceColumn } from '@/services/types/reportTemplate'
import {
  validateFormulaSyntax,
  validateTableColumn as validateTableColumnLocal,
  validateAggregateField,
  validateSumIfFormula,
  validateIfFormula,
} from '@/utils/formulaValidator'
import { getFormulaContext } from '@/utils/formulaContext'
import type { FormulaContextKind } from '@/utils/formulaContext'
import ContextualPillBar from './ContextualPillBar'
import type { Pill, PillGroup } from './ContextualPillBar'
import FormulaHelpPanel from './FormulaHelpPanel'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'

// Operators for search term extraction
const OPERATORS = ['+', '-', '*', '/', '(', ')', '[', ']', ' ']

// Function syntax hints (shown for complex functions)
const FUNCTION_SYNTAX: Record<string, string> = {
  SUM: 'SUM(column)',
  AVG: 'AVG(column)',
  COUNT: 'COUNT()',
  MIN: 'MIN(column)',
  MAX: 'MAX(column)',
  SUMIF: 'SUMIF(column, filterField, "operator", "value")',
  AVGIF: 'AVGIF(column, filterField, "operator", "value")',
  COUNTIF: 'COUNTIF(column, filterField, "operator", "value")',
  MINIF: 'MINIF(column, filterField, "operator", "value")',
  MAXIF: 'MAXIF(column, filterField, "operator", "value")',
}

// Function descriptions
const FUNCTION_DESCRIPTIONS: Record<string, string> = {
  SUM: 'Sum all values of a column',
  AVG: 'Average of a column',
  COUNT: 'Total number of items',
  MIN: 'Minimum value of a column',
  MAX: 'Maximum value of a column',
  SUMIF: 'Sum values where condition is met',
  AVGIF: 'Average where condition is met',
  COUNTIF: 'Count items where condition is met',
  MINIF: 'Minimum where condition is met',
  MAXIF: 'Maximum where condition is met',
}

// Stable empty array defaults to prevent re-render loops from new references
const EMPTY_SECTIONS: SectionFieldReference[] = []
const EMPTY_COLUMNS: string[] = []
const EMPTY_TABLE_SECTIONS: { name: string; logicalName: string; columns: string[] }[] = []

// All supported functions (hardcoded, no API dependency)
const FUNCTIONS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'SUMIF', 'AVGIF', 'COUNTIF', 'MINIF', 'MAXIF']

// Comparison operators for SUMIF/IF conditional arguments
const COMPARISON_OPERATORS = ['=', '!=', '<', '>', '<=', '>=']

// Get the search term (text after the last operator)
const getSearchTerm = (text: string): string => {
  let lastOperatorIndex = -1
  for (const op of OPERATORS) {
    const idx = text.lastIndexOf(op)
    if (idx > lastOperatorIndex) {
      lastOperatorIndex = idx
    }
  }

  if (lastOperatorIndex !== -1) {
    return text.substring(lastOperatorIndex + 1).trim()
  }
  return text.trim()
}

interface FormulaBuilderInputProps {
  value: string
  onChange: (value: string) => void
  allSections?: SectionFieldReference[] // All sections with fields for cross-references
  currentSectionId?: string // To identify "same section" fields
  placeholder?: string
  disabled?: boolean
  // Table-mode validation props
  validationMode?: 'field' | 'table'  // Default: 'field'
  columnType?: ColumnType             // For table mode
  sectionColumns?: string[]           // Other columns in section for table mode
  // Data source for table sections (booking or expense)
  dataSource?: DataSource
  // Table sections for aggregate field validation
  tableSections?: { name: string; logicalName: string; columns: string[] }[]
  // Data source columns from parent (cached from API) - if provided, skips internal fetch
  externalDataSourceColumns?: DataSourceColumn[]
  // External error from batch validation (shown in amber)
  externalError?: string | null
  // Section mode for help panel context
  sectionMode?: 'header' | 'field' | 'table'
}

const FormulaBuilderInput: React.FC<FormulaBuilderInputProps> = ({
  value,
  onChange,
  allSections = EMPTY_SECTIONS,
  currentSectionId,
  placeholder = 'e.g. SUM(mgmtFee) or SUM(totalPayout) * 0.05',
  disabled = false,
  validationMode = 'field',
  columnType,
  sectionColumns = EMPTY_COLUMNS,
  dataSource,
  tableSections = EMPTY_TABLE_SECTIONS,
  externalDataSourceColumns,
  externalError,
  sectionMode,
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [validationState, setValidationState] = useState<{
    valid: boolean | null
    error: string | null
    checking: boolean
    suggestions?: string[]
  }>({ valid: null, error: null, checking: false })
  const [activeTab, setActiveTab] = useState<'functions' | 'columns' | 'fields'>('functions')

  // API data state
  const [dataSourceColumns, setDataSourceColumns] = useState<DataSourceColumn[]>([])
  const [loadingColumns, setLoadingColumns] = useState(false)

  // Track cursor position for accurate search term extraction
  const [cursorPosition, setCursorPosition] = useState<number>(0)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch data source columns only if parent doesn't provide them
  useEffect(() => {
    if (externalDataSourceColumns && externalDataSourceColumns.length > 0) {
      setLoadingColumns(false)
      return
    }
    if (!dataSource) {
      setLoadingColumns(false)
      return
    }
    const loadColumns = async () => {
      setLoadingColumns(true)
      try {
        const res = await getDataSourceColumns(dataSource)
        if (res.status === 'success') {
          setDataSourceColumns(res.data.columns || [])
        }
      } catch (error) {
        console.error('Error loading columns:', error)
      } finally {
        setLoadingColumns(false)
      }
    }
    loadColumns()
  }, [dataSource, externalDataSourceColumns])

  // Determine which columns to use for validation
  // Prefer external prop (from parent) over internal state (from API fetch)
  const effectiveDataSourceColumns = useMemo(() => {
    if (externalDataSourceColumns && externalDataSourceColumns.length > 0) {
      return externalDataSourceColumns
    }
    return dataSourceColumns
  }, [externalDataSourceColumns, dataSourceColumns])

  // Get available column formulas for validation
  const availableColumnFormulas = useMemo(() => {
    if (effectiveDataSourceColumns && effectiveDataSourceColumns.length > 0) {
      return effectiveDataSourceColumns.map(c => c.formula)
    }
    return []
  }, [effectiveDataSourceColumns])

  // Get the current search term from text before cursor (not full value)
  const searchTerm = useMemo(() => {
    const textBeforeCursor = value.substring(0, cursorPosition)
    return getSearchTerm(textBeforeCursor)
  }, [value, cursorPosition])

  // Compute formula context for context-aware pills
  const formulaContext = useMemo(() => {
    return getFormulaContext(value, cursorPosition)
  }, [value, cursorPosition])

  // Whether we're in calculated column mode (uses {ref} syntax, not bare column names)
  const isCalculatedMode = validationMode === 'table' && columnType === 'calculated'

  // If calculated mode is toggled on while Columns tab is active, switch to Functions
  useEffect(() => {
    if (isCalculatedMode && activeTab === 'columns') {
      setActiveTab('functions')
    }
  }, [isCalculatedMode, activeTab])

  // Build context-aware pill groups based on formula context
  const pillGroups = useMemo((): PillGroup[] => {
    const term = formulaContext.partialText.toLowerCase()
    const groups: PillGroup[] = []

    // Helper: build function pills
    const functionPills = (): Pill[] =>
      FUNCTIONS
        .filter(f => f.toLowerCase().includes(term))
        .slice(0, 5)
        .map(f => ({
          kind: 'function' as const,
          label: `${f}()`,
          insertText: `${f}()`,
          description: FUNCTION_DESCRIPTIONS[f],
          isFunctionWithParens: true,
        }))

    // Helper: build bare column pills (for non-calculated contexts: field-mode SUM(col), direct columns)
    const bareColumnPills = (types?: string[]): Pill[] =>
      effectiveDataSourceColumns
        .filter(c => {
          if (types && !types.includes(c.columnType)) return false
          return c.name.toLowerCase().includes(term) || c.formula.toLowerCase().includes(term)
        })
        .slice(0, 5)
        .map(c => ({
          kind: 'column' as const,
          label: c.formula,
          insertText: c.formula,
          description: c.name,
        }))

    // Helper: build {logicalName} ref pills for calculated columns
    // In calculated mode, {refs} resolve against other columns in the SAME table section
    // by their logicalName (snake_case), NOT against raw data source fields
    const sameTableColumnRefPills = (): Pill[] =>
      sectionColumns
        .filter(colName => colName.toLowerCase().includes(term))
        .slice(0, 8)
        .map(colName => ({
          kind: 'field_ref' as const,
          label: `{${colName}}`,
          insertText: `{${colName}}`,
          description: `Column: ${colName}`,
        }))

    // Helper: build cross-section field ref pills
    const fieldRefPills = (): Pill[] => {
      const pills: Pill[] = []
      allSections.forEach(section => {
        section.fields.forEach(field => {
          if (field.name.toLowerCase().includes(term) || field.logicalName.toLowerCase().includes(term)) {
            const isSameSection = section.sectionId === currentSectionId
            const insertValue = isSameSection
              ? `{${field.logicalName}}`
              : `{${section.sectionLogicalName}.${field.logicalName}}`
            pills.push({
              kind: 'field_ref' as const,
              label: insertValue,
              insertText: insertValue,
              description: isSameSection ? field.name : `${section.sectionName}: ${field.name}`,
            })
          }
        })
      })
      return pills.slice(0, 5)
    }

    // Helper: build comparison operator pills
    const compareOpPills = (): Pill[] =>
      COMPARISON_OPERATORS.map(op => ({
        kind: 'compare_op' as const,
        label: `'${op}'`,
        insertText: `'${op}'`,
        description: `Comparison: ${op}`,
      }))

    // Helper: arithmetic operator pills
    const arithmeticPills = (): Pill[] =>
      ['+', '-', '*', '/'].map(op => ({
        kind: 'arithmetic_op' as const,
        label: op,
        insertText: op,
        description: `Operator: ${op}`,
      }))

    // Helper: section name pills (for brace refs)
    const sectionNamePills = (): Pill[] =>
      allSections
        .filter(s => s.sectionLogicalName.toLowerCase().includes(term) || s.sectionName.toLowerCase().includes(term))
        .slice(0, 5)
        .map(s => ({
          kind: 'field_ref' as const,
          label: s.sectionLogicalName,
          insertText: `${s.sectionLogicalName}.`,
          description: s.sectionName,
        }))

    // Helper: field pills from a specific section
    const sectionFieldPills = (sectionLogicalName: string): Pill[] => {
      const section = allSections.find(s => s.sectionLogicalName === sectionLogicalName)
      if (!section) return []
      return section.fields
        .filter(f => f.logicalName.toLowerCase().includes(term) || f.name.toLowerCase().includes(term))
        .slice(0, 5)
        .map(f => ({
          kind: 'field_ref' as const,
          label: f.logicalName,
          insertText: f.logicalName,
          description: f.name,
        }))
    }

    // Build groups based on context kind
    const ctx = formulaContext.kind

    // In calculated table column mode, columns are always shown as {refs}, never bare
    // In field mode (aggregates), columns inside SUM()/AVG() are bare names
    // In IF() for calculated columns, condition field is bare, but true/false exprs use {refs}

    switch (ctx) {
      case 'function_arg':
        // Inside SUM(/AVG( etc — bare column names for field-mode, same-table {refs} for calculated
        if (isCalculatedMode) {
          groups.push({ pills: sameTableColumnRefPills(), color: 'purple', label: 'Columns' })
        } else {
          groups.push({ pills: bareColumnPills(), color: 'gray' })
        }
        groups.push({ pills: fieldRefPills(), color: 'purple' })
        break

      case 'sumif_column':
        // SUMIF arg 0: the column to aggregate — always bare (even in field mode, this is SUM column name)
        groups.push({ pills: bareColumnPills(['numeric', 'currency']), color: 'gray', label: 'Column' })
        break

      case 'sumif_filter_field':
        // SUMIF arg 1: field to filter on — bare name
        groups.push({ pills: bareColumnPills(), color: 'gray', label: 'Filter by' })
        break

      case 'sumif_operator':
        groups.push({ pills: compareOpPills(), color: 'amber', label: 'Operator' })
        break

      case 'sumif_value':
        // SUMIF arg 3: comparison value — no pills, user types the value
        break

      case 'if_condition_field':
        // IF arg 0: bare field name (not a {ref} — per spec)
        groups.push({ pills: bareColumnPills(), color: 'gray', label: 'Condition' })
        break

      case 'if_operator':
        groups.push({ pills: compareOpPills(), color: 'amber', label: 'Operator' })
        break

      case 'if_value':
        // IF arg 2: comparison value — no pills, user types
        break

      case 'if_true_expr':
      case 'if_false_expr':
        // IF true/false expressions use same-table {logicalName} refs in calculated mode
        if (isCalculatedMode) {
          groups.push({ pills: sameTableColumnRefPills(), color: 'purple', label: 'Columns' })
        } else {
          groups.push({ pills: bareColumnPills(), color: 'gray' })
        }
        groups.push({ pills: fieldRefPills(), color: 'purple' })
        groups.push({ pills: arithmeticPills(), color: 'green' })
        break

      case 'brace_ref_section':
        groups.push({ pills: sectionNamePills(), color: 'purple', label: 'Sections' })
        break

      case 'brace_ref_field':
        if (formulaContext.sectionHint) {
          groups.push({ pills: sectionFieldPills(formulaContext.sectionHint), color: 'purple', label: 'Fields' })
        }
        break

      default:
        // Default context — what shows when cursor is at top level
        if (isCalculatedMode) {
          // Calculated columns: {logicalName} refs to other columns in same table, IF(), arithmetic
          // NO bare data source columns, NO SUM/AVG aggregate functions
          groups.push({ pills: sameTableColumnRefPills(), color: 'purple', label: 'Columns' })
          groups.push({ pills: fieldRefPills(), color: 'purple' })
          const ifPill: Pill = {
            kind: 'function' as const,
            label: 'IF()',
            insertText: 'IF()',
            description: 'Conditional: IF(field, op, value, trueExpr, falseExpr)',
            isFunctionWithParens: true,
          }
          groups.push({ pills: [ifPill], color: 'blue', label: 'Functions' })
          groups.push({ pills: arithmeticPills(), color: 'green' })
        } else {
          // Field-mode or non-calculated: show everything
          groups.push({ pills: functionPills(), color: 'blue' })
          groups.push({ pills: bareColumnPills(), color: 'gray' })
          groups.push({ pills: fieldRefPills(), color: 'purple' })
          groups.push({ pills: arithmeticPills(), color: 'green' })
        }
        break
    }

    return groups
  }, [formulaContext, effectiveDataSourceColumns, allSections, currentSectionId, isCalculatedMode, sectionColumns])

  // Handle tag click - insert at cursor position, replacing any partial text
  const handleTagClick = (insertText: string, isFunctionWithParens: boolean = false) => {
    if (!inputRef.current) {
      // Fallback: append to end
      onChange(value + insertText)
      return
    }

    const cursorPos = inputRef.current.selectionStart ?? value.length

    // Find the start of the current "word" (text since last operator) before cursor
    const textBeforeCursor = value.substring(0, cursorPos)
    let lastOperatorIndex = -1
    for (const op of OPERATORS) {
      const idx = textBeforeCursor.lastIndexOf(op)
      if (idx > lastOperatorIndex) {
        lastOperatorIndex = idx
      }
    }

    // Replace the partial text with the selected item
    const beforePartial = value.substring(0, lastOperatorIndex + 1)
    const afterCursor = value.substring(cursorPos)

    // Don't add space after opening paren
    const needsSpace = lastOperatorIndex >= 0 && value[lastOperatorIndex] !== '('
    const newValue = beforePartial + (needsSpace ? ' ' : '') + insertText + afterCursor

    onChange(newValue)

    // Calculate new cursor position
    const insertedTextLength = (needsSpace ? 1 : 0) + insertText.length
    let newCursorPos = lastOperatorIndex + 1 + insertedTextLength

    // For functions, position cursor inside parentheses (before closing paren)
    if (isFunctionWithParens) {
      newCursorPos = newCursorPos - 1
    }

    setCursorPosition(newCursorPos)
    setTimeout(() => {
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      inputRef.current?.focus()
    }, 0)
  }

  // Handle operator click - insert operator at cursor position with spacing
  const handleOperatorClick = (op: string) => {
    if (!inputRef.current) {
      onChange(value + ` ${op} `)
      return
    }

    const cursorPos = inputRef.current.selectionStart ?? value.length
    const textToInsert = ` ${op} `
    const newValue = value.substring(0, cursorPos) + textToInsert + value.substring(cursorPos)

    onChange(newValue)

    const newCursorPos = cursorPos + textToInsert.length
    setCursorPosition(newCursorPos)
    setTimeout(() => {
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      inputRef.current?.focus()
    }, 0)
  }

  // Handle pill click from ContextualPillBar
  const handlePillClick = (pill: Pill) => {
    if (pill.kind === 'arithmetic_op') {
      handleOperatorClick(pill.insertText)
    } else if (pill.kind === 'compare_op') {
      // Insert comparison operators directly at cursor (with quotes already in insertText)
      insertAtCursor(pill.insertText)
    } else {
      handleTagClick(pill.insertText, pill.isFunctionWithParens)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  // Validate formula with debounce - using local validation
  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    if (!value.trim()) {
      setValidationState({ valid: null, error: null, checking: false })
      return
    }

    setValidationState((prev) => prev.checking ? prev : { ...prev, checking: true })

    validationTimeoutRef.current = setTimeout(() => {
      try {
        let resultError: string | null = null
        let resultValid = true

        if (validationMode === 'table') {
          // Table mode: validate column formula against available columns (use formula field)
          const result = validateTableColumnLocal(value, availableColumnFormulas, sectionColumns, columnType)
          resultValid = result.valid
          resultError = result.error || null

          // Additional IF() validation for calculated columns
          if (resultValid && /\bIF\s*\(/i.test(value)) {
            const ifResult = validateIfFormula(value, availableColumnFormulas)
            if (!ifResult.valid) {
              resultValid = false
              resultError = ifResult.error || null
            }
          }
        } else {
          // Field mode: validate aggregate formula that references table sections
          if (tableSections.length > 0) {
            const result = validateAggregateField(value, tableSections)
            resultValid = result.valid
            resultError = result.error || null
          } else {
            // Basic syntax validation only
            const result = validateFormulaSyntax(value)
            resultValid = result.valid
            resultError = result.error || null
          }

          // Additional SUMIF/AVGIF validation for field mode
          if (resultValid && /\b(SUMIF|AVGIF|COUNTIF|MINIF|MAXIF)\s*\(/i.test(value)) {
            const sumifResult = validateSumIfFormula(value)
            if (!sumifResult.valid) {
              resultValid = false
              resultError = sumifResult.error || null
            }
          }
        }

        setValidationState({
          valid: resultValid,
          error: resultError,
          checking: false,
          suggestions: undefined,
        })
      } catch (err) {
        console.error('Formula validation error:', err)
        setValidationState({
          valid: null,
          error: 'Could not validate formula',
          checking: false,
        })
      }
    }, 300)

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [value, validationMode, availableColumnFormulas, tableSections, sectionColumns, columnType])

  // Auto-resize textarea when value changes (handles programmatic changes)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
    }
  }, [value])

  // Simple input change handler with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Auto-resize: reset height then set to scrollHeight
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
    setCursorPosition(e.target.selectionStart ?? 0)
    onChange(e.target.value)
  }

  // Track cursor position on click, arrow keys, and selection changes
  const handleSelect = useCallback(() => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart ?? 0)
    }
  }, [])

  const insertAtCursor = (text: string) => {
    if (!inputRef.current) {
      onChange(value + text)
      return
    }

    const start = inputRef.current.selectionStart || 0
    const end = inputRef.current.selectionEnd || 0
    const newValue = value.substring(0, start) + text + value.substring(end)
    onChange(newValue)

    // Set cursor position after inserted text
    const newPosition = start + text.length
    setCursorPosition(newPosition)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newPosition, newPosition)
        inputRef.current.focus()
      }
    }, 0)
  }

  const handleFunctionClick = (funcName: string) => {
    if (funcName === 'COUNT') {
      insertAtCursor('COUNT()')
    } else {
      insertAtCursor(`${funcName}()`)
      // Position cursor inside parentheses
      setTimeout(() => {
        if (inputRef.current) {
          const pos = inputRef.current.selectionStart
          if (pos) {
            const newPos = pos - 1
            inputRef.current.setSelectionRange(newPos, newPos)
            setCursorPosition(newPos)
          }
        }
      }, 10)
    }
    setShowDropdown(false)
  }

  const handleColumnClick = (columnName: string) => {
    insertAtCursor(columnName)
    setShowDropdown(false)
  }

  const handleFieldClick = (insertValue: string) => {
    insertAtCursor(insertValue)
    setShowDropdown(false)
  }

  // Check if there are any fields to show
  const hasFieldsToShow = allSections.some(section => section.fields.length > 0)

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={handleInputChange}
          onSelect={handleSelect}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full border rounded-lg px-3 py-2 pr-20 text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none overflow-hidden ${
            validationState.valid === false
              ? 'border-red-300 focus:ring-red-500'
              : validationState.valid === true
                ? 'border-green-300 focus:ring-green-500'
                : 'border-gray-300'
          }`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2">
          {/* Validation indicator */}
          {validationState.checking ? (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          ) : validationState.valid === true ? (
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          ) : validationState.valid === false ? (
            <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
          ) : null}

          {/* Help toggle */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            disabled={disabled}
            className={`p-1 rounded transition-colors disabled:opacity-50 ${showHelp ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'}`}
            title="Formula syntax reference"
          >
            <QuestionMarkCircleIcon className="w-4 h-4" />
          </button>

          {/* Dropdown toggle */}
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={disabled}
            className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          >
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Validation error message */}
      {validationState.error && (
        <p className="text-xs text-red-600 mt-1">{validationState.error}</p>
      )}

      {/* Suggestions for fixing invalid formula */}
      {validationState.suggestions && validationState.suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-xs text-gray-500">Try:</span>
          {validationState.suggestions.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(suggestion)}
              className="text-xs text-blue-600 hover:text-blue-800 font-mono underline"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* External error from batch validation */}
      {externalError && validationState.valid !== false && (
        <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
          <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
          {externalError}
        </p>
      )}

      {/* Context-Aware Suggestion Pills */}
      {!disabled && (
        <ContextualPillBar groups={pillGroups} onPillClick={handlePillClick} />
      )}

      {/* Help Panel */}
      {showHelp && (
        <FormulaHelpPanel sectionMode={sectionMode || (validationMode === 'table' ? 'table' : 'field')} />
      )}

      {/* Dropdown - Full browsing mode (chevron click) */}
      {showDropdown && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('functions')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'functions'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Functions
            </button>
            {!isCalculatedMode && (
              <button
                type="button"
                onClick={() => setActiveTab('columns')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'columns'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Columns
              </button>
            )}
            {hasFieldsToShow && (
              <button
                type="button"
                onClick={() => setActiveTab('fields')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'fields'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Fields
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-64 overflow-y-auto">
            {/* Functions Tab */}
            {activeTab === 'functions' && (
              <div className="p-2 space-y-1">
                {loadingColumns ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-xs text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <>
                    {/* In calculated mode, only show IF(). Aggregate functions don't apply to per-row calculations. */}
                    {(isCalculatedMode ? ['IF'] : FUNCTIONS).map((funcName) => (
                      <button
                        key={funcName}
                        type="button"
                        onClick={() => handleFunctionClick(funcName)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-mono text-sm text-blue-700">
                          {funcName}({funcName === 'COUNT' ? '' : funcName === 'IF' ? "field, 'op', 'val', trueExpr, falseExpr" : 'column'})
                        </div>
                        <div className="text-xs text-gray-500">
                          {funcName === 'IF'
                            ? 'Per-row conditional expression'
                            : FUNCTION_DESCRIPTIONS[funcName] || `Conditional ${funcName.replace('IF', '').toLowerCase()}`}
                        </div>
                        {/* Syntax hint for IF functions */}
                        {funcName.endsWith('IF') && FUNCTION_SYNTAX[funcName] && (
                          <div className="mt-1">
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {FUNCTION_SYNTAX[funcName]}
                            </span>
                          </div>
                        )}
                        {funcName === 'IF' && (
                          <div className="mt-1">
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              IF(platform, &apos;=&apos;, &apos;Airbnb&apos;, &#123;mgmtFee&#125; * 1.1, &#123;mgmtFee&#125;)
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                    <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <InformationCircleIcon className="w-4 h-4" />
                        {isCalculatedMode
                          ? <span>Tip: Use {'{columnName}'} to reference columns, +, -, *, / for arithmetic</span>
                          : <span>Tip: Use +, -, *, / for arithmetic</span>
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Columns Tab — only shown for non-calculated modes (bare camelCase column names) */}
            {activeTab === 'columns' && !isCalculatedMode && (
              <div className="p-2 space-y-1">
                {loadingColumns ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-xs text-gray-500">Loading...</span>
                  </div>
                ) : effectiveDataSourceColumns.length === 0 ? (
                  <p className="text-xs text-gray-500 px-3 py-2">No columns available</p>
                ) : (
                  effectiveDataSourceColumns.map((column) => (
                    <button
                      key={column.formula}
                      type="button"
                      onClick={() => handleColumnClick(column.formula)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-mono text-sm text-gray-900">{column.formula}</div>
                      <div className="text-xs text-gray-500">{column.name}</div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Fields Tab - Grouped by section with logical names */}
            {activeTab === 'fields' && (
              <div className="p-2 space-y-3">
                {/* In calculated mode, show same-table columns first */}
                {isCalculatedMode && sectionColumns.length > 0 && (
                  <div>
                    <div className="px-3 py-1">
                      <span className="text-xs font-semibold text-purple-600 uppercase">Same-Table Columns</span>
                      <span className="text-xs text-gray-400 ml-1">(use in {'{braces}'})</span>
                    </div>
                    {sectionColumns.map((colName) => (
                      <button
                        key={colName}
                        type="button"
                        onClick={() => { handleFieldClick(`{${colName}}`); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-900">{colName}</span>
                          <span className="font-mono text-xs text-purple-600">{`{${colName}}`}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {allSections.length === 0 && !isCalculatedMode ? (
                  <p className="text-xs text-gray-500 px-3 py-2">
                    No sections available. Create sections and fields to reference them.
                  </p>
                ) : (
                  allSections.map((section) => (
                    <div key={section.sectionId}>
                      <div className="px-3 py-1 flex items-baseline gap-1.5">
                        <span className="text-xs font-semibold text-gray-500 uppercase">
                          {section.sectionName}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          ({section.sectionLogicalName})
                        </span>
                        {section.sectionId === currentSectionId && (
                          <span className="text-xs text-blue-500 font-medium">(current)</span>
                        )}
                      </div>
                      {section.fields.length === 0 ? (
                        <p className="text-xs text-gray-400 px-3 py-1 italic">No fields yet</p>
                      ) : (
                        section.fields.map((field) => {
                          const isSameSection = section.sectionId === currentSectionId
                          const insertValue = isSameSection
                            ? `{${field.logicalName}}`
                            : `{${section.sectionLogicalName}.${field.logicalName}}`

                          return (
                            <button
                              key={field.id}
                              type="button"
                              onClick={() => handleFieldClick(insertValue)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-sm text-gray-900">{field.name}</span>
                                  <span className="ml-1.5 text-xs text-gray-400 font-mono">
                                    ({field.logicalName})
                                  </span>
                                </div>
                                <span className="font-mono text-xs text-purple-600">{insertValue}</span>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

export default FormulaBuilderInput
