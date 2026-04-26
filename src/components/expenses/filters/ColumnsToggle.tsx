'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'

const STORAGE_KEY = 'expenses-table-columns:v1'

export interface ExpenseColumnDef {
  key: string
  label: string
  /** When true, the column cannot be hidden (e.g. Date, Amount). */
  required?: boolean
}

interface ColumnsToggleProps {
  columns: ExpenseColumnDef[]
  visibleKeys: string[]
  onChange: (next: string[]) => void
}

export default function ColumnsToggle({ columns, visibleKeys, onChange }: ColumnsToggleProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const toggle = (key: string) => {
    const col = columns.find((c) => c.key === key)
    if (col?.required) return
    const next = visibleKeys.includes(key)
      ? visibleKeys.filter((k) => k !== key)
      : [...visibleKeys, key]
    onChange(next)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
          open ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <AdjustmentsHorizontalIcon className="w-4 h-4" />
        <span className="font-medium">Columns</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2">
          <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Visible columns</p>
          <ul className="max-h-80 overflow-y-auto">
            {columns.map((col) => {
              const isVisible = visibleKeys.includes(col.key)
              const disabled = !!col.required
              return (
                <li key={col.key}>
                  <label
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggle(col.key)}
                      disabled={disabled}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{col.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Read column visibility from localStorage; falls back to all-visible. */
export function loadVisibleColumns(allKeys: string[]): string[] {
  if (typeof window === 'undefined') return allKeys
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return allKeys
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return allKeys
    // Only return keys that still exist in the current schema; otherwise reset.
    const filtered = parsed.filter((k) => typeof k === 'string' && allKeys.includes(k))
    return filtered.length > 0 ? filtered : allKeys
  } catch {
    return allKeys
  }
}

/** Persist column visibility to localStorage. */
export function saveVisibleColumns(keys: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    /* localStorage unavailable — silently no-op */
  }
}
