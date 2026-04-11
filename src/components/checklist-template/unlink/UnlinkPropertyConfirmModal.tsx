'use client'

import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  LinkSlashIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

interface UnlinkPropertyConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (action: 'unlink' | 'delete') => void
  propertyName: string
  checklistName: string
  submitting: boolean
}

export default function UnlinkPropertyConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  propertyName,
  checklistName,
  submitting,
}: UnlinkPropertyConfirmModalProps) {
  const { t } = useTranslation('turnover')

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('unlinkPropertyHeader')}</h2>
                <p className="text-sm text-gray-500 truncate max-w-[250px]">{propertyName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              The checklist <span className="font-semibold text-gray-900">&ldquo;{checklistName}&rdquo;</span> is
              linked to this template on property{' '}
              <span className="font-semibold text-gray-900">{propertyName}</span>.
            </p>
            <p className="text-sm text-gray-500">
              {t('chooseHowToHandle')}
            </p>

            {/* Option: Unlink Only */}
            <button
              onClick={() => onConfirm('unlink')}
              disabled={submitting}
              className="w-full flex items-center gap-4 p-4 border border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <LinkSlashIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">{t('unlinkOnlyTitle')}</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {t('unlinkOnlyDescription')}
                </p>
              </div>
            </button>

            {/* Option: Delete Checklist */}
            <button
              onClick={() => onConfirm('delete')}
              disabled={submitting}
              className="w-full flex items-center gap-4 p-4 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">{t('deleteChecklistOption')}</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {t('deleteChecklistOptionDescription')}
                </p>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              {t('cancel')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
