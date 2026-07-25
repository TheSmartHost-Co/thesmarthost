'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/shared/modal'
import SearchableSelect, { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import { convertItemToExpense } from '@/services/cleanerInvoiceService'
import { getProperties } from '@/services/propertyService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import { getCleaners } from '@/services/cleanerService'
import { getTeamMembers } from '@/services/teamMemberService'
import { getUserProfile } from '@/services/profileService'
import type { CleanerInvoiceItem } from '@/services/types/cleanerInvoice'
import type { Property } from '@/services/types/property'
import type { ExpenseCategory } from '@/services/types/expenseCategories'
import { getCategoryByCode } from '@/services/types/expenseCategories'
import type { PaidByType } from '@/services/types/receipt'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { usePermissions } from '@/hooks/usePermissions'
import { formatLocalDate } from '@/utils/dateUtils'
import {
  BanknotesIcon,
} from '@heroicons/react/24/outline'

interface ConvertToExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  item: CleanerInvoiceItem
  onConverted: (updatedItem: CleanerInvoiceItem) => void
  role?: 'cleaner' | 'pm'
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
  role = 'pm',
}) => {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((s) => s.showNotification)
  const { effectiveUserId } = usePermissions()
  const { profile } = useUserStore()

  // Form state
  const [propertyId, setPropertyId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('CAD')
  const [category, setCategory] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [paymentStatus, setPaymentStatus] = useState('paid')

  // Financial flags
  const [isReimbursable, setIsReimbursable] = useState(false)
  const [isTaxDeductible, setIsTaxDeductible] = useState(false)

  // Paid By state
  const [paidById, setPaidById] = useState<string | null>(null)
  const [paidByType, setPaidByType] = useState<PaidByType>(role === 'cleaner' ? 'CLEANER' : 'PROPERTY-MANAGER')
  const [peopleOptions, setPeopleOptions] = useState<SearchableSelectOption<string>[]>([])
  const [peopleTypeMap, setPeopleTypeMap] = useState<Record<string, PaidByType>>({})

  // Tax breakdown state
  const [subtotal, setSubtotal] = useState('')
  const [taxGst, setTaxGst] = useState('')
  const [taxPst, setTaxPst] = useState('')
  const [taxHst, setTaxHst] = useState('')
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false)

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

  // Categories from API; backend lazy-seeds canonical defaults so this is
  // guaranteed to contain the standard list once loadData() resolves.
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.code, label: c.label })),
    [categories]
  )

  const getCategoryColor = (categoryCode: string) => {
    const catInfo = getCategoryByCode(categoryCode, categories)
    return catInfo?.colorHex || '#6B7280'
  }

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && effectiveUserId) {
      loadData()
    }
  }, [isOpen, effectiveUserId])

  // Reset the form on every open regardless of effectiveUserId timing, so
  // stale values from a previously viewed item never survive
  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item.id])

  const loadData = async () => {
    if (!effectiveUserId) return
    setLoading(true)
    try {
      const [propertiesRes, categoriesRes, tmRes, clRes] = await Promise.all([
        getProperties(effectiveUserId),
        getCategoriesByUserId(effectiveUserId),
        getTeamMembers(effectiveUserId).catch(() => null),
        getCleaners(effectiveUserId).catch(() => null),
      ])

      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data || [])
      }
      if (categoriesRes.status === 'success') {
        setCategories(categoriesRes.data || [])
      }

      // Build people picker options (mirrors CreateExpenseModal)
      if (profile?.id) {
        const roleLabel = (r: string) => r === 'CLEANER' ? 'Cleaner' : r === 'TEAM_MEMBER' ? 'Team Member' : 'PM'
        const roleType = (r: string): PaidByType => r === 'CLEANER' ? 'CLEANER' : r === 'TEAM_MEMBER' ? 'TEAM_MEMBER' : 'PROPERTY-MANAGER'
        const opts: SearchableSelectOption<string>[] = []
        const typeMap: Record<string, PaidByType> = {}
        opts.push({ value: profile.id, label: `${profile.fullName} (You)`, secondaryLabel: roleLabel(profile.role) })
        typeMap[profile.id] = roleType(profile.role)

        // Add PM if current user is not the PM
        const pmUserId = effectiveUserId !== profile.id ? effectiveUserId : null
        if (pmUserId) {
          try {
            const pmRes = await getUserProfile(pmUserId)
            if (pmRes.status === 'success' && pmRes.data) {
              opts.push({ value: pmRes.data.id, label: pmRes.data.fullName, secondaryLabel: 'PM' })
              typeMap[pmRes.data.id] = 'PROPERTY-MANAGER'
            }
          } catch { /* non-critical */ }
        }
        if (tmRes?.status === 'success') {
          tmRes.data.filter(tm => tm.status === 'active' && tm.authUserId && tm.authUserId !== profile.id).forEach(tm => {
            opts.push({ value: tm.authUserId!, label: tm.name, secondaryLabel: 'Team Member' })
            typeMap[tm.authUserId!] = 'TEAM_MEMBER'
          })
        }
        if (clRes?.status === 'success') {
          clRes.data.filter(cl => cl.status === 'active' && cl.authUserId && cl.authUserId !== profile.id).forEach(cl => {
            opts.push({ value: cl.authUserId!, label: cl.name, secondaryLabel: 'Cleaner' })
            typeMap[cl.authUserId!] = 'CLEANER'
          })
        }
        setPeopleOptions(opts)
        setPeopleTypeMap(typeMap)
        setPaidById(profile.id)
        setPaidByType(typeMap[profile.id])
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
    setCurrency('CAD')
    setCategory('')
    setVendorName('')
    setDescription(item.description || '')
    setExpenseDate(item.projectDate ? item.projectDate.split('T')[0] : formatLocalDate(new Date()))
    setPaymentMethod('credit_card')
    setPaymentStatus('paid')
    setIsReimbursable(false)
    setIsTaxDeductible(false)
    setPaidByType(role === 'cleaner' ? 'CLEANER' : 'PROPERTY-MANAGER')
    setPaidById(profile?.id || null)
    setSubtotal('')
    setTaxGst('')
    setTaxPst('')
    setTaxHst('')
    setShowTaxBreakdown(false)
  }

  const handleSubmit = async () => {
    if (!propertyId || !expenseDate) return
    setSubmitting(true)

    try {
      const parsedAmount = parseFloat(amount)
      const gst = parseFloat(taxGst) || 0
      const pst = parseFloat(taxPst) || 0
      const hst = parseFloat(taxHst) || 0
      const taxTotal = gst + pst + hst

      const res = await convertItemToExpense(invoiceId, item.id, {
        propertyId,
        amount: parsedAmount !== item.amount ? parsedAmount : undefined,
        category: category || undefined,
        vendorName: vendorName.trim() || undefined,
        description: description.trim() !== item.description ? description.trim() || undefined : undefined,
        expenseDate: expenseDate || undefined,
        paymentMethod: paymentMethod || undefined,
        paymentStatus: paymentStatus || undefined,
        isReimbursable: isReimbursable || undefined,
        isTaxDeductible: isTaxDeductible || undefined,
        paidById: paidById || undefined,
        paidByType: paidByType || undefined,
        currency: currency !== 'CAD' ? currency : undefined,
        subtotal: parseFloat(subtotal) || undefined,
        taxGst: gst || undefined,
        taxPst: pst || undefined,
        taxHst: hst || undefined,
        taxTotal: taxTotal || undefined,
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
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl !w-11/12" zIndex={70}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5 pr-8">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <BanknotesIcon className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('convertToExpenseTitle')}</h2>
          <p className="text-[11px] text-gray-500">{t('convertToExpenseDescription')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-5 mb-5">
            {/* Property + Amount + Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectProperty')} *</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseAmount')} *</label>
                <div className="flex">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="border border-gray-300 rounded-l-lg px-2 py-2 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 border border-l-0 border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                {amountChanged && (
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    {t('invoiceLineAmount', { amount: item.amount.toFixed(2) })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseDate')} *</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {!expenseDate && (
                  <p className="text-[10px] text-red-500 mt-0.5">{t('chargeDateRequired')}</p>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseCategory')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                style={{
                  borderLeftWidth: category ? '4px' : '1px',
                  borderLeftColor: category ? getCategoryColor(category) : undefined
                }}
              >
                <option value="">{t('noCategoryIncomplete')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.code}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Vendor + Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseVendorName')}</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder={t('vendorNamePlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseDescription')}</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expensePaymentMethod')}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {PAYMENT_METHODS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expensePaymentStatus')}</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {PAYMENT_STATUSES.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Paid By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('paidByLabel')}</label>
              <SearchableSelect
                options={peopleOptions}
                value={paidById}
                onChange={(val) => {
                  setPaidById(val)
                  if (val && peopleTypeMap[val]) {
                    setPaidByType(peopleTypeMap[val])
                  }
                }}
                placeholder={t('selectPaidBy')}
                loading={peopleOptions.length === 0}
                loadingText={t('loadingPeople')}
                emptyText={t('noPeopleFound')}
              />
            </div>

            {/* Financial Flags */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReimbursable}
                  onChange={(e) => setIsReimbursable(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">{t('reimbursableLabel')}</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTaxDeductible}
                  onChange={(e) => setIsTaxDeductible(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">{t('taxDeductibleLabel')}</span>
              </label>
            </div>

            {/* Tax Breakdown (Optional) */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                className="w-full px-4 py-3 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">{t('taxBreakdownOptional')}</span>
                <span className={`transform transition-transform ${showTaxBreakdown ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {showTaxBreakdown && (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-gray-500">Enter tax amounts if you want to track them separately</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('subtotalLabel')}</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={subtotal}
                          onChange={(e) => setSubtotal(e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('taxGstLabel')}</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={taxGst}
                          onChange={(e) => setTaxGst(e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('taxPstLabel')}</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={taxPst}
                          onChange={(e) => setTaxPst(e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('taxHstLabel')}</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={taxHst}
                          onChange={(e) => setTaxHst(e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                  {(parseFloat(taxGst) > 0 || parseFloat(taxPst) > 0 || parseFloat(taxHst) > 0) && (
                    <div className="text-right text-sm text-gray-600">
                      {t('totalTaxLabel')}: <span className="font-medium">${((parseFloat(taxGst) || 0) + (parseFloat(taxPst) || 0) + (parseFloat(taxHst) || 0)).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !propertyId || !expenseDate}
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
