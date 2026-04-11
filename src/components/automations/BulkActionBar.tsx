'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'

interface BulkActionBarProps {
  selectedCount: number
  hasAwaitingApproval: boolean
  onApprove: () => Promise<void>
  onReject: () => Promise<void>
  onDelete: () => Promise<void>
  onClear: () => void
}

export default function BulkActionBar({
  selectedCount,
  hasAwaitingApproval,
  onApprove,
  onReject,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  const { t } = useTranslation('dashboard')
  const [loading, setLoading] = useState<string | null>(null)

  if (selectedCount === 0) return null

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setLoading(action)
    await fn()
    setLoading(null)
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl">
        <span className="text-sm font-medium">
          {t('automations.selectedCount', { count: selectedCount })}
        </span>

        <div className="w-px h-5 bg-gray-700" />

        {hasAwaitingApproval && (
          <button
            onClick={() => handleAction('approve', onApprove)}
            disabled={loading !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            {loading === 'approve' ? t('automations.approving') : t('automations.approve')}
          </button>
        )}

        {hasAwaitingApproval && (
          <button
            onClick={() => handleAction('reject', onReject)}
            disabled={loading !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
            {loading === 'reject' ? t('automations.rejecting') : t('automations.reject')}
          </button>
        )}

        <button
          onClick={() => handleAction('delete', onDelete)}
          disabled={loading !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <TrashIcon className="w-3.5 h-3.5" />
          {loading === 'delete' ? t('automations.deleting') : t('automations.delete')}
        </button>

        <div className="w-px h-5 bg-gray-700" />

        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {t('automations.cancel')}
        </button>
      </div>
    </div>
  )
}
