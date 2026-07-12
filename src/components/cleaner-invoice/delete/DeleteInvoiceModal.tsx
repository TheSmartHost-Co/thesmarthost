'use client'

import { notifyError } from '@/utils/notify'
import React, { useState } from 'react'
import Modal from '../../shared/modal'
import { deleteInvoice } from '@/services/cleanerInvoiceService'
import type { CleanerInvoice } from '@/services/types/cleanerInvoice'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: CleanerInvoice
  onDeleted: () => void
}

const DeleteInvoiceModal: React.FC<DeleteInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onDeleted,
}) => {
  const { t } = useTranslation('turnover')
  const [isDeleting, setIsDeleting] = useState(false)
  const showNotification = useNotificationStore((state) => state.showNotification)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await deleteInvoice(invoice.id)
      if (res.status === 'success') {
        showNotification(t('invoiceDeletedNumber', { number: invoice.invoiceNumber }), 'success')
        onDeleted()
        onClose()
      } else {
        showNotification(res.message || t('failedToDeleteInvoice'), 'error')
      }
    } catch (err) {
      console.error('Error deleting invoice:', err)
      notifyError(err, t('errorDeletingInvoice'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('deleteInvoiceTitle')}</h2>
          <p className="text-sm text-gray-600 mb-1">
            {t('confirmDeleteInvoiceNumber', { number: invoice.invoiceNumber })}
          </p>
          {invoice.cleanerName && (
            <p className="text-sm text-gray-500 mb-4">{t('cleaner')}: {invoice.cleanerName}</p>
          )}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              {t('deleteInvoiceWarning')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isDeleting ? t('deletingInvoice') : t('deleteInvoiceButton')}
        </button>
      </div>
    </Modal>
  )
}

export default DeleteInvoiceModal
