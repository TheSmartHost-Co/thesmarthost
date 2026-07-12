'use client'

import { notifyError } from '@/utils/notify'
import React, { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import { addInvoiceItem } from '@/services/cleanerInvoiceService'
import type { CleanerInvoiceItem } from '@/services/types/cleanerInvoice'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  PlusIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

interface AddExtraChargeModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  onAdded: (item: CleanerInvoiceItem) => void
  defaultTaxable?: boolean
}

const AddExtraChargeModal: React.FC<AddExtraChargeModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  onAdded,
  defaultTaxable = false,
}) => {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((s) => s.showNotification)

  // Charge form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isTaxable, setIsTaxable] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setDescription('')
      setAmount('')
      setNotes('')
      setIsTaxable(defaultTaxable)
      setSubmitting(false)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!description.trim() || !amount) return
    setSubmitting(true)

    try {
      const res = await addInvoiceItem(invoiceId, {
        description: description.trim(),
        amount: parseFloat(amount),
        notes: notes.trim() || undefined,
        isTaxable,
      })

      if (res.status === 'success') {
        showNotification(t('extraChargeAdded'), 'success')
        onAdded(res.data)
        onClose()
      } else {
        showNotification(res.message || t('failedToAddExtraCharge'), 'error')
      }
    } catch (err) {
      console.error('Error adding extra charge:', err)
      notifyError(err, t('errorAddingExtraCharge'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-5 max-w-lg !w-11/12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pr-8">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <PlusIcon className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('addExtraChargeTitle')}</h2>
          <p className="text-[11px] text-gray-500">{t('addExtraChargeDescription')}</p>
        </div>
      </div>

      {/* Charge Details */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('chargeDescription')} *</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('chargeDescriptionPlaceholder')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-3">
          <div className="w-1/3">
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('chargeAmount')} *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('notes')}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesOptionalPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Taxable Toggle */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setIsTaxable(!isTaxable)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            isTaxable
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
        >
          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
            isTaxable ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
          }`}>
            {isTaxable && <CheckIcon className="h-2.5 w-2.5 text-white" />}
          </div>
          {t('taxable')}
        </button>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !description.trim() || !amount}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('addingCharge')}
            </>
          ) : (
            <>
              <PlusIcon className="h-3.5 w-3.5" />
              {t('addCharge')}
            </>
          )}
        </button>
      </div>
    </Modal>
  )
}

export default AddExtraChargeModal
