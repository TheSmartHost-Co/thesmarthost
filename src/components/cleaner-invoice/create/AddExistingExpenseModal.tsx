'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import { addInvoiceItem, getAvailableExpenses } from '@/services/cleanerInvoiceService'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { AvailableExpense, CleanerInvoiceItem } from '@/services/types/cleanerInvoice'
import {
  BanknotesIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

interface AddExistingExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  cleanerId: string
  onAdded: (item: CleanerInvoiceItem) => void
}

const AddExistingExpenseModal: React.FC<AddExistingExpenseModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  cleanerId,
  onAdded,
}) => {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((s) => s.showNotification)

  const [availableExpenses, setAvailableExpenses] = useState<AvailableExpense[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadExpenses()
      setSelectedExpenseId(null)
    }
  }, [isOpen])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const res = await getAvailableExpenses(cleanerId)
      if (res.status === 'success') setAvailableExpenses(res.data)
    } catch (err) {
      console.error('Error loading available expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatAmount = (amount: number | null | undefined) => {
    if (amount == null) return '$0.00'
    return `$${Number(amount).toFixed(2)}`
  }

  const handleSubmit = async () => {
    if (!selectedExpenseId) return
    setSubmitting(true)

    try {
      const res = await addInvoiceItem(invoiceId, { expenseId: selectedExpenseId })
      if (res.status === 'success') {
        showNotification(t('expenseAddedToInvoice'), 'success')
        onAdded(res.data)
        onClose()
      } else {
        showNotification(res.message || t('failedToAddExpense'), 'error')
      }
    } catch (err) {
      console.error('Error adding expense:', err)
      showNotification(err instanceof Error ? err.message : t('failedToAddExpense'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-5 max-w-lg !w-11/12" zIndex={70}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pr-8">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <BanknotesIcon className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('addExistingExpenseTitle')}</h2>
          <p className="text-[11px] text-gray-500">{t('addExistingExpenseDescription')}</p>
        </div>
      </div>

      {/* Expense List */}
      <div className="mb-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : availableExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <BanknotesIcon className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-0.5">{t('noAvailableExpenses')}</p>
            <p className="text-xs text-gray-500 max-w-xs">{t('noAvailableExpensesDescription')}</p>
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-1 rounded-lg border border-gray-100 p-1">
            {availableExpenses.map((expense) => {
              const isSelected = selectedExpenseId === expense.id
              return (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => setSelectedExpenseId(isSelected ? null : expense.id)}
                  className={`w-full text-left flex items-center gap-2.5 p-2.5 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 border border-amber-300 ring-1 ring-amber-300'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    <BanknotesIcon className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-amber-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-medium truncate ${isSelected ? 'text-amber-900' : 'text-gray-900'}`}>
                        {expense.vendorName || t('unknownVendor')}
                      </p>
                      {expense.receiptId && (
                        <DocumentTextIcon className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {expense.propertyName && (
                        <span className="text-[10px] text-gray-400 truncate">{expense.propertyName}</span>
                      )}
                      {expense.propertyName && expense.expenseDate && (
                        <span className="text-[10px] text-gray-300">&middot;</span>
                      )}
                      {expense.expenseDate && (
                        <span className="text-[10px] text-gray-400">{formatDate(expense.expenseDate)}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                    {formatAmount(expense.amount)}
                  </span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
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
          disabled={!selectedExpenseId || submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('addingToInvoice')}
            </>
          ) : (
            <>
              <BanknotesIcon className="h-3.5 w-3.5" />
              {t('addToInvoice')}
            </>
          )}
        </button>
      </div>
    </Modal>
  )
}

export default AddExistingExpenseModal
