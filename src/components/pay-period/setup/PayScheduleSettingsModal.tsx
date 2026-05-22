'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { upsertPayScheduleSettings } from '@/services/payPeriodService'
import type {
  Cadence,
  PayScheduleSettings,
  PayScheduleSettingsPayload,
} from '@/services/types/payPeriod'

interface Props {
  isOpen: boolean
  onClose: () => void
  existing: PayScheduleSettings | null
  onSaved: (settings: PayScheduleSettings) => void
}

const CADENCES: Array<{ value: Cadence; label: string; days: number }> = [
  { value: 'weekly',   label: 'Weekly',   days: 7 },
  { value: 'biweekly', label: 'Biweekly', days: 14 },
  { value: 'monthly',  label: 'Monthly',  days: 30 },
]

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP']

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function PayScheduleSettingsModal({ isOpen, onClose, existing, onSaved }: Props) {
  const showNotification = useNotificationStore(s => s.showNotification)
  const isEdit = !!existing

  const [cadence, setCadence] = useState<Cadence>(existing?.cadence ?? 'biweekly')
  const [anchorDate, setAnchorDate] = useState<string>(existing?.anchorDate ?? todayIso())
  const [payDateOffsetDays, setPayDateOffsetDays] = useState<number>(existing?.payDateOffsetDays ?? 2)
  const [currency, setCurrency] = useState<string>(existing?.currency ?? 'CAD')
  const [isActive, setIsActive] = useState<boolean>(existing?.isActive ?? true)
  const [submitting, setSubmitting] = useState(false)

  // Reset form when reopened so an aborted edit doesn't bleed into the next open.
  useEffect(() => {
    if (!isOpen) return
    setCadence(existing?.cadence ?? 'biweekly')
    setAnchorDate(existing?.anchorDate ?? todayIso())
    setPayDateOffsetDays(existing?.payDateOffsetDays ?? 2)
    setCurrency(existing?.currency ?? 'CAD')
    setIsActive(existing?.isActive ?? true)
    setSubmitting(false)
  }, [isOpen, existing])

  // Compute the first period-end (anchor + cadence length − 1 day) and the
  // resulting pay date for the inline preview. Pure date math, no Date().
  const preview = useMemo(() => {
    if (!anchorDate) return null
    const lengthDays = CADENCES.find(c => c.value === cadence)?.days ?? 14
    const [y, m, d] = anchorDate.split('-').map(Number)
    if (!y || !m || !d) return null
    const start = Date.UTC(y, m - 1, d)
    const end = new Date(start + (lengthDays - 1) * 86_400_000)
    const pay = new Date(end.getTime() + payDateOffsetDays * 86_400_000)
    const fmt = (dt: Date) => dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    return { end: fmt(end), pay: fmt(pay) }
  }, [anchorDate, cadence, payDateOffsetDays])

  const canSubmit = !!cadence && !!anchorDate && payDateOffsetDays >= 0 && payDateOffsetDays <= 30 && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const payload: PayScheduleSettingsPayload = {
        cadence,
        anchorDate,
        payDateOffsetDays,
        currency,
        isActive,
      }
      const res = await upsertPayScheduleSettings(payload)
      if (res.status === 'success' && res.data) {
        showNotification(
          isEdit ? 'Pay schedule updated.' : 'Schedule saved. Period #1 is ready.',
          'success',
        )
        onSaved(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to save schedule.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-xl w-11/12">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Schedule settings' : 'Set up your pay schedule'}
          </h2>
          <p className="text-sm text-gray-500">
            Configure cadence + anchor date — periods generate automatically from there.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Cadence */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cadence</label>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Cadence">
            {CADENCES.map(c => {
              const selected = cadence === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCadence(c.value)}
                  className={`rounded-xl py-2.5 text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                      : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Anchor date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="anchor-date">
            Anchor date
          </label>
          <input
            id="anchor-date"
            type="date"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Your first period starts on this date.</p>
        </div>

        {/* Pay-date offset */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="offset">
            Pay-date offset (days after period end)
          </label>
          <input
            id="offset"
            type="number"
            min={0}
            max={30}
            step={1}
            value={payDateOffsetDays}
            onChange={(e) => setPayDateOffsetDays(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {preview && (
            <p className="text-xs text-gray-600 mt-2">
              Preview: period ends <span className="font-medium">{preview.end}</span> →
              pay date <span className="font-medium text-blue-700">{preview.pay}</span>
            </p>
          )}
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="currency">
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Active toggle (only relevant once configured) */}
        {isEdit && (
          <div className="pt-2 border-t border-gray-100">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <div>
                <div className="text-sm font-semibold text-gray-700">Schedule is active</div>
                <div className="text-xs text-gray-500">
                  Disable to pause automatic period generation. Existing periods remain.
                </div>
              </div>
            </label>
          </div>
        )}
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
          {submitting ? 'Saving…' : (isEdit ? 'Save changes' : 'Save schedule')}
        </button>
      </div>
    </Modal>
  )
}
