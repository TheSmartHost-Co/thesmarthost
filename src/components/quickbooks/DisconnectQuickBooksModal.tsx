'use client'

import { useState } from 'react'
import Modal from '@/components/shared/modal'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { disconnect as disconnectQb } from '@/services/quickbooksService'
import { useNotificationStore } from '@/store/useNotificationStore'

interface DisconnectQuickBooksModalProps {
  isOpen: boolean
  onClose: () => void
  onDisconnected: () => void
}

export default function DisconnectQuickBooksModal({
  isOpen,
  onClose,
  onDisconnected,
}: DisconnectQuickBooksModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const { showNotification } = useNotificationStore()

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      const res = await disconnectQb()
      if (res.status === 'success') {
        showNotification('QuickBooks disconnected', 'success')
        onDisconnected()
        onClose()
      } else {
        showNotification(res.message || 'Failed to disconnect', 'error')
      }
    } catch (err) {
      console.error('QB disconnect error:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to disconnect QuickBooks',
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-11/12 max-w-md">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Disconnect QuickBooks</h3>
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-900 space-y-1">
            <div className="font-semibold">This will:</div>
            <ul className="list-disc list-inside space-y-0.5 text-red-800">
              <li>Stop auto-syncing new expenses to QuickBooks</li>
              <li>Revoke the saved access tokens</li>
              <li>Keep historical sync records for audit</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          You can reconnect anytime — to the same environment or a different one.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
