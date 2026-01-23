'use client'

import React, { useState, useRef, useEffect } from 'react'
import { validateFormula } from '@/services/reportTemplateService'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

// Available booking columns for formulas
const AVAILABLE_COLUMNS = [
  { name: 'nightlyRate', description: 'Nightly rate per booking', type: 'number' },
  { name: 'extraGuestFees', description: 'Extra guest fees', type: 'number' },
  { name: 'cleaningFee', description: 'Cleaning fee', type: 'number' },
  { name: 'bedLinenFee', description: 'Bed linen fee', type: 'number' },
  { name: 'gst', description: 'GST tax amount', type: 'number' },
  { name: 'qst', description: 'QST tax amount', type: 'number' },
  { name: 'lodgingTax', description: 'Lodging tax', type: 'number' },
  { name: 'salesTax', description: 'Sales tax', type: 'number' },
  { name: 'channelFee', description: 'Channel/platform fee', type: 'number' },
  { name: 'stripeFee', description: 'Stripe processing fee', type: 'number' },
  { name: 'mgmtFee', description: 'Management fee', type: 'number' },
  { name: 'cohostFee', description: 'Co-host fee', type: 'number' },
  { name: 'totalPayout', description: 'Total payout amount', type: 'number' },
  { name: 'netEarnings', description: 'Net earnings', type: 'number' },
  { name: 'rentCollected', description: 'Rent collected', type: 'number' },
  { name: 'taxesCollected', description: 'Taxes collected', type: 'number' },
  { name: 'numNights', description: 'Number of nights', type: 'number' },
]

// Available formula functions
const FORMULA_FUNCTIONS = [
  { name: 'SUM', syntax: 'SUM(column)', description: 'Sum all values of a column' },
  { name: 'AVG', syntax: 'AVG(column)', description: 'Average of a column' },
  { name: 'COUNT', syntax: 'COUNT()', description: 'Total number of bookings' },
]

interface FormulaBuilderInputProps {
  value: string
  onChange: (value: string) => void
  existingFields?: string[] // Names of fields defined earlier in the template (for cross-references)
  placeholder?: string
  disabled?: boolean
}

const FormulaBuilderInput: React.FC<FormulaBuilderInputProps> = ({
  value,
  onChange,
  existingFields = [],
  placeholder = 'e.g. SUM(mgmtFee) or SUM(totalPayout) * 0.05',
  disabled = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [validationState, setValidationState] = useState<{
    valid: boolean | null
    error: string | null
    checking: boolean
  }>({ valid: null, error: null, checking: false })
  const [activeTab, setActiveTab] = useState<'functions' | 'columns' | 'fields'>('functions')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Validate formula with debounce
  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    if (!value.trim()) {
      setValidationState({ valid: null, error: null, checking: false })
      return
    }

    setValidationState((prev) => ({ ...prev, checking: true }))

    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await validateFormula(value)
        if (res.status === 'success') {
          setValidationState({
            valid: res.data.valid,
            error: res.data.error || null,
            checking: false,
          })
        } else {
          setValidationState({
            valid: false,
            error: res.message || 'Validation failed',
            checking: false,
          })
        }
      } catch (err) {
        console.error('Formula validation error:', err)
        setValidationState({
          valid: null,
          error: 'Could not validate formula',
          checking: false,
        })
      }
    }, 500)

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [value])

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
    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = start + text.length
        inputRef.current.setSelectionRange(newPosition, newPosition)
        inputRef.current.focus()
      }
    }, 0)
  }

  const handleFunctionClick = (func: (typeof FORMULA_FUNCTIONS)[0]) => {
    if (func.name === 'COUNT') {
      insertAtCursor('COUNT()')
    } else {
      insertAtCursor(`${func.name}()`)
      // Position cursor inside parentheses
      setTimeout(() => {
        if (inputRef.current) {
          const pos = inputRef.current.selectionStart
          if (pos) {
            inputRef.current.setSelectionRange(pos - 1, pos - 1)
          }
        }
      }, 10)
    }
    setShowDropdown(false)
  }

  const handleColumnClick = (column: (typeof AVAILABLE_COLUMNS)[0]) => {
    insertAtCursor(column.name)
    setShowDropdown(false)
  }

  const handleFieldClick = (fieldName: string) => {
    insertAtCursor(`{${fieldName}}`)
    setShowDropdown(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full border rounded-lg px-3 py-2 pr-20 text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
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

      {/* Dropdown */}
      {showDropdown && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-72 overflow-hidden">
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
            {existingFields.length > 0 && (
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
          <div className="max-h-56 overflow-y-auto">
            {activeTab === 'functions' && (
              <div className="p-2 space-y-1">
                {FORMULA_FUNCTIONS.map((func) => (
                  <button
                    key={func.name}
                    type="button"
                    onClick={() => handleFunctionClick(func)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-mono text-sm text-blue-700">{func.syntax}</div>
                    <div className="text-xs text-gray-500">{func.description}</div>
                  </button>
                ))}
                <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <InformationCircleIcon className="w-4 h-4" />
                    <span>Tip: Use +, -, *, / for arithmetic</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'columns' && (
              <div className="p-2 space-y-1">
                {AVAILABLE_COLUMNS.map((column) => (
                  <button
                    key={column.name}
                    type="button"
                    onClick={() => handleColumnClick(column)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-mono text-sm text-gray-900">{column.name}</div>
                    <div className="text-xs text-gray-500">{column.description}</div>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'fields' && (
              <div className="p-2 space-y-1">
                {existingFields.length === 0 ? (
                  <p className="text-xs text-gray-500 px-3 py-2">
                    No previous fields available. Create fields above this one to reference them.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 px-3 py-1">
                      Reference calculated values from fields above:
                    </p>
                    {existingFields.map((fieldName) => (
                      <button
                        key={fieldName}
                        type="button"
                        onClick={() => handleFieldClick(fieldName)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-mono text-sm text-purple-700">{`{${fieldName}}`}</div>
                        <div className="text-xs text-gray-500">Reference this field&apos;s value</div>
                      </button>
                    ))}
                  </>
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
