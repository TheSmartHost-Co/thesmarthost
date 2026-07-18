'use client'

import { useTranslation } from 'react-i18next'
import { CheckIcon, CameraIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import { groupChecklistItemsByRoom } from '@/services/cleaningProjectService'
import type { ChecklistSectionProps } from '../types'

/**
 * Checklist rows grouped by room. Rows with a photo show a quiet camera
 * indicator — viewing/managing photos lives in the Photos section.
 */
export default function ChecklistSection({ items, isLoading, hasTemplate, updatingItemId, onToggleItem }: ChecklistSectionProps) {
  const { t } = useTranslation('turnover')

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-1.5" />
        <p className="text-sm text-gray-500">{t('loadingChecklist')}</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <ClipboardDocumentCheckIcon className="w-6 h-6 text-gray-300 mx-auto mb-1" />
        <p className="text-sm text-gray-500">{hasTemplate ? t('checklistNotInitialized') : t('noChecklist')}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">
      {Object.entries(groupChecklistItemsByRoom(items)).map(([roomName, roomItems]) => (
        <div key={roomName} className="mb-4 last:mb-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {roomName || t('generalRoom')}
          </p>
          <div className="space-y-2">
            {roomItems.map(item => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                  item.isCompleted ? 'bg-green-50' : 'bg-white'
                }`}
              >
                <button
                  onClick={() => onToggleItem(item)}
                  disabled={updatingItemId === item.id}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                    item.isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-purple-500'
                  } ${updatingItemId === item.id ? 'opacity-50' : ''}`}
                >
                  {item.isCompleted && <CheckIcon className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {item.taskDescription}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  {item.photoUrl ? (
                    <>
                      <span title={t('photoAttached')} aria-label={t('photoAttached')}>
                        <CameraIcon className="w-4 h-4 text-gray-400" />
                      </span>
                      {(item.photoTakenAt || item.photoUploadedAt) && (
                        <span className="text-[10px] text-gray-400">
                          {item.photoTakenAt
                            ? `Taken ${new Date(item.photoTakenAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`
                            : `Uploaded ${new Date(item.photoUploadedAt!).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`
                          }
                        </span>
                      )}
                    </>
                  ) : item.requiresPhoto ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-1 text-xs text-amber-600 bg-amber-50 rounded-lg">
                      <CameraIcon className="w-3.5 h-3.5" />
                      {t('photoRequired')}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
