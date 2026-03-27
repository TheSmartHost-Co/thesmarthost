'use client'

import React, { useState } from 'react'
import Modal from '../../shared/modal'
import { deleteInvoice } from '@/services/cleanerInvoiceService'
import type { CleanerInvoice } from '@/services/types/cleanerInvoice'
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
  const [isDeleting, setIsDeleting] = useState(false)
  const showNotification = useNotificationStore((state) => state.showNotification)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await deleteInvoice(invoice.id)
      if (res.status === 'success') {
        showNotification(`Invoice ${invoice.invoiceNumber} deleted`, 'success')
        onDeleted()
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete invoice', 'error')
      }
    } catch (err) {
      console.error('Error deleting invoice:', err)
      showNotification(err instanceof Error ? err.message : 'Error deleting invoice', 'error')
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Invoice</h2>
          <p className="text-sm text-gray-600 mb-1">
            Are you sure you want to delete <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>?
          </p>
          {invoice.cleanerName && (
            <p className="text-sm text-gray-500 mb-4">Cleaner: {invoice.cleanerName}</p>
          )}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              This will permanently delete the invoice and all its line items. This action cannot be undone.
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
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isDeleting ? 'Deleting...' : 'Delete Invoice'}
        </button>
      </div>
    </Modal>
  )
}

export default DeleteInvoiceModal
