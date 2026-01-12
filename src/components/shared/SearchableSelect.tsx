'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronUpDownIcon, MagnifyingGlassIcon, CheckIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'

/**
 * Generic option type for the SearchableSelect
 * T is the type of the value (usually string)
 */
export interface SearchableSelectOption<T = string> {
  value: T
  label: string
  secondaryLabel?: string
  disabled?: boolean
}

export interface SearchableSelectHeaderAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
}

export interface SearchableSelectProps<T = string> {
  /** Array of options to display */
  options: SearchableSelectOption<T>[]
  /** Currently selected value */
  value: T | null
  /** Callback when selection changes */
  onChange: (value: T | null) => void
  /** Placeholder text when no selection */
  placeholder?: string
  /** Label for the field (optional, handled externally typically) */
  label?: string
  /** Whether the field is required */
  required?: boolean
  /** Whether the component is disabled */
  disabled?: boolean
  /** Whether options are loading */
  loading?: boolean
  /** Loading text to display */
  loadingText?: string
  /** Empty state text when no options match */
  emptyText?: string
  /** Error message to display */
  error?: string
  /** Custom class for the container */
  className?: string
  /** Allow clearing the selection */
  clearable?: boolean
  /** Custom filter function (defaults to label + secondaryLabel matching) */
  filterFn?: (option: SearchableSelectOption<T>, query: string) => boolean
  /** Render custom option content */
  renderOption?: (option: SearchableSelectOption<T>, isSelected: boolean, isHighlighted: boolean) => React.ReactNode
  /** ID for accessibility */
  id?: string
  /** Header action rendered at top of dropdown (e.g., "Create New") */
  headerAction?: SearchableSelectHeaderAction
}

function SearchableSelect<T = string>({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  required = false,
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  emptyText = 'No results found',
  error,
  className = '',
  clearable = true,
  filterFn,
  renderOption,
  id,
  headerAction,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)

  const componentId = id || `searchable-select-${Math.random().toString(36).slice(2, 9)}`

  // Find the selected option
  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value) || null
  }, [options, value])

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options

    const normalizedQuery = query.toLowerCase().trim()

    if (filterFn) {
      return options.filter(opt => filterFn(opt, normalizedQuery))
    }

    return options.filter(opt => {
      const labelMatch = opt.label.toLowerCase().includes(normalizedQuery)
      const secondaryMatch = opt.secondaryLabel?.toLowerCase().includes(normalizedQuery)
      return labelMatch || secondaryMatch
    })
  }, [options, query, filterFn])

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listboxRef.current) {
      const highlightedElement = listboxRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [highlightedIndex, isOpen])

  const handleOpen = useCallback(() => {
    if (!disabled && !loading) {
      setIsOpen(true)
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [disabled, loading])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  const handleSelect = useCallback((option: SearchableSelectOption<T>) => {
    if (option.disabled) return
    onChange(option.value)
    handleClose()
  }, [onChange, handleClose])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setQuery('')
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        handleOpen()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        handleClose()
        break
      case 'Tab':
        handleClose()
        break
    }
  }, [isOpen, filteredOptions, highlightedIndex, handleOpen, handleClose, handleSelect])

  // Default option renderer
  const defaultRenderOption = (
    option: SearchableSelectOption<T>,
    isSelected: boolean,
    isHighlighted: boolean
  ) => (
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className={`truncate font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
          {option.label}
        </div>
        {option.secondaryLabel && (
          <div className={`text-xs truncate ${isHighlighted ? 'text-gray-500' : 'text-gray-400'}`}>
            {option.secondaryLabel}
          </div>
        )}
      </div>
      {isSelected && (
        <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
      )}
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
    >
      {label && (
        <label
          htmlFor={componentId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger */}
      <div
        role="combobox"
        id={componentId}
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : handleOpen}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
        aria-labelledby={label ? `${componentId}-label` : undefined}
        className={`
          relative w-full cursor-pointer bg-white
          border rounded-lg px-3 py-2.5 pr-10
          text-left text-sm transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:border-gray-400'}
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
        `}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            {loadingText}
          </span>
        ) : selectedOption ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <span className="block truncate text-gray-900">{selectedOption.label}</span>
              {selectedOption.secondaryLabel && (
                <span className="block truncate text-xs text-gray-500">{selectedOption.secondaryLabel}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}

        {/* Right side icons */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear selection"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
          <ChevronUpDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="
            absolute z-50 w-full mt-1.5
            bg-white border border-gray-200 rounded-xl
            shadow-lg shadow-gray-200/50
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          "
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="
                  w-full pl-9 pr-3 py-2
                  bg-gray-50 border-0 rounded-lg
                  text-sm text-gray-900 placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white
                  transition-all duration-150
                "
                aria-autocomplete="list"
                aria-controls={`${componentId}-listbox`}
              />
            </div>
          </div>

          {/* Header Action (e.g., "Create New") */}
          {headerAction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                headerAction.onClick()
                handleClose()
              }}
              className="w-full px-3 py-2.5 flex items-center gap-2 text-amber-600 hover:bg-amber-50 border-b border-gray-100 transition-colors text-left"
            >
              {headerAction.icon || <PlusIcon className="w-4 h-4" />}
              <span className="text-sm font-medium">{headerAction.label}</span>
            </button>
          )}

          {/* Options List */}
          <ul
            ref={listboxRef}
            id={`${componentId}-listbox`}
            role="listbox"
            aria-label={label || 'Options'}
            className="max-h-60 overflow-y-auto py-1 scroll-smooth"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-500">
                <div className="flex flex-col items-center gap-2">
                  <MagnifyingGlassIcon className="w-8 h-8 text-gray-300" />
                  <span>{emptyText}</span>
                </div>
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value
                const isHighlighted = index === highlightedIndex

                return (
                  <li
                    key={String(option.value)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      relative px-3 py-2.5 cursor-pointer
                      transition-colors duration-75
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${isHighlighted ? 'bg-blue-50' : ''}
                      ${isSelected && !isHighlighted ? 'bg-blue-50/50' : ''}
                    `}
                  >
                    {renderOption
                      ? renderOption(option, isSelected, isHighlighted)
                      : defaultRenderOption(option, isSelected, isHighlighted)
                    }
                  </li>
                )
              })
            )}
          </ul>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500 font-mono">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500 font-mono">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500 font-mono">esc</kbd>
                close
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export default SearchableSelect
