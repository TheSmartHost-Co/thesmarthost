'use client'

import React, { useState } from 'react'
import Modal from '../../shared/modal'
import { deleteProperty } from '@/services/propertyService'
import { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeletePropertyModalProps {
  isOpen: boolean
  onClose: () => void
  property: Property
  onDeleted: (propertyId: string) => void
}

const DeletePropertyModal: React.FC<DeletePropertyModalProps> = ({
  isOpen,
  onClose,
  property,
  onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const showNotification = useNotificationStore((state) => state.showNotification)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const res = await deleteProperty(property.id)

      if (res.status === 'success') {
        onDeleted(property.id)
        showNotification('Property deleted successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete property', 'error')
      }
    } catch (err) {
      console.error('Error deleting property:', err)
      const message = err instanceof Error ? err.message : 'Error deleting property'
      showNotification(message, 'error')
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Delete Property
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to delete <span className="font-medium text-gray-900">{property.listingName}</span>?
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> This will deactivate the property (soft delete).
            </p>
            <ul className="text-sm text-amber-700 mt-2 ml-4 list-disc space-y-1">
              <li>Bookings and upload history will be preserved</li>
              <li>The property can be reactivated later from settings</li>
              <li>Owner associations will be maintained</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isDeleting ? 'Deleting...' : 'Delete Property'}
        </button>
      </div>
    </Modal>
  )
}

export default DeletePropertyModal