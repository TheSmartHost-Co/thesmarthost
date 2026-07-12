'use client'

import { notifyError } from '@/utils/notify'
import { useState } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { deleteMappingByListing } from '@/services/pmsListingMappingService'
import type { GroupedListingMapping } from '@/services/types/pmsListingMapping'

interface DeleteListingMappingModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  mapping: GroupedListingMapping | null
  onDeleted: () => void
}

const DeleteListingMappingModal: React.FC<DeleteListingMappingModalProps> = ({
  isOpen,
  onClose,
  userId,
  mapping,
  onDeleted,
}) => {
  const { showNotification } = useNotificationStore()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!mapping) return
    setDeleting(true)
    try {
      const res = await deleteMappingByListing(userId, mapping.externalListingId)
      if (res.status === 'success') {
        showNotification('Listing mapping deleted', 'success')
        onDeleted()
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete mapping', 'error')
      }
    } catch (err) {
      console.error('Error deleting listing mapping:', err)
      notifyError(err, 'Network error')
    } finally {
      setDeleting(false)
    }
  }

  if (!mapping) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-md">
      <div className="p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Delete listing mapping
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              This removes the mapping for listing{' '}
              <span className="font-mono">{mapping.externalListingId}</span>
              {mapping.propertyName ? ` → ${mapping.propertyName}` : ''} across all
              channels. Future webhooks for this listing will fall back to
              automatic matching.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteListingMappingModal
