'use client'

import { useEffect, useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { markPayPeriodPaid } from '@/services/payPeriodService'
import { formatHours, formatMoney } from '@/lib/format'
import type { PayPeriod, PayPeriodTotals } from '@/services/types/payPeriod'

interface Props {
  isOpen: boolean
  onClose: () => void
  period: PayPeriod | null
  totals: PayPeriodTotals | null
  defaultCurrency?: string
  onPaid: (period: PayPeriod) => void
}

export default function MarkPaidConfirmModal({
  isOpen, onClose, period, totals, defaultCurrency = 'CAD', onPaid,
}: Props) {
  const showNotification = useNotificationStore(s => s.showNotification)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (!isOpen) setSubmitting(false) }, [isOpen])

  if (!period || !totals) return null

  const currency = totals.currency || defaultCurrency
  const totalHours = totals.hoursApproved + totals.hoursPending
  const totalAmount = totals.amountApproved + totals.amountPending

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      const res = await markPayPeriodPaid(period.id)
      if (res.status === 'success') {
        showNotification('Period marked as paid.', 'success')
        onPaid(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to mark period paid.', 'error')
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
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircleIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Mark Period #{String(period.periodNumber).padStart(2, '0')} as paid?
          </h2>
          {period.teamMemberName && (
            <p className="text-sm text-gray-700 mt-0.5">For <span className="font-medium">{period.teamMemberName}</span></p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            We&apos;ll snapshot these totals so future entry edits don&apos;t rewrite history.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm space-y-1">
        <Row label="Hours" value={formatHours(totalHours)} />
        <Row label="Total" value={formatMoney(totalAmount, currency)} />
        <Row label="Pay date" value={period.payDate} />
      </div>

      {totals.hasPending && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">
                {totals.pendingEntryCount} pending {totals.pendingEntryCount === 1 ? 'entry' : 'entries'} included
              </p>
              <p className="text-amber-700 mt-1">
                Pending hours ({formatHours(totals.hoursPending)} ·{' '}
                {formatMoney(totals.amountPending, currency)}) are part of this snapshot.
                You can still approve or reject them later, but the snapshot will not change —
                the page will flag any drift between live totals and the snapshot.
              </p>
            </div>
          </div>
        </div>
      )}

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
          onClick={handleConfirm}
          disabled={submitting}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {submitting ? 'Marking paid…' : 'Mark as paid'}
        </button>
      </div>
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-700">
      <span>{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
