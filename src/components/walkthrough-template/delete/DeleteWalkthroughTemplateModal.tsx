'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { deleteWalkthroughTemplate } from '@/services/walkthroughTemplateService'
import type { WalkthroughTemplate } from '@/services/types/walkthroughTemplate'

interface Props {
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
  template: WalkthroughTemplate | null
}

export default function DeleteWalkthroughTemplateModal({
  isOpen,
  onClose,
  onDeleted,
  template,
}: Props) {
  const { t } = useTranslation('turnover')
  const { profile } = useUserStore()
  const showNotification = useNotificationStore(state => state.showNotification)
  const [deleting, setDeleting] = useState(false)

  if (!isOpen || !template) return null

  const handleDelete = async () => {
    if (!profile?.id) return
    setDeleting(true)
    try {
      const res = await deleteWalkthroughTemplate(template.id, profile.id)
      if (res.status === 'success') {
        showNotification(t('templateDeleted'), 'success')
        onDeleted()
        onClose()
      } else {
        showNotification(res.message || t('failedToDeleteTemplate'), 'error')
      }
    } catch (err) {
      console.error('Error deleting walkthrough template:', err)
      showNotification(
        err instanceof Error ? err.message : t('errorDeletingTemplate'),
        'error'
      )
    } finally {
      setDeleting(false)
    }
  }

  const assignedCount = template.assignedProperties.length

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="relative z-10 bg-white rounded-2xl shadow-xl w-[90vw] max-w-md"
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 rounded-xl">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{t('deleteWalkthroughTemplate')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('actionCannotBeUndone')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
            <XMarkIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-700">
            {t('confirmDeleteNamed', { name: template.name })}
          </p>
          {assignedCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs text-amber-800">
                {t('templateAssignedToProperties', { count: assignedCount })}
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500">
            {t('photosWillBeArchived')}
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
          >
            {deleting && (
              <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            )}
            {t('deleteTemplateButton')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
