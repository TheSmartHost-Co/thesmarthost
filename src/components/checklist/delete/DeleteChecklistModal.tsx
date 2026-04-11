'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { deleteChecklist } from '@/services/checklistService'
import type { Checklist } from '@/services/types/checklist'

interface DeleteChecklistModalProps {
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
  checklist: Checklist | null
}

export default function DeleteChecklistModal({
  isOpen,
  onClose,
  onDeleted,
  checklist,
}: DeleteChecklistModalProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!checklist) return

    setDeleting(true)
    try {
      const res = await deleteChecklist(checklist.id)

      if (res.status === 'success') {
        showNotification(`Checklist "${checklist.name}" deleted`, 'success')
        onDeleted()
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete checklist', 'error')
      }
    } catch (err) {
      console.error('Error deleting checklist:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to delete checklist',
        'error'
      )
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen || !checklist) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{t('deleteChecklistTitle')}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700">
              {t('confirmDeleteChecklist')} <strong>&ldquo;{checklist.name}&rdquo;</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {t('willPermanentlyRemove', { count: checklist.itemCount || 0 })}
              {checklist.propertyName ? ` ${t('fromProperty', { property: checklist.propertyName })}` : ''}.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('deletingChecklist')}
                </>
              ) : (
                <>
                  <TrashIcon className="w-4 h-4" />
                  {t('deleteChecklistButton')}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
