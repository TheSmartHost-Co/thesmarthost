'use client'

import { notifyError } from '@/utils/notify'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import { deleteReceipt } from '@/services/receiptService'
import type { UploadedReceipt } from '@/services/types/receipt'
import { useNotificationStore } from '@/store/useNotificationStore'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: UploadedReceipt
  onDeleted: () => void
}

const DeleteReceiptModal: React.FC<DeleteReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onDeleted,
}) => {
  const { t } = useTranslation('expenses')
  const [deleting, setDeleting] = useState(false)
  const showNotification = useNotificationStore((s) => s.showNotification)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await deleteReceipt(receipt.id)
      if (res.status === 'success') {
        showNotification(t('receiptDeleted'), 'success')
        onDeleted()
        onClose()
      } else {
        showNotification(res.message || t('failedToDeleteReceipt'), 'error')
      }
    } catch (err) {
      console.error('Error deleting receipt:', err)
      notifyError(err, 'Network error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-md w-full mx-4">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{t('deleteReceipt')}</h3>
        </div>

        <p className="text-sm text-gray-600 mb-2">
          {t('confirmDeleteReceipt', { name: receipt.originalName })}
        </p>
        {receipt.status === 'applied' && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            {t('receiptAppliedDeleteWarning')}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? t('deletingReceipt') : t('deleteReceipt')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteReceiptModal
