'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ArrowPathRoundedSquareIcon,
  CheckBadgeIcon,
  FunnelIcon,
  XMarkIcon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  PaperClipIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import {
  getClientPortalExpenses,
  getClientPortalProperties,
} from '@/services/clientPortalService'
import PreviewClientExpenseModal from '@/components/client-portal/expense/PreviewClientExpenseModal'
import PreviewClientReceiptModal from '@/components/client-portal/receipt/PreviewClientReceiptModal'
import { parseLocalDate } from '@/utils/dateUtils'
import type {
  ClientPortalExpense,
  ClientPortalExpensePaymentStatus,
  ClientPortalProperty,
} from '@/services/types/clientPortal'

type SortField = 'expenseDate' | 'vendorName' | 'amount'
type SortDirection = 'asc' | 'desc'
interface SortConfig {
  field: SortField
  direction: SortDirection
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]

const PAYMENT_STATUS_COLORS: Record<ClientPortalExpensePaymentStatus, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  reimbursed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-700',
}

const formatCurrency = (value: number | null | undefined, currency = 'CAD') => {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value)
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—'
  return parseLocalDate(dateString).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function ClientExpensesPage() {
  const { t } = useTranslation('clientPortal')

  // Data
  const [expenses, setExpenses] = useState<ClientPortalExpense[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<ClientPortalProperty[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // UI state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'expenseDate',
    direction: 'desc',
  })
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [showSortPopover, setShowSortPopover] = useState(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  const sortPopoverRef = useRef<HTMLDivElement>(null)

  // Modal stack
  const [openExpenseId, setOpenExpenseId] = useState<string | null>(null)
  const [openReceiptId, setOpenReceiptId] = useState<string | null>(null)

  // Load properties once
  useEffect(() => {
    getClientPortalProperties()
      .then((res) => {
        if (res.status === 'success') setProperties(res.data)
      })
      .catch(() => {
        // Non-fatal — property filter will just stay empty
      })
  }, [])

  // Filter setters call setPage(1) directly so that filter+page state updates batch into one render.
  // Putting the reset in an effect would cause a stale first fetch with the old page value.

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getClientPortalExpenses({
        propertyId: propertyFilter || undefined,
        category: categoryFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: debouncedSearch || undefined,
        includeArchived,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })
      if (res.status === 'success') {
        setExpenses(res.data)
        setTotal(res.total)
      } else {
        setError(res.message || t('failedToLoadExpenses'))
        setExpenses([])
        setTotal(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToLoadExpenses'))
      setExpenses([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [
    debouncedSearch,
    startDate,
    endDate,
    propertyFilter,
    categoryFilter,
    includeArchived,
    page,
    pageSize,
    t,
  ])

  useEffect(() => {
    load()
  }, [load])

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilterPopover(false)
      }
      if (sortPopoverRef.current && !sortPopoverRef.current.contains(event.target as Node)) {
        setShowSortPopover(false)
      }
    }
    if (showFilterPopover || showSortPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterPopover, showSortPopover])

  // Derive category options from the current page (best-effort; user can also type-like filter via search)
  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    expenses.forEach((e) => {
      if (e.category) set.add(e.category)
    })
    return Array.from(set).sort()
  }, [expenses])

  const sorted = useMemo(() => {
    const { field, direction } = sortConfig
    const multiplier = direction === 'asc' ? 1 : -1
    return [...expenses].sort((a, b) => {
      switch (field) {
        case 'vendorName':
          return multiplier * (a.vendorName || '').localeCompare(b.vendorName || '')
        case 'expenseDate': {
          const aTime = a.expenseDate ? parseLocalDate(a.expenseDate).getTime() : 0
          const bTime = b.expenseDate ? parseLocalDate(b.expenseDate).getTime() : 0
          return multiplier * (aTime - bTime)
        }
        case 'amount':
          return multiplier * ((a.amount || 0) - (b.amount || 0))
        default:
          return 0
      }
    })
  }, [expenses, sortConfig])

  const stats = useMemo(() => {
    const totalSpend = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const recurringCount = expenses.filter((e) => e.isRecurring).length
    const deductibleTotal = expenses
      .filter((e) => e.isTaxDeductible)
      .reduce((s, e) => s + (e.amount || 0), 0)
    return { totalSpend, recurringCount, deductibleTotal }
  }, [expenses])

  const activeFiltersCount = [
    propertyFilter !== '',
    categoryFilter !== '',
    includeArchived,
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setPropertyFilter('')
    setCategoryFilter('')
    setIncludeArchived(false)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageNumbers = useMemo(() => {
    const max = 7
    if (totalPages <= max) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const half = Math.floor(max / 2)
    let start = Math.max(1, page - half)
    const end = Math.min(totalPages, start + max - 1)
    start = Math.max(1, end - max + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [page, totalPages])

  const SORT_OPTIONS: { field: SortField; label: string; ascLabel: string; descLabel: string }[] = [
    {
      field: 'expenseDate',
      label: t('date'),
      ascLabel: t('oldestFirst'),
      descLabel: t('newestFirst'),
    },
    { field: 'vendorName', label: t('vendor'), ascLabel: t('aToZ'), descLabel: t('zToA') },
    { field: 'amount', label: t('amount'), ascLabel: t('lowToHigh'), descLabel: t('highToLow') },
  ]

  const getCurrentSortLabel = () => {
    const option = SORT_OPTIONS.find((o) => o.field === sortConfig.field)
    if (!option) return t('sort')
    const directionLabel = sortConfig.direction === 'asc' ? option.ascLabel : option.descLabel
    return `${option.label}: ${directionLabel}`
  }

  const statCards = [
    {
      label: t('totalSpend'),
      value: formatCurrency(stats.totalSpend),
      icon: CurrencyDollarIcon,
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100',
    },
    {
      label: t('recurringExpenses'),
      value: stats.recurringCount,
      icon: ArrowPathRoundedSquareIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: t('taxDeductibleTotal'),
      value: formatCurrency(stats.deductibleTotal),
      icon: CheckBadgeIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('expensesTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('expensesSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} border ${stat.borderColor} rounded-2xl p-5 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">
                  {t('thisPage')}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all text-sm"
                placeholder={t('searchExpensesPlaceholder')}
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">{t('fromLabel')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setPage(1)
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">{t('toLabel')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setPage(1)
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white"
                />
              </div>

              <div className="relative" ref={sortPopoverRef}>
                <motion.button
                  onClick={() => setShowSortPopover(!showSortPopover)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {sortConfig.direction === 'desc' ? (
                    <BarsArrowDownIcon className="h-4 w-4 mr-2" />
                  ) : (
                    <BarsArrowUpIcon className="h-4 w-4 mr-2" />
                  )}
                  <span className="hidden sm:inline">{getCurrentSortLabel()}</span>
                  <span className="sm:hidden">{t('sort')}</span>
                </motion.button>
                {showSortPopover && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-900">{t('sortBy')}</h3>
                        <button
                          onClick={() => setShowSortPopover(false)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {SORT_OPTIONS.map((option) => {
                          const isSelected = sortConfig.field === option.field
                          return (
                            <div key={option.field} className="space-y-1">
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 pt-2">
                                {option.label}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSortConfig({ field: option.field, direction: 'asc' })
                                    setShowSortPopover(false)
                                  }}
                                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                                    isSelected && sortConfig.direction === 'asc'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {option.ascLabel}
                                </button>
                                <button
                                  onClick={() => {
                                    setSortConfig({ field: option.field, direction: 'desc' })
                                    setShowSortPopover(false)
                                  }}
                                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                                    isSelected && sortConfig.direction === 'desc'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {option.descLabel}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="relative" ref={filterPopoverRef}>
                <motion.button
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  {t('filters')}
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-emerald-600 rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </motion.button>
                {showFilterPopover && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-900">{t('filters')}</h3>
                        <button
                          onClick={() => setShowFilterPopover(false)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('propertyColumn')}
                          </label>
                          <select
                            value={propertyFilter}
                            onChange={(e) => {
                              setPropertyFilter(e.target.value)
                              setPage(1)
                            }}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white"
                          >
                            <option value="">{t('allProperties')}</option>
                            {properties.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.listingName || p.address || p.id}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('category')}
                          </label>
                          <select
                            value={categoryFilter}
                            onChange={(e) => {
                              setCategoryFilter(e.target.value)
                              setPage(1)
                            }}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white"
                          >
                            <option value="">{t('allCategories')}</option>
                            {categoryOptions.map((c) => (
                              <option key={c} value={c}>
                                {titleCase(c.replace(/_/g, ' '))}
                              </option>
                            ))}
                          </select>
                          {categoryOptions.length === 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {t('categoriesDerivedFromPage')}
                            </p>
                          )}
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeArchived}
                            onChange={(e) => {
                              setIncludeArchived(e.target.checked)
                              setPage(1)
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-700">{t('showCancelled')}</span>
                        </label>
                      </div>
                      {activeFiltersCount > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <button
                            onClick={clearAllFilters}
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            {t('clearAllFilters')}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && !loading && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-100"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              {t('tryAgain')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">{t('loadingExpenses')}</p>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BanknotesIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('noExpensesFound')}</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              {search ||
              propertyFilter ||
              categoryFilter ||
              includeArchived ||
              startDate ||
              endDate
                ? t('adjustSearchOrFilters')
                : t('noExpensesAvailable')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[240px]">
                    {t('vendorAndDate')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">
                    {t('propertyColumn')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                    {t('category')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                    {t('status')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                    {t('amount')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((e, index) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index, 30) * 0.03 }}
                    onClick={() => setOpenExpenseId(e.id)}
                    className={`hover:bg-emerald-50/50 cursor-pointer transition-colors ${
                      e.paymentStatus === 'cancelled' ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 flex items-center gap-1.5">
                        {e.vendorName || t('unknownVendor')}
                        {e.receipt && (
                          <PaperClipIcon className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        {e.isRecurring && (
                          <ArrowPathRoundedSquareIcon className="w-3.5 h-3.5 text-purple-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(e.expenseDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700 truncate max-w-[220px]">
                        {e.propertyName || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {e.category ? titleCase(e.category.replace(/_/g, ' ')) : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          PAYMENT_STATUS_COLORS[e.paymentStatus] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {titleCase(e.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(e.amount, e.currency)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="text-xs text-gray-500">
              {t('showingRange', {
                from: (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, total),
                total,
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  {t('previous')}
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`px-2.5 py-1 text-xs rounded ${
                      n === page ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  {t('next')}
                </button>
              </div>
            )}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="px-2 py-1 text-xs border border-gray-200 rounded"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} {t('perPage')}
                </option>
              ))}
            </select>
          </div>
        )}
      </motion.div>

      {openExpenseId && (
        <PreviewClientExpenseModal
          expenseId={openExpenseId}
          isOpen
          onClose={() => {
            // Closing the base modal also dismisses any stacked receipt modal.
            setOpenExpenseId(null)
            setOpenReceiptId(null)
          }}
          onOpenReceipt={(id) => setOpenReceiptId(id)}
        />
      )}
      {openReceiptId && (
        <PreviewClientReceiptModal
          receiptId={openReceiptId}
          isOpen
          onClose={() => setOpenReceiptId(null)}
          onOpenExpense={(id) => setOpenExpenseId(id)}
          zIndex={70}
        />
      )}
    </div>
  )
}
