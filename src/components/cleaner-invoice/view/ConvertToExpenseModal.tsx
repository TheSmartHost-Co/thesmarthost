'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/shared/modal'
import SearchableSelect, { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import { convertItemToExpense } from '@/services/cleanerInvoiceService'
import { getProperties } from '@/services/propertyService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import type { CleanerInvoiceItem } from '@/services/types/cleanerInvoice'
import type { Property } from '@/services/types/property'
import type { ExpenseCategory } from '@/services/types/expenseCategories'
import { DEFAULT_EXPENSE_CATEGORIES } from '@/services/types/expenseCategories'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  BanknotesIcon,
} from '@heroicons/react/24/outline'

interface ConvertToExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  item: CleanerInvoiceItem
  onConverted: (updatedItem: CleanerInvoiceItem) => void
}

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'etransfer', label: 'E-Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'unpaid', label: 'Unpaid' },
]

const ConvertToExpenseModal: React.FC<ConvertToExpenseModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  item,
  onConverted,
}) => {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((s) => s.showNotification)
  const { effectiveUserId } = usePermissions()

  // Form state
  const [propertyId, setPropertyId] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [paymentStatus, setPaymentStatus] = useState('paid')

  // Data state
  const [properties, setProperties] = useState<Property[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const propertyOptions: SearchableSelectOption<string>[] = useMemo(() => {
    return properties.map(property => ({
      value: property.id,
      label: property.listingName || property.address,
      secondaryLabel: property.listingName ? property.address : undefined,
    }))
  }, [properties])

  // Combined categories (user + defaults)
  const categoryOptions = useMemo(() => {
    const userCats = categories.map(c => ({ value: c.code, label: c.label }))
    const defaultCats = DEFAULT_EXPENSE_CATEGORIES
      .filter(dc => !categories.some(uc => uc.code === dc.code))
      .map(dc => ({ value: dc.code, label: dc.label }))
    return [...userCats, ...defaultCats]
  }, [categories])

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && effectiveUserId) {
      loadData()
      resetForm()
    }
  }, [isOpen, effectiveUserId])

  const loadData = async () => {
    if (!effectiveUserId) return
    setLoading(true)
    try {
      const [propertiesRes, categoriesRes] = await Promise.all([
        getProperties(effectiveUserId),
        getCategoriesByUserId(effectiveUserId),
      ])
      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data || [])
      }
      if (categoriesRes.status === 'success') {
        setCategories(categoriesRes.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setPropertyId(item.propertyId || '')
    setAmount(item.amount.toFixed(2))
    setCategory('')
    setVendorName('')
    setDescription(item.description || '')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setPaymentMethod('credit_card')
    setPaymentStatus('paid')
  }

  const handleSubmit = async () => {
    if (!propertyId) return
    setSubmitting(true)

    try {
      const parsedAmount = parseFloat(amount)
      const res = await convertItemToExpense(invoiceId, item.id, {
        propertyId,
        amount: parsedAmount !== item.amount ? parsedAmount : undefined,
        category: category || undefined,
        vendorName: vendorName.trim() || undefined,
        description: description.trim() !== item.description ? description.trim() || undefined : undefined,
        expenseDate: expenseDate || undefined,
        paymentMethod: paymentMethod || undefined,
        paymentStatus: paymentStatus || undefined,
      })

      if (res.status === 'success') {
        showNotification(t('convertedToExpense'), 'success')
        onConverted(res.data.invoiceItem)
        onClose()
      } else {
        showNotification(res.message || t('failedToConvert'), 'error')
      }
    } catch (err) {
      console.error('Error converting to expense:', err)
      showNotification(err instanceof Error ? err.message : t('errorConverting'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const amountChanged = parseFloat(amount) !== item.amount && amount !== ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-5 max-w-lg !w-11/12" zIndex={70}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pr-8">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <BanknotesIcon className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('convertToExpenseTitle')}</h2>
          <p className="text-[11px] text-gray-500">{t('convertToExpenseDescription')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {/* Property (required) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('selectProperty')} *</label>
              <SearchableSelect
                options={propertyOptions}
                value={propertyId || null}
                onChange={(value) => setPropertyId(value || '')}
                placeholder={t('selectProperty')}
                emptyText={t('noPropertiesFound')}
              />
              {!propertyId && (
                <p className="text-[10px] text-red-500 mt-0.5">{t('propertyRequired')}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('expenseAmount')}</label>
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
              {amountChanged && (
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {t('invoiceLineAmount', { amount: item.amount.toFixed(2) })}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('expenseCategory')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="">{t('selectCategory')}</option>
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Vendor + Description row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('expenseVendorName')}</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder={t('vendorNamePlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('expenseDescription')}</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Date + Payment row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('expenseDate')}</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('expensePaymentMethod')}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                >
                  {PAYMENT_METHODS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Status */}
            <div className="w-1/2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('expensePaymentStatus')}</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                {PAYMENT_STATUSES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
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
              disabled={submitting || !propertyId}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('converting')}
                </>
              ) : (
                <>
                  <BanknotesIcon className="h-3.5 w-3.5" />
                  {t('convertToExpense')}
                </>
              )}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

export default ConvertToExpenseModal
