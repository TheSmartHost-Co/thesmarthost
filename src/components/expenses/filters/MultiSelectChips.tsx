'use client'

import React from 'react'

interface ChipOption<T> {
  value: T
  label: string
  /** Optional swatch color for category chips */
  colorHex?: string
}

interface MultiSelectChipsProps<T> {
  options: ChipOption<T>[]
  value: T[]
  onChange: (next: T[]) => void
  ariaLabel?: string
}

/**
 * Inline toggleable chip group for small fixed enums (categories, statuses, etc.).
 * Lighter than SearchableSelect when ≤10 options.
 */
export default function MultiSelectChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: MultiSelectChipsProps<T>) {
  const toggle = (v: T) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isSelected = value.includes(opt.value)
        const swatch = opt.colorHex
          ? { backgroundColor: isSelected ? opt.colorHex : opt.colorHex + '20', color: isSelected ? '#fff' : opt.colorHex }
          : undefined
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={isSelected}
            style={swatch}
            className={
              swatch
                ? `px-2.5 py-1 rounded-lg text-xs font-medium transition-colors`
                : `px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
