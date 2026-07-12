'use client'

import { notifyError } from '@/utils/notify'
import React, { useState } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { bulkDeleteExpenses } from '@/services/expenseService'
import { useNotificationStore } from '@/store/useNotificationStore'

interface BulkDeleteExpensesModalProps {
  isOpen: boolean
  onClose: () => void
  expenseIds: string[]
  onDeleted: (count: number) => void
}

const BulkDeleteExpensesModal: React.FC<BulkDeleteExpensesModalProps> = ({
  isOpen,
  onClose,
  expenseIds,
  onDeleted,
}) => {
  const [deleting, setDeleting] = useState(false)
  const showNotification = useNotificationStore((s) => s.showNotification)

  const handleDelete = async () => {
    if (expenseIds.length === 0) return
    setDeleting(true)
    try {
      const res = await bulkDeleteExpenses(expenseIds)
      if (res.status === 'success' && res.data) {
        const { summary } = res.data
        if (summary.deleted > 0) {
          showNotification(
            summary.failed === 0
              ? `Deleted ${summary.deleted} expense${summary.deleted === 1 ? '' : 's'}`
              : `Deleted ${summary.deleted}, ${summary.failed} failed`,
            summary.failed === 0 ? 'success' : 'info'
          )
        } else {
          showNotification(
            res.data.failed[0]?.error || 'No expenses were deleted',
            'error'
          )
        }
        onDeleted(summary.deleted)
        onClose()
      } else {
        showNotification(res.message || 'Bulk delete failed', 'error')
      }
    } catch (err) {
      console.error('Bulk delete expenses error:', err)
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
            Delete {expenseIds.length} expense{expenseIds.length === 1 ? '' : 's'}?
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-3">
          This will permanently remove the selected expense
          {expenseIds.length === 1 ? '' : 's'} along with their line items. Linked
          receipts will be reset to their pre-applied state. This cannot be undone.
        </p>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting
              ? 'Deleting…'
              : `Delete ${expenseIds.length} expense${expenseIds.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default BulkDeleteExpensesModal
