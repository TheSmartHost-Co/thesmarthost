'use client'

import React, { useEffect, useRef, useState } from 'react'
import { BookmarkIcon, ChevronDownIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { ExpenseFilterPreset } from '@/services/types/expenseFilterPreset'

interface SavedViewsDropdownProps {
  presets: ExpenseFilterPreset[]
  loading?: boolean
  /** Click a preset to load its filters into the bar. */
  onLoad: (preset: ExpenseFilterPreset) => void
  /** Trash icon next to a preset. */
  onDelete: (preset: ExpenseFilterPreset) => void
  /** "Save current view…" footer — opens SaveFilterPresetDialog in the parent. */
  onSaveCurrent: () => void
}

export default function SavedViewsDropdown({
  presets,
  loading,
  onLoad,
  onDelete,
  onSaveCurrent,
}: SavedViewsDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
          open ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <BookmarkIcon className="w-4 h-4" />
        <span className="font-medium">Saved views</span>
        {presets.length > 0 && (
          <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold bg-gray-200 text-gray-700 rounded">
            {presets.length}
          </span>
        )}
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2">
          {loading ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">Loading saved views…</div>
          ) : presets.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No saved views yet. Apply some filters and click <span className="font-medium">"Save current view…"</span> below.
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {presets.map((preset) => (
                <li
                  key={preset.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 group"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onLoad(preset)
                      setOpen(false)
                    }}
                    className="flex-1 text-left text-sm text-gray-700 truncate"
                    title={preset.name}
                  >
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(preset)
                    }}
                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Delete preset ${preset.name}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-gray-100 mt-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onSaveCurrent()
                setOpen(false)
              }}
              className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <PlusIcon className="w-4 h-4" />
              Save current view…
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
