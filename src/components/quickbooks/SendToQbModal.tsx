'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { syncExpenseToQb } from '@/services/quickbooksService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { QbEntityType } from '@/services/types/quickbooks'

interface SendToQbModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  /** Vendor name shown in the confirmation header. Optional — only for clarity. */
  vendorName?: string | null
  /** Whether the expense has a receipt attached. Drives the default of the checkbox. */
  hasReceipt: boolean
  /** Connection-level default; pre-fills the dropdown so the user can override per-call. */
  connectionDefaultEntityType: QbEntityType
  onSynced: (result: { qbEntityId: string; qbEntityType: QbEntityType; attached: boolean }) => void
}

export default function SendToQbModal({
  isOpen,
  onClose,
  expenseId,
  vendorName,
  hasReceipt,
  connectionDefaultEntityType,
  onSynced,
}: SendToQbModalProps) {
  const [entityType, setEntityType] = useState<QbEntityType>(connectionDefaultEntityType)
  const [includeReceipt, setIncludeReceipt] = useState<boolean>(hasReceipt)
  const [submitting, setSubmitting] = useState(false)
  const { showNotification } = useNotificationStore()

  // Reset form to defaults each time the modal re-opens.
  useEffect(() => {
    if (isOpen) {
      setEntityType(connectionDefaultEntityType)
      setIncludeReceipt(hasReceipt)
    }
  }, [isOpen, connectionDefaultEntityType, hasReceipt])

  const handleSend = async () => {
    setSubmitting(true)
    try {
      const res = await syncExpenseToQb(expenseId, {
        qbEntityType: entityType,
        includeReceipt,
      })
      if (res.status === 'success') {
        onSynced({
          qbEntityId: res.data.qbEntityId,
          qbEntityType: res.data.qbEntityType,
          attached: res.data.attached,
        })
        showNotification(
          res.data.alreadySynced
            ? 'Already in QuickBooks'
            : `Sent to QuickBooks${res.data.attached ? ' with receipt' : ''}`,
          'success'
        )
        onClose()
      } else {
        if (res.code === 'QB_RECONNECT_REQUIRED') {
          showNotification('Reconnect QuickBooks to continue', 'error')
        } else {
          showNotification(res.message || 'Failed to send to QuickBooks', 'error')
        }
      }
    } catch (err) {
      console.error('QB sync error:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to send to QuickBooks',
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-11/12 max-w-md">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Send to QuickBooks</h3>
        {vendorName && (
          <p className="text-sm text-gray-600">
            Vendor: <span className="font-medium text-gray-900">{vendorName}</span>
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Entity type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['purchase', 'bill'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setEntityType(opt)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  entityType === opt
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt === 'purchase' ? 'Purchase (paid)' : 'Bill (unpaid)'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Default for your account: <span className="font-medium">{connectionDefaultEntityType}</span>
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={includeReceipt}
            onChange={(e) => setIncludeReceipt(e.target.checked)}
            disabled={!hasReceipt}
            className="mt-0.5"
          />
          <span>
            Include receipt attachment
            {!hasReceipt && (
              <span className="block text-xs text-gray-500">No receipt available</span>
            )}
          </span>
        </label>

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
            onClick={handleSend}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
          >
            <CheckCircleIcon className="w-4 h-4" />
            {submitting ? 'Sending…' : 'Send to QuickBooks'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
