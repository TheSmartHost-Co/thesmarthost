'use client'

import React, { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import { BookmarkSquareIcon } from '@heroicons/react/24/outline'

interface SaveFilterPresetDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => Promise<void>
  /** When the parent finishes the save (success or 409), it sets this to null. */
  errorMessage?: string | null
  /** Defaults the input value (used when renaming) */
  initialName?: string
}

/**
 * Tiny "Save current view…" modal. The parent owns the actual API call so we
 * can surface a 409 (duplicate name) cleanly via errorMessage.
 */
export default function SaveFilterPresetDialog({
  isOpen,
  onClose,
  onSave,
  errorMessage,
  initialName = '',
}: SaveFilterPresetDialogProps) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setName(initialName)
  }, [isOpen, initialName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSave(name.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-sm w-full mx-4" closable={!saving}>
      <form onSubmit={handleSubmit} className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <BookmarkSquareIcon className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Save filter view</h3>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">View name</label>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. April 2026 — Property X — unsynced"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />

        {errorMessage && (
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save view'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
