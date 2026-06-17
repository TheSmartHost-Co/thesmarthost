'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import SearchableSelect, { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import PropertyChip from '@/components/receipt/PropertyChip'
import type { UploadedReceipt } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'

interface LinkedExpenseLike {
  propertyId?: string | null
  propertyName?: string | null
}

interface PropertyEditPillProps {
  receipt: Pick<UploadedReceipt, 'propertyName' | 'propertyId'>
  linkedExpense?: LinkedExpenseLike | null
  properties: Property[]
  size?: 'sm' | 'md'
  showFromExpenseHint?: boolean
  className?: string
  /**
   * When provided, the pill becomes a clickable editor. The handler should
   * persist the change and resolve once finished — the pill shows a spinner
   * until then, and closes the editor on resolve.
   *
   * If omitted, the pill renders as a plain read-only PropertyChip.
   */
  onSave?: (newPropertyId: string) => Promise<void>
}

const PropertyEditPill: React.FC<PropertyEditPillProps> = ({
  receipt,
  linkedExpense,
  properties,
  size = 'sm',
  showFromExpenseHint = true,
  className = '',
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [selected, setSelected] = useState<string | null>(receipt.propertyId ?? null)
  const [saving, setSaving] = useState(false)

  // Sync local selection if the underlying record changes.
  useEffect(() => {
    if (!isEditing) setSelected(receipt.propertyId ?? null)
  }, [receipt.propertyId, isEditing])

  // Close on Escape while editing.
  useEffect(() => {
    if (!isEditing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) handleCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, saving])

  const options = useMemo<SearchableSelectOption<string>[]>(() => {
    return properties.map((p) => ({
      value: p.id,
      label: p.listingName || p.address || p.id,
      secondaryLabel: p.listingName ? (p.address || undefined) : (p.postalCode || undefined),
    }))
  }, [properties])

  if (!onSave) {
    return (
      <PropertyChip
        receipt={receipt}
        linkedExpense={linkedExpense}
        properties={properties}
        size={size}
        showFromExpenseHint={showFromExpenseHint}
        className={className}
      />
    )
  }

  const handleOpen = () => {
    setSelected(receipt.propertyId ?? null)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setSelected(receipt.propertyId ?? null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!selected || selected === receipt.propertyId) {
      // No-op if unchanged or empty — just close.
      setIsEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(selected)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!isEditing) {
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`group inline-flex items-center gap-1 rounded-full hover:ring-2 hover:ring-indigo-200 transition-shadow ${className}`}
        title="Click to change property"
      >
        <PropertyChip
          receipt={receipt}
          linkedExpense={linkedExpense}
          properties={properties}
          size={size}
          showFromExpenseHint={showFromExpenseHint}
        />
        <PencilIcon className={`${iconSize} text-gray-400 group-hover:text-indigo-500 transition-colors`} />
      </button>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <SearchableSelect
        options={options}
        value={selected}
        onChange={(v) => setSelected(v)}
        placeholder="Select a property..."
        disabled={saving}
        clearable={false}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !selected || selected === receipt.propertyId}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckIcon className="w-3.5 h-3.5" />
          )}
          Save
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </div>
  )
}

export default PropertyEditPill
