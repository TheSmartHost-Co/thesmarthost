'use client'

import { notifyError } from '@/utils/notify'
import React, { useState } from 'react'
import Modal from '@/components/shared/modal'
import { deletePaystub } from '@/services/paystubService'
import type { Paystub } from '@/services/types/paystub'
import { useNotificationStore } from '@/store/useNotificationStore'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeletePaystubModalProps {
  isOpen: boolean
  onClose: () => void
  paystub: Paystub | null
  onDeleted: () => void
}

const DeletePaystubModal: React.FC<DeletePaystubModalProps> = ({
  isOpen, onClose, paystub, onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const showNotification = useNotificationStore((s) => s.showNotification)

  if (!paystub) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await deletePaystub(paystub.id)
      if (res.status === 'success') {
        showNotification(`Paystub ${paystub.paystubNumber} deleted.`, 'success')
        onDeleted()
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete paystub.', 'error')
      }
    } catch (err) {
      notifyError(err, 'Error deleting paystub.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12" zIndex={80}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete paystub?</h2>
          <p className="text-sm text-gray-600 mb-1">
            Are you sure you want to delete paystub <span className="font-semibold">{paystub.paystubNumber}</span>?
          </p>
          {paystub.teamMemberName && (
            <p className="text-sm text-gray-500 mb-4">Team member: {paystub.teamMemberName}</p>
          )}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              This permanently deletes the paystub and all its items. Linked time entries and expenses become available again.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? 'Deleting…' : 'Delete paystub'}
        </button>
      </div>
    </Modal>
  )
}

export default DeletePaystubModal
