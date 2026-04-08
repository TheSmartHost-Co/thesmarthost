'use client'

import React, { useState, useMemo } from 'react'
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline'

export interface MultiSelectOption<T = string> {
  value: T
  label: string
  secondaryLabel?: string
  disabled?: boolean
  disabledReason?: string
}

export interface MultiSelectCheckboxProps<T = string> {
  options: MultiSelectOption<T>[]
  selectedValues: T[]
  onChange: (values: T[]) => void
  placeholder?: string
  searchable?: boolean
  emptyText?: string
  loading?: boolean
  maxHeight?: string
  selectAllLabel?: string
  className?: string
}

function MultiSelectCheckbox<T = string>({
  options,
  selectedValues,
  onChange,
  placeholder = 'Search...',
  searchable = true,
  emptyText = 'No options available',
  loading = false,
  maxHeight = '16rem',
  selectAllLabel = 'Select All',
  className = '',
}: MultiSelectCheckboxProps<T>) {
  const [query, setQuery] = useState('')

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const normalizedQuery = query.toLowerCase().trim()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(normalizedQuery) ||
        opt.secondaryLabel?.toLowerCase().includes(normalizedQuery)
    )
  }, [options, query])

  const selectableOptions = useMemo(
    () => filteredOptions.filter((opt) => !opt.disabled),
    [filteredOptions]
  )

  const allSelectableSelected = useMemo(
    () =>
      selectableOptions.length > 0 &&
      selectableOptions.every((opt) => selectedValues.includes(opt.value)),
    [selectableOptions, selectedValues]
  )

  const handleToggle = (value: T) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  const handleToggleAll = () => {
    if (allSelectableSelected) {
      // Deselect all selectable that are in filtered view
      const selectableValues = new Set(selectableOptions.map((o) => o.value))
      onChange(selectedValues.filter((v) => !selectableValues.has(v)))
    } else {
      // Select all selectable in filtered view
      const newValues = new Set(selectedValues)
      selectableOptions.forEach((opt) => newValues.add(opt.value))
      onChange(Array.from(newValues))
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 py-4 justify-center ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      {/* Search */}
      {searchable && (
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border-0 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
          </div>
        </div>
      )}

      {/* Select All / Deselect All */}
      {selectableOptions.length > 1 && (
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <label className="flex items-center gap-2.5 cursor-pointer" onClick={handleToggleAll}>
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                allSelectableSelected
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {allSelectableSelected && <CheckIcon className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {allSelectableSelected ? 'Deselect All' : selectAllLabel}
            </span>
            <span className="text-xs text-gray-400 ml-auto">
              {selectedValues.length} selected
            </span>
          </label>
        </div>
      )}

      {/* Options list */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">
            <MagnifyingGlassIcon className="w-6 h-6 text-gray-300 mx-auto mb-1" />
            {emptyText}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredOptions.map((option) => {
              const isSelected = selectedValues.includes(option.value)
              const isDisabled = option.disabled

              return (
                <label
                  key={String(option.value)}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed bg-gray-50/50'
                      : 'cursor-pointer hover:bg-blue-50/50'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : isDisabled
                          ? 'border-gray-200 bg-gray-100'
                          : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => !isDisabled && handleToggle(option.value)}
                    disabled={isDisabled}
                    className="sr-only"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {option.label}
                    </div>
                    {option.secondaryLabel && (
                      <div className="text-xs text-gray-400 truncate">
                        {option.secondaryLabel}
                      </div>
                    )}
                    {isDisabled && option.disabledReason && (
                      <div className="text-xs text-amber-500 mt-0.5">
                        {option.disabledReason}
                      </div>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MultiSelectCheckbox
