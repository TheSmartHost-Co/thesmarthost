'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

interface Props {
  isOpen: boolean
  /** Number of photos being deleted. Drives singular/plural copy. */
  count: number
  onClose: () => void
  /** Performs the delete. The modal owns the in-flight spinner and closes on resolve. */
  onConfirm: () => Promise<void>
}

/**
 * Confirmation dialog for deleting one or more walkthrough photos. Used for both
 * single (count = 1) and bulk deletes across the cleaner and PM contexts. The
 * caller owns the actual delete + notifications inside onConfirm; this component
 * only owns the confirm gate and its loading state.
 *
 * Uses the `turnover` namespace, which is already loaded wherever the shared
 * WalkthroughAccordion renders (cleaner portal + PM turnover views).
 */
export default function DeleteWalkthroughPhotosModal({ isOpen, count, onClose, onConfirm }: Props) {
  const { t } = useTranslation('turnover')
  const [deleting, setDeleting] = useState(false)

  if (!isOpen) return null

  const isBulk = count > 1

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
    } catch {
      // Defensive: callers handle their own errors + notifications and don't
      // throw. If one ever did, we swallow here so the spinner still clears.
    } finally {
      setDeleting(false)
      onClose()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={deleting ? undefined : onClose} />
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
              <h2 className="text-base font-bold text-gray-900">
                {isBulk ? t('deletePhotosTitle', { count }) : t('deletePhotoTitle')}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('actionCannotBeUndone')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <XMarkIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-700">
            {isBulk ? t('deletePhotosConfirmBody', { count }) : t('deletePhotoConfirmBody')}
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
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
          >
            {deleting && (
              <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            )}
            {t('deletePhotoButton')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
