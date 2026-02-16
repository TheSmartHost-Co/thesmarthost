'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { getDataSourceColumns } from '@/services/reportTemplateService'
import type { SectionFieldReference, ColumnType, DataSource, DataSourceColumn } from '@/services/types/reportTemplate'
import {
  validateFormulaSyntax,
  validateTableColumn as validateTableColumnLocal,
  validateAggregateField,
} from '@/utils/formulaValidator'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  InformationCircleIcon,
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
  SUMIF: 'SUMIF(column, "operator", value)',
  AVGIF: 'AVGIF(column, "operator", value)',
  COUNTIF: 'COUNTIF(column, "operator", value)',
  MINIF: 'MINIF(column, "operator", value)',
  MAXIF: 'MAXIF(column, "operator", value)',
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
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
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

  // Filter suggestions based on search term for inline tags
  const filteredSuggestions = useMemo(() => {
    const term = searchTerm.toLowerCase()

    // Functions (hardcoded)
    const functions = FUNCTIONS
      .filter((f) => f.toLowerCase().includes(term))
      .slice(0, 4)

    // Columns from data source
    const columns = effectiveDataSourceColumns
      .filter((c) => c.name.toLowerCase().includes(term) || c.formula.toLowerCase().includes(term))
      .slice(0, 4)

    // Fields from allSections
    const fields: { insertValue: string; displayName: string; logicalName: string; sectionName?: string }[] = []
    allSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.name.toLowerCase().includes(term) || field.logicalName.toLowerCase().includes(term)) {
          const isSameSection = section.sectionId === currentSectionId
          fields.push({
            insertValue: isSameSection
              ? `{${field.logicalName}}`
              : `{${section.sectionLogicalName}.${field.logicalName}}`,
            displayName: field.name,
            logicalName: field.logicalName,
            sectionName: isSameSection ? undefined : section.sectionName,
          })
        }
      })
    })

    return { functions, columns, fields: fields.slice(0, 4) }
  }, [searchTerm, effectiveDataSourceColumns, allSections, currentSectionId])

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
        if (validationMode === 'table') {
          // Table mode: validate column formula against available columns (use formula field)
          const result = validateTableColumnLocal(value, availableColumnFormulas, sectionColumns)
          setValidationState({
            valid: result.valid,
            error: result.error || null,
            checking: false,
            suggestions: undefined,
          })
        } else {
          // Field mode: validate aggregate formula that references table sections
          if (tableSections.length > 0) {
            const result = validateAggregateField(value, tableSections)
            setValidationState({
              valid: result.valid,
              error: result.error || null,
              checking: false,
              suggestions: undefined,
            })
          } else {
            // Basic syntax validation only
            const result = validateFormulaSyntax(value)
            setValidationState({
              valid: result.valid,
              error: result.error || null,
              checking: false,
              suggestions: undefined,
            })
          }
        }
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
  }, [value, validationMode, availableColumnFormulas, tableSections])

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

      {/* Inline Suggestions - Always visible when not disabled */}
      {!disabled && (
        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
          {/* Functions - Blue */}
          {filteredSuggestions.functions.map((func) => (
            <button
              key={func}
              type="button"
              onClick={() => handleTagClick(`${func}()`, true)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded border border-blue-200 font-mono transition-colors"
              title={`Insert ${func} function`}
            >
              {func}()
            </button>
          ))}

          {/* Columns - Gray */}
          {filteredSuggestions.columns.map((col) => (
            <button
              key={col.formula}
              type="button"
              onClick={() => handleTagClick(col.formula)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded border border-gray-200 font-mono transition-colors"
              title={col.name}
            >
              {col.formula}
            </button>
          ))}

          {/* Field References - Purple */}
          {filteredSuggestions.fields.map((field) => (
            <button
              key={field.insertValue}
              type="button"
              onClick={() => handleTagClick(field.insertValue)}
              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 rounded border border-purple-200 font-mono transition-colors"
              title={field.sectionName ? `From ${field.sectionName}` : 'Same section field'}
            >
              {field.insertValue}
            </button>
          ))}

          {/* Divider and operator shortcuts */}
          {(filteredSuggestions.functions.length > 0 ||
            filteredSuggestions.columns.length > 0 ||
            filteredSuggestions.fields.length > 0) && (
            <span className="text-xs text-gray-400 mx-1">|</span>
          )}
          {['+', '-', '*', '/'].map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => handleOperatorClick(op)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 rounded border border-gray-200 font-mono transition-colors"
            >
              {op}
            </button>
          ))}
        </div>
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
                    {FUNCTIONS.map((funcName) => (
                      <button
                        key={funcName}
                        type="button"
                        onClick={() => handleFunctionClick(funcName)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-mono text-sm text-blue-700">
                          {funcName}({funcName === 'COUNT' ? '' : 'column'})
                        </div>
                        <div className="text-xs text-gray-500">
                          {FUNCTION_DESCRIPTIONS[funcName] || `Conditional ${funcName.replace('IF', '').toLowerCase()}`}
                        </div>
                        {/* Syntax hint for IF functions */}
                        {funcName.endsWith('IF') && FUNCTION_SYNTAX[funcName] && (
                          <div className="mt-1">
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {FUNCTION_SYNTAX[funcName]}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                    <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <InformationCircleIcon className="w-4 h-4" />
                        <span>Tip: Use +, -, *, / for arithmetic</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Columns Tab */}
            {activeTab === 'columns' && (
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
                {allSections.length === 0 ? (
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
