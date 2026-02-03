'use client'

import React, { useState } from 'react'
import Modal from '../../shared/modal'
import { deleteCleaner } from '@/services/cleanerService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Cleaner } from '@/services/types/cleaner'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteCleanerModalProps {
  isOpen: boolean
  onClose: () => void
  cleaner: Cleaner
  onDeleted: (id: string) => void
}

const DeleteCleanerModal: React.FC<DeleteCleanerModalProps> = ({
  isOpen,
  onClose,
  cleaner,
  onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const showNotification = useNotificationStore((state) => state.showNotification)

  const assignedCount = cleaner.assignedProperties?.length || 0

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await deleteCleaner(cleaner.id)
      if (res.status === 'success') {
        showNotification('Cleaner deleted successfully', 'success')
        onDeleted(cleaner.id)
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete cleaner', 'error')
      }
    } catch (err) {
      showNotification('Error deleting cleaner', 'error')
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Delete Cleaner</h2>
          <p className="text-gray-600 mt-2">
            Are you sure you want to delete <strong>{cleaner.name}</strong>?
          </p>
          {assignedCount > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> This cleaner is assigned to {assignedCount} {assignedCount === 1 ? 'property' : 'properties'}.
                Deleting will remove all property assignments.
              </p>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-3">
            This action cannot be undone.
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-6">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete Cleaner'}
        </button>
      </div>
    </Modal>
  )
}

export default DeleteCleanerModal
