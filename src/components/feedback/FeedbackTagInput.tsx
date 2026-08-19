'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { FeedbackTag, NewFeedbackTag } from '@/services/types/feedback'

/**
 * FEEDBACK-001 — tag picker: choose existing tags or type a new one and give it
 * a colour.
 *
 * Purpose-built rather than an extension of components/shared/SearchableSelect:
 * that component's multi-select trigger renders "firstLabel +N" instead of
 * per-item chips, and it has no notion of promoting the typed query into a new
 * option. Teaching it both would mean touching internals shared by a dozen
 * unrelated screens. The colour control below is the house pattern lifted from
 * statusCodeManagementModal (native <input type="color"> beside a hex field).
 */

/** Same fallback grey the backend and expense-categories use. */
const DEFAULT_COLOR = '#6B7280'

/** Pre-set swatches so most users never open the colour picker. */
const SWATCHES = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280']

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

export interface FeedbackTagSelection {
  /** Ids of tags that already exist. */
  tagIds: string[]
  /** Tags the user invented, to be created on submit. */
  newTags: NewFeedbackTag[]
}

interface FeedbackTagInputProps {
  /** All known tags, for the suggestion list. */
  available: FeedbackTag[]
  value: FeedbackTagSelection
  onChange: (value: FeedbackTagSelection) => void
  disabled?: boolean
  label?: string
}

const FeedbackTagInput: React.FC<FeedbackTagInputProps> = ({
  available,
  value,
  onChange,
  disabled = false,
  label,
}) => {
  const { t } = useTranslation('feedback')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [pendingColor, setPendingColor] = useState(DEFAULT_COLOR)
  const [showColor, setShowColor] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedIds = new Set(value.tagIds)
  const selectedNewNames = new Set(value.newTags.map((tg) => tg.name.toLowerCase()))

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowColor(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const trimmed = query.trim()

  const suggestions = useMemo(() => {
    const q = trimmed.toLowerCase()
    return available
      .filter((tag) => !selectedIds.has(tag.id))
      .filter((tag) => (q ? tag.name.toLowerCase().includes(q) : true))
      .slice(0, 8)
  }, [available, trimmed, value.tagIds])

  // Matching is case-insensitive to mirror the DB's lower(btrim(name)) unique
  // index, so the user is never offered "Create Bug" when "bug" exists.
  const exactExists =
    trimmed.length > 0 &&
    (available.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase()) ||
      selectedNewNames.has(trimmed.toLowerCase()))

  const canCreate = trimmed.length > 0 && trimmed.length <= 40 && !exactExists

  const selectExisting = (tag: FeedbackTag) => {
    onChange({ ...value, tagIds: [...value.tagIds, tag.id] })
    setQuery('')
    setOpen(false)
  }

  const createTag = () => {
    if (!canCreate) return
    const colorHex = HEX_PATTERN.test(pendingColor) ? pendingColor : DEFAULT_COLOR
    onChange({ ...value, newTags: [...value.newTags, { name: trimmed, colorHex }] })
    setQuery('')
    setPendingColor(DEFAULT_COLOR)
    setShowColor(false)
    setOpen(false)
  }

  const removeExisting = (id: string) => {
    onChange({ ...value, tagIds: value.tagIds.filter((x) => x !== id) })
  }

  const removeNew = (name: string) => {
    onChange({ ...value, newTags: value.newTags.filter((tg) => tg.name !== name) })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Enter picks the single obvious suggestion, else creates.
      if (suggestions.length === 1 && trimmed) selectExisting(suggestions[0])
      else if (canCreate) createTag()
    } else if (e.key === 'Escape') {
      setOpen(false)
      setShowColor(false)
    }
  }

  const selectedTags = value.tagIds
    .map((id) => available.find((tag) => tag.id === id))
    .filter((tag): tag is FeedbackTag => Boolean(tag))

  const chip = (key: string, name: string, colorHex: string, onRemove: () => void, dashed = false) => (
    <span
      key={key}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
        dashed ? 'border border-dashed' : ''
      }`}
      /* Inline style because Tailwind can't emit classes for arbitrary hex. */
      style={{
        backgroundColor: `${colorHex}1A`,
        color: colorHex,
        ...(dashed ? { borderColor: colorHex } : {}),
      }}
    >
      {name}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="cursor-pointer hover:opacity-70"
          aria-label={`Remove ${name}`}
        >
          <XMarkIcon className="w-3 h-3" />
        </button>
      )}
    </span>
  )

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}

      {(selectedTags.length > 0 || value.newTags.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map((tag) => chip(tag.id, tag.name, tag.colorHex, () => removeExisting(tag.id)))}
          {/* Dashed = not created yet; it exists only after submit. */}
          {value.newTags.map((tag) =>
            chip(`new-${tag.name}`, tag.name, tag.colorHex, () => removeNew(tag.name), true)
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('addTag')}
          maxLength={40}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
        />
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowColor((s) => !s)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-amber-400 transition-colors cursor-pointer disabled:opacity-50"
            title={t('tagColor')}
          >
            <span className="w-4 h-4 rounded" style={{ backgroundColor: pendingColor }} />
          </button>
        )}
      </div>

      {showColor && canCreate && (
        <div className="mt-2 p-3 border border-gray-200 rounded-lg bg-white space-y-2">
          <p className="text-xs font-medium text-gray-700">{t('tagColor')}</p>
          <div className="flex flex-wrap gap-1.5">
            {SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setPendingColor(hex)}
                className={`w-6 h-6 rounded cursor-pointer transition-transform ${
                  pendingColor === hex ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''
                }`}
                style={{ backgroundColor: hex }}
                aria-label={hex}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={pendingColor}
              onChange={(e) => setPendingColor(e.target.value)}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={pendingColor}
              onChange={(e) => setPendingColor(e.target.value)}
              placeholder={DEFAULT_COLOR}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      )}

      {open && (suggestions.length > 0 || canCreate) && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {canCreate && (
            <button
              type="button"
              onClick={createTag}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-amber-50 cursor-pointer border-b border-gray-100"
            >
              <PlusIcon className="w-4 h-4 text-amber-600" />
              <span className="text-gray-700">{t('createTag', { name: trimmed })}</span>
              <span className="ml-auto w-4 h-4 rounded" style={{ backgroundColor: pendingColor }} />
            </button>
          )}
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => selectExisting(tag)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 cursor-pointer"
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.colorHex }} />
              <span className="text-gray-700">{tag.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default FeedbackTagInput
