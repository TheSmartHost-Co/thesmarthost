'use client'

import { useEffect, useState } from 'react'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { updatePayPeriod } from '@/services/payPeriodService'
import type { PayPeriod, UpdatePayPeriodPayload } from '@/services/types/payPeriod'

interface Props {
  isOpen: boolean
  onClose: () => void
  period: PayPeriod | null
  onUpdated: (period: PayPeriod) => void
}

export default function EditPayPeriodModal({ isOpen, onClose, period, onUpdated }: Props) {
  const showNotification = useNotificationStore(s => s.showNotification)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [payDate, setPayDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !period) return
    setStartDate(period.startDate)
    setEndDate(period.endDate)
    setPayDate(period.payDate)
    setNotes(period.notes ?? '')
  }, [isOpen, period])

  if (!period) return null

  const datesValid = startDate && endDate && endDate >= startDate
  const canSubmit = datesValid && !submitting

  // Only send fields that actually changed so the backend doesn't trigger
  // recomputation when nothing meaningful was edited.
  const buildPayload = (): UpdatePayPeriodPayload => {
    const p: UpdatePayPeriodPayload = {}
    if (startDate !== period.startDate) p.startDate = startDate
    if (endDate !== period.endDate)     p.endDate = endDate
    if (payDate !== period.payDate)     p.payDate = payDate
    if ((notes.trim() || null) !== (period.notes ?? null)) p.notes = notes.trim() || ''
    return p
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    const payload = buildPayload()
    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }
    setSubmitting(true)
    try {
      const res = await updatePayPeriod(period.id, payload)
      if (res.status === 'success') {
        showNotification('Pay period updated.', 'success')
        onUpdated(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to update period.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <PencilSquareIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Edit Period #{String(period.periodNumber).padStart(2, '0')} · {period.periodYear}
          </h2>
          <p className="text-sm text-gray-500">
            {period.teamMemberName ? <>For <span className="font-medium text-gray-700">{period.teamMemberName}</span> · </> : null}
            Changing dates may shift this period&apos;s entries.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="ep-start">Start date</label>
            <input
              id="ep-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="ep-end">End date</label>
            <input
              id="ep-end"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="ep-pay">Pay date</label>
          <input
            id="ep-pay"
            type="date"
            value={payDate}
            min={endDate || undefined}
            onChange={(e) => setPayDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="ep-notes">Notes</label>
          <textarea
            id="ep-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
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
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Modal>
  )
}
