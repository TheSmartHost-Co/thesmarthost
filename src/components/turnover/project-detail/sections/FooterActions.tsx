'use client'

import { useTranslation } from 'react-i18next'
import { TrashIcon, XCircleIcon, ArrowPathIcon, BoltIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import TableActionsDropdown, { type ActionItem } from '@/components/shared/TableActionsDropdown'
import type { FooterActionsProps } from '../types'

const LOCKED_STATUSES = ['completed', 'cancelled']

/**
 * Single-row footer: destructive/status actions live in a ⋯ overflow menu
 * (keeps the fixed chrome slim on mobile); Close + Edit stay primary.
 */
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

  const menuActions: ActionItem[] = []
  if (hasWrite && onDeleteClick) {
    menuActions.push({ label: t('deleteProject'), icon: TrashIcon, onClick: onDeleteClick, variant: 'danger' })
  }
  if (hasWrite && onCancelClick && !LOCKED_STATUSES.includes(project.status)) {
    menuActions.push({ label: t('cancelProject'), icon: XCircleIcon, onClick: onCancelClick })
  }
  if (hasWrite && project.status === 'in_progress') {
    menuActions.push({ label: t('unstartProjectLabel'), icon: ArrowPathIcon, onClick: onUnbeginClick })
  }
  if (hasWrite) {
    menuActions.push(
      project.pmOverride
        ? { label: t('removeOverride'), icon: BoltIcon, onClick: onRemoveOverride }
        : { label: t('overrideProject'), icon: BoltIcon, onClick: onOverrideClick }
    )
  }

  return (
    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2 flex-shrink-0">
      {menuActions.length > 0 && (
        <TableActionsDropdown actions={menuActions} itemId={`project-actions-${project.id}`} />
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
