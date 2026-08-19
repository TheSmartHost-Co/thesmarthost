'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon, XMarkIcon, ExclamationCircleIcon, CameraIcon } from '@heroicons/react/24/outline'
import type { CreateTaskChecklistItemPayload } from '@/services/types/maintenanceTask'

export interface TaskChecklistBuilderProps {
  items: CreateTaskChecklistItemPayload[]
  onChange: (items: CreateTaskChecklistItemPayload[]) => void
}

/**
 * Controlled checklist authoring rows used inside task create/edit forms.
 * Order = list order (no drag reorder in v1).
 */
export default function TaskChecklistBuilder({ items, onChange }: TaskChecklistBuilderProps) {
  const { t } = useTranslation('turnover')
  const [newDescription, setNewDescription] = useState('')

  const updateItem = (index: number, patch: Partial<CreateTaskChecklistItemPayload>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const addItem = () => {
    const description = newDescription.trim()
    if (!description) return
    onChange([...items, { description, isRequired: true, photoRequired: false }])
    setNewDescription('')
  }

  const toggleClass = (active: boolean, activeClasses: string) =>
    `flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
      active ? activeClasses : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
    }`

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={item.description}
            onChange={(e) => updateItem(index, { description: e.target.value })}
            placeholder={t('checklistItemPlaceholder')}
            className="flex-1 min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => updateItem(index, { isRequired: !(item.isRequired ?? true) })}
            title={t('checklistRequiredTooltip')}
            aria-pressed={item.isRequired ?? true}
            className={toggleClass(item.isRequired ?? true, 'bg-red-50 border-red-200 text-red-600')}
          >
            <ExclamationCircleIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('checklistRequiredBadge')}</span>
          </button>
          <button
            type="button"
            onClick={() => updateItem(index, { photoRequired: !(item.photoRequired ?? false) })}
            title={t('checklistPhotoTooltip')}
            aria-pressed={item.photoRequired ?? false}
            className={toggleClass(item.photoRequired ?? false, 'bg-blue-50 border-blue-200 text-blue-600')}
          >
            <CameraIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('photo')}</span>
          </button>
          <button
            type="button"
            onClick={() => removeItem(index)}
            title={t('checklistRemoveItem')}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Add item row */}
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-200 flex-shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addItem()
            }
          }}
          placeholder={t('checklistItemPlaceholder')}
          className="flex-1 min-w-0 px-3 py-2 bg-white border border-dashed border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:border-solid transition-colors"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!newDescription.trim()}
          className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          {t('addChecklistItem')}
        </button>
      </div>
    </div>
  )
}
