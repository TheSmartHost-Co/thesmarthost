'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { makeTaskOffer } from '@/services/maintenanceTaskService'
import type { MaintenanceTask, PricingType } from '@/services/types/maintenanceTask'

export interface ModifyTaskPriceModalProps {
  isOpen: boolean
  onClose: () => void
  task: MaintenanceTask
  mode: 'propose' | 'counter'
  onSubmitted: (task: MaintenanceTask) => void
}

/**
 * Contractor-side price negotiation modal.
 * - mode 'propose': first price proposal (task is awaiting_proposal)
 * - mode 'counter': counter the PM's standing offer (shows current offer)
 */
const ModifyTaskPriceModal: React.FC<ModifyTaskPriceModalProps> = ({
  isOpen,
  onClose,
  task,
  mode,
  onSubmitted,
}) => {
  const { t } = useTranslation('contractorPortal')
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [amount, setAmount] = useState('')
  const [pricingType, setPricingType] = useState<PricingType>('flat')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setAmount('')
      setPricingType(task.pricingType || 'flat')
      setNote('')
      setSubmitting(false)
    }
  }, [isOpen, task.pricingType])

  const currentOfferLabel =
    mode === 'counter' && task.offeredAmount != null
      ? `$${Number(task.offeredAmount).toFixed(2)}${task.pricingType === 'hourly' ? t('hourlySuffix') : ` ${t('flatSuffix')}`}`
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      showNotification(t('invalidAmount'), 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await makeTaskOffer(task.id, {
        pricingType,
        amount: parsed,
        note: note.trim() || undefined,
      })
      if (res.status === 'success') {
        showNotification(t('offerSent'), 'success')
        onSubmitted(res.data)
        onClose()
      } else {
        showNotification(res.message || t('actionFailed'), 'error')
      }
    } catch (err) {
      console.error('Error sending offer:', err)
      showNotification(err instanceof Error ? err.message : t('actionFailed'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-11/12 max-w-md">
      <form onSubmit={handleSubmit} className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <CurrencyDollarIcon className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'propose' ? t('proposeYourPrice') : t('counterTheOffer')}
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {mode === 'propose' ? t('proposeDescription') : t('counterDescription')}
        </p>

        {/* Task context */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-gray-900 line-clamp-1">{task.title}</p>
          {task.propertyName && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.propertyName}</p>
          )}
          {currentOfferLabel && (
            <p className="text-sm text-amber-700 font-semibold mt-2">
              {t('currentOffer')}: {currentOfferLabel}
            </p>
          )}
        </div>

        {/* Pricing type toggle */}
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('pricingTypeLabel')}
        </label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['flat', 'hourly'] as PricingType[]).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setPricingType(type)}
              className={`
                min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer
                ${pricingType === type
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}
              `}
            >
              {type === 'flat' ? t('flatRate') : t('hourlyRate')}
            </button>
          ))}
        </div>

        {/* Amount */}
        <label htmlFor="offer-amount" className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('amountLabel')} {pricingType === 'hourly' ? `(${t('perHour')})` : ''}
        </label>
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
          <input
            id="offer-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Note */}
        <label htmlFor="offer-note" className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('noteOptional')}
        </label>
        <textarea
          id="offer-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('notePlaceholder')}
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
        />

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {mode === 'propose' ? t('submitProposal') : t('submitCounter')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ModifyTaskPriceModal
