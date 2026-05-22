'use client'

import { useEffect, useState } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { exportPayPeriodCsv } from '@/services/payPeriodService'
import { downloadCsvBlob } from '@/services/timeEntryService'
import type { PayPeriod } from '@/services/types/payPeriod'

interface Props {
  isOpen: boolean
  onClose: () => void
  period: PayPeriod | null
}

export default function ExportPayPeriodModal({ isOpen, onClose, period }: Props) {
  const showNotification = useNotificationStore(s => s.showNotification)
  const [includePending, setIncludePending] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) setIncludePending(false)
  }, [isOpen])

  if (!period) return null

  const handleExport = async () => {
    setSubmitting(true)
    try {
      const { blob, filename } = await exportPayPeriodCsv(period.id, { includePending })
      downloadCsvBlob(blob, filename)
      showNotification('Export downloaded.', 'success')
      onClose()
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Export failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <ArrowDownTrayIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Export Period #{String(period.periodNumber).padStart(2, '0')}
          </h2>
          <p className="text-sm text-gray-500">
            {period.teamMemberName ? <><span className="font-medium text-gray-700">{period.teamMemberName}</span> · </> : null}
            {period.startDate} → {period.endDate}
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100">
        <input
          type="checkbox"
          checked={includePending}
          onChange={(e) => setIncludePending(e.target.checked)}
          className="rounded border-gray-300 mt-0.5"
        />
        <div>
          <div className="text-sm font-semibold text-gray-700">Include pending entries</div>
          <div className="text-xs text-gray-500 mt-0.5">
            By default only approved entries are exported. Toggle on to include entries awaiting review.
          </div>
        </div>
      </label>

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
          onClick={handleExport}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          {submitting ? 'Exporting…' : 'Download CSV'}
        </button>
      </div>
    </Modal>
  )
}
