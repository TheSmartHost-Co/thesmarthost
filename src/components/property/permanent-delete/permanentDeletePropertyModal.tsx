'use client'

import { useTranslation } from 'react-i18next'
import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { permanentlyDeleteProperty } from '@/services/propertyService'
import { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface PermanentDeletePropertyModalProps {
  isOpen: boolean
  onClose: () => void
  property: Property
  onDeleted: (propertyId: string) => void
}

const PermanentDeletePropertyModal: React.FC<PermanentDeletePropertyModalProps> = ({
  isOpen,
  onClose,
  property,
  onDeleted,
}) => {
  const [confirmationText, setConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Get the property name for confirmation (use listingName, or address if no name)
  const propertyName = property.listingName || property.address

  // Check if confirmation matches (case-insensitive)
  const isConfirmed = confirmationText.toLowerCase() === propertyName.toLowerCase()

  // Reset confirmation text when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmationText('')
    }
  }, [isOpen])

  const handleDelete = async () => {
    if (!isConfirmed) return

    setIsDeleting(true)

    try {
      const res = await permanentlyDeleteProperty(property.id)

      if (res.status === 'success') {
        onDeleted(property.id)
        showNotification('Property permanently deleted', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete property', 'error')
      }
    } catch (err) {
      console.error('Error permanently deleting property:', err)
      const message = err instanceof Error ? err.message : 'Error deleting property'
      showNotification(message, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-lg w-11/12">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Permanently Delete Property
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to permanently delete <span className="font-medium text-gray-900">{propertyName}</span>?
          </p>

          {/* Danger Warning Box */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-red-800 mb-2">
              This action cannot be undone. The following will be permanently deleted:
            </p>
            <ul className="text-sm text-red-700 ml-4 list-disc space-y-1">
              <li>All bookings associated with this property</li>
              <li>CSV upload history and records</li>
              <li>Property channels and distribution settings</li>
              <li>Property licenses and documents</li>
              <li>Owner associations and commission settings</li>
              <li>Field mappings and webhook configurations</li>
              <li>Report associations and expense records</li>
            </ul>
          </div>

          {/* Confirmation Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-semibold text-red-600">{propertyName}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Enter property name to confirm"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-sm"
              disabled={isDeleting}
            />
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
          disabled={isDeleting || !isConfirmed}
          className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isDeleting ? 'Deleting...' : 'Permanently Delete'}
        </button>
      </div>
    </Modal>
  )
}

export default PermanentDeletePropertyModal
