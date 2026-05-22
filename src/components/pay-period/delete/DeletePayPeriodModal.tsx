'use client'

import { useEffect, useState } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { deletePayPeriod } from '@/services/payPeriodService'
import type { PayPeriod } from '@/services/types/payPeriod'

interface Props {
  isOpen: boolean
  onClose: () => void
  period: PayPeriod | null
  onDeleted: (id: string) => void
}

export default function DeletePayPeriodModal({ isOpen, onClose, period, onDeleted }: Props) {
  const showNotification = useNotificationStore(s => s.showNotification)
  const [submitting, setSubmitting] = useState(false)

  // Reset on reopen so a mid-flight dismissal doesn't leave the button stuck.
  useEffect(() => { if (!isOpen) setSubmitting(false) }, [isOpen])

  if (!period) return null

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      const res = await deletePayPeriod(period.id)
      if (res.status === 'success') {
        showNotification('Pay period deleted.', 'success')
        onDeleted(period.id)
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete period.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Delete Period #{String(period.periodNumber).padStart(2, '0')} · {period.periodYear}?
          </h2>
          {period.teamMemberName && (
            <p className="text-sm text-gray-700 mt-0.5">For <span className="font-medium">{period.teamMemberName}</span></p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            This cannot be undone. Time entries inside the window are not deleted — they&apos;ll just
            unassign from this period until the daily generator runs again or you create a new one.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
        <div className="flex justify-between text-gray-700">
          <span>Dates</span>
          <span className="font-medium">{period.startDate} → {period.endDate}</span>
        </div>
        <div className="flex justify-between text-gray-700 mt-1">
          <span>Pay date</span>
          <span className="font-medium">{period.payDate}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
        >
          {submitting ? 'Deleting…' : 'Delete period'}
        </button>
      </div>
    </Modal>
  )
}
