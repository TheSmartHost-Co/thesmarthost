'use client'

import { useTranslation } from 'react-i18next'
import { XCircleIcon, ArrowPathIcon, BoltIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import type { FooterActionsProps } from '../types'

const LOCKED_STATUSES = ['completed', 'cancelled']

/** Footer button row: destructive/status actions left, Close/Edit right. */
export default function FooterActions({
  project,
  hasWrite,
  onDeleteClick,
  onCancelClick,
  onUnbeginClick,
  onOverrideClick,
  onRemoveOverride,
  onEditClick,
  onClose,
}: FooterActionsProps) {
  const { t } = useTranslation('turnover')
  const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500'
  return (
    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center gap-2">
      {hasWrite && onDeleteClick && (
        <button
          onClick={onDeleteClick}
          className={`px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ${focusRing}`}
        >
          {t('deleteProject')}
        </button>
      )}
      {hasWrite && onCancelClick && !LOCKED_STATUSES.includes(project.status) && (
        <button
          onClick={onCancelClick}
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer ${focusRing}`}
        >
          <XCircleIcon className="w-3.5 h-3.5" />
          {t('cancelProject')}
        </button>
      )}
      {hasWrite && project.status === 'in_progress' && (
        <button
          onClick={onUnbeginClick}
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer ${focusRing}`}
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
          {t('unstartProjectLabel')}
        </button>
      )}
      {hasWrite && (
        project.pmOverride ? (
          <button
            onClick={onRemoveOverride}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer ${focusRing}`}
          >
            <BoltIcon className="w-3.5 h-3.5" />
            {t('removeOverride')}
          </button>
        ) : (
          <button
            onClick={onOverrideClick}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer ${focusRing}`}
          >
            <BoltIcon className="w-3.5 h-3.5" />
            {t('overrideProject')}
          </button>
        )
      )}
      <div className="flex-1 min-w-0" />
      <button
        onClick={onClose}
        className={`px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer ${focusRing}`}
      >
        {t('close')}
      </button>
      {hasWrite && (
        <button
          onClick={onEditClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors cursor-pointer ${focusRing}`}
        >
          <PencilSquareIcon className="w-3.5 h-3.5" />
          {t('editProject')}
        </button>
      )}
    </div>
  )
}
