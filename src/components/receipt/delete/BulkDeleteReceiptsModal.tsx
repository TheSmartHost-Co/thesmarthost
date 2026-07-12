'use client'

import { notifyError } from '@/utils/notify'
import React, { useState } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { bulkDeleteReceipts } from '@/services/receiptService'
import type { UploadedReceipt } from '@/services/types/receipt'
import { useNotificationStore } from '@/store/useNotificationStore'

interface BulkDeleteReceiptsModalProps {
  isOpen: boolean
  onClose: () => void
  receipts: UploadedReceipt[]
  onDeleted: (count: number) => void
}

const BulkDeleteReceiptsModal: React.FC<BulkDeleteReceiptsModalProps> = ({
  isOpen,
  onClose,
  receipts,
  onDeleted,
}) => {
  const [deleting, setDeleting] = useState(false)
  const showNotification = useNotificationStore((s) => s.showNotification)

  const appliedCount = receipts.filter((r) => r.status === 'applied').length

  const handleDelete = async () => {
    if (receipts.length === 0) return
    setDeleting(true)
    try {
      const res = await bulkDeleteReceipts(receipts.map((r) => r.id))
      if (res.status === 'success' && res.data) {
        const { summary } = res.data
        if (summary.deleted > 0) {
          showNotification(
            summary.failed === 0
              ? `Deleted ${summary.deleted} receipt${summary.deleted === 1 ? '' : 's'}`
              : `Deleted ${summary.deleted}, ${summary.failed} failed`,
            summary.failed === 0 ? 'success' : 'info'
          )
        } else {
          showNotification(
            res.data.failed[0]?.error || 'No receipts were deleted',
            'error'
          )
        }
        onDeleted(summary.deleted)
        onClose()
      } else {
        showNotification(res.message || 'Bulk delete failed', 'error')
      }
    } catch (err) {
      console.error('Bulk delete error:', err)
      notifyError(err, 'Network error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-md w-full mx-4" closable={!deleting}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Delete {receipts.length} receipt{receipts.length === 1 ? '' : 's'}?
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-3">
          This will permanently remove the selected receipt
          {receipts.length === 1 ? '' : 's'} from your account. This cannot be undone.
        </p>

        {appliedCount > 0 && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            <span className="font-semibold">{appliedCount}</span> of these{' '}
            {appliedCount === 1 ? 'is' : 'are'} already applied as expenses. Deleting{' '}
            {appliedCount === 1 ? 'it' : 'them'} will also remove the linked expense
            {appliedCount === 1 ? '' : 's'}.
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting
              ? 'Deleting…'
              : `Delete ${receipts.length} receipt${receipts.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default BulkDeleteReceiptsModal
