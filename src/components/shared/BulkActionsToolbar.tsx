'use client'

import React from 'react'

export interface BulkAction {
  /** Label shown on the button */
  label: string
  /** Heroicon component */
  icon: React.ComponentType<{ className?: string }>
  /** Click handler */
  onClick: () => void
  /** Visual variant — default, danger (red), or warning (amber) */
  variant?: 'default' | 'danger' | 'warning'
  /** Disable the button (e.g. while a request is in flight) */
  disabled?: boolean
}

interface BulkActionsToolbarProps {
  selectedCount: number
  actions: BulkAction[]
  onClear: () => void
  /** Singular noun for the selection text — defaults to "item" */
  itemNoun?: string
}

/**
 * Sticky purple toolbar shown above a table when one or more rows are selected.
 * Mirrors the inline pattern used today in receipts/page.tsx, but parameterized
 * so the array of actions doubles as the "registry" — adding a new action
 * (e.g. "Send to QuickBooks" later) is one line in the parent component.
 */
export default function BulkActionsToolbar({
  selectedCount,
  actions,
  onClear,
  itemNoun = 'item',
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="hidden md:flex items-center justify-between gap-3 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-xl mb-3">
      <div className="text-sm text-purple-900">
        <span className="font-semibold">{selectedCount}</span>{' '}
        {itemNoun}
        {selectedCount === 1 ? '' : 's'} selected
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          onClick={onClear}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Clear
        </button>
        {actions.map((action) => {
          const Icon = action.icon
          const variantClass =
            action.variant === 'danger'
              ? 'text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300'
              : action.variant === 'warning'
                ? 'text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
                : 'text-purple-700 bg-white border border-purple-200 hover:bg-purple-100 disabled:opacity-50'
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${variantClass} disabled:cursor-not-allowed`}
            >
              <Icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
