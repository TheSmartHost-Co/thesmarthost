'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getProperties } from '@/services/propertyService'
import { getBookings } from '@/services/bookingService'
import {
  getExpenses,
  getExpenseSummary,
  formatCurrency,
  formatExpenseDate
} from '@/services/expenseService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import type { Expense, ExpenseTotals, PaymentStatus } from '@/services/types/expense'
import type { ExpenseCategory } from '@/services/types/expenseCategories'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  DocumentTextIcon,
  ClockIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  EyeIcon,
  ReceiptRefundIcon,
  CameraIcon
} from '@heroicons/react/24/outline'
import CreateExpenseModal from '@/components/expenses/create/CreateExpenseModal'
import ExpenseViewerModal from '@/components/expenses/ExpenseViewerModal'
import ExpenseCategoriesModal from '@/components/expenses/categories/ExpenseCategoriesModal'
import ScanReceiptModal from '@/components/expenses/scan/ScanReceiptModal'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'

const PAYMENT_STATUSES: { value: PaymentStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'reimbursed', label: 'Reimbursed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function ExpensesPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [totals, setTotals] = useState<ExpenseTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<PaymentStatus | ''>('')
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewerModal, setShowViewerModal] = useState(false)
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [selectedExpenseId, setSelectedExpenseId] = useState('')

  // Load initial data
  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id])

  // Reload expenses when filters change
  useEffect(() => {
    if (profile?.id) {
      loadExpenses()
    }
  }, [selectedPropertyId, selectedBookingId, selectedCategory, filterStartDate, filterEndDate, filterPaymentStatus])

  // Load bookings when property changes
  useEffect(() => {
    if (selectedPropertyId && profile?.id) {
      loadBookingsForProperty(selectedPropertyId)
    } else {
      setBookings([])
      setSelectedBookingId('')
    }
  }, [selectedPropertyId, profile?.id])

  // Close filter popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilterPopover(false)
      }
    }

    if (showFilterPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterPopover])

  const loadData = async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      const [propertiesRes, categoriesRes, expensesRes, summaryRes] = await Promise.all([
        getProperties(profile.id),
        getCategoriesByUserId(profile.id),
        getExpenses({ userId: profile.id }),
        getExpenseSummary(profile.id, 'category'),
      ])

      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data || [])
      }

      if (categoriesRes.status === 'success') {
        setCategories(categoriesRes.data || [])
      }

      if (expensesRes.status === 'success') {
        setExpenses(expensesRes.data || [])
      } else {
        setError(expensesRes.message || 'Failed to load expenses')
      }

      if (summaryRes.status === 'success') {
        setTotals(summaryRes.data.totals)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadExpenses = async () => {
    if (!profile?.id) return

    try {
      const [expensesRes, summaryRes] = await Promise.all([
        getExpenses({
          userId: profile.id,
          propertyId: selectedPropertyId || undefined,
          bookingId: selectedBookingId || undefined,
          category: selectedCategory || undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
          paymentStatus: filterPaymentStatus || undefined,
        }),
        getExpenseSummary(
          profile.id,
          'category',
          selectedPropertyId || undefined,
          filterStartDate || undefined,
          filterEndDate || undefined
        ),
      ])

      if (expensesRes.status === 'success') {
        setExpenses(expensesRes.data || [])
        setCurrentPage(1)
      } else {
        showNotification(expensesRes.message || 'Failed to load expenses', 'error')
      }

      if (summaryRes.status === 'success') {
        setTotals(summaryRes.data.totals)
      }
    } catch (err) {
      console.error('Error loading expenses:', err)
      showNotification('Failed to load expenses', 'error')
    }
  }

  const loadBookingsForProperty = async (propertyId: string) => {
    if (!profile?.id) return

    try {
      const res = await getBookings({ userId: profile.id, propertyId })
      if (res.status === 'success') {
        setBookings(res.data || [])
      }
    } catch (err) {
      console.error('Error loading bookings:', err)
    }
  }

  const handleViewExpense = (expenseId: string) => {
    setSelectedExpenseId(expenseId)
    setShowViewerModal(true)
  }

  const handleExpenseAdded = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev])
    loadExpenses() // Refresh to get updated totals
  }

  const handleExpenseUpdated = () => {
    loadExpenses()
  }

  const handleExpenseDeleted = (expenseId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId))
    loadExpenses() // Refresh to get updated totals
  }

  const handleCategoryUpdate = () => {
    if (profile?.id) {
      getCategoriesByUserId(profile.id).then(res => {
        if (res.status === 'success') {
          setCategories(res.data || [])
        }
      })
    }
  }

  const clearFilters = () => {
    setSelectedPropertyId('')
    setSelectedBookingId('')
    setSelectedCategory('')
    setFilterStartDate('')
    setFilterEndDate('')
    setFilterPaymentStatus('')
    setCurrentPage(1)
  }

  const getExpenseActions = (expense: Expense): ActionItem[] => [
    {
      label: 'View Details',
      icon: EyeIcon,
      onClick: () => handleViewExpense(expense.id),
      variant: 'default'
    },
  ]

  const getCategoryLabel = (code: string) => {
    const cat = categories.find(c => c.code === code)
    return cat?.label || code
  }

  const getCategoryColor = (code: string) => {
    const cat = categories.find(c => c.code === code)
    return cat?.colorHex || '#6B7280'
  }

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const colors: Record<PaymentStatus, string> = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      reimbursed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-gray-100 text-gray-500',
    }
    return colors[status] || 'bg-gray-100 text-gray-500'
  }

  // Filter by search term (client-side)
  const filteredExpenses = expenses.filter(expense => {
    const searchLower = searchTerm.toLowerCase()
    return (
      expense.vendorName?.toLowerCase().includes(searchLower) ||
      expense.description?.toLowerCase().includes(searchLower) ||
      expense.category.toLowerCase().includes(searchLower) ||
      expense.propertyName?.toLowerCase().includes(searchLower)
    )
  })

  // Pagination
  const totalItems = filteredExpenses.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex)

  // Active filters count
  const activeFiltersCount = [
    selectedPropertyId !== '',
    selectedBookingId !== '',
    selectedCategory !== '',
    filterStartDate !== '',
    filterEndDate !== '',
    filterPaymentStatus !== '',
  ].filter(Boolean).length

  // Stats cards
  const statCards = [
    {
      label: 'Total Expenses',
      value: formatCurrency(totals?.totalAmount || 0),
      subValue: `${totals?.totalCount || 0} expenses`,
      icon: CurrencyDollarIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      label: 'Reimbursable',
      value: formatCurrency(totals?.reimbursableAmount || 0),
      subValue: 'Amount to recover',
      icon: ReceiptRefundIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100'
    },
    {
      label: 'Tax Deductible',
      value: formatCurrency(totals?.taxDeductibleAmount || 0),
      subValue: 'For tax purposes',
      icon: ReceiptPercentIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      label: 'Pending',
      value: formatCurrency(
        expenses.filter(e => e.paymentStatus === 'pending').reduce((sum, e) => sum + e.amount, 0)
      ),
      subValue: `${expenses.filter(e => e.paymentStatus === 'pending').length} pending`,
      icon: ClockIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-500 mt-1">Track and manage property expenses</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading expenses...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-500 mt-1">Track and manage property expenses</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading expenses</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 mt-1">Track and manage property expenses</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            onClick={() => setShowCategoriesModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-colors"
          >
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
            Categories
          </motion.button>
          <motion.button
            onClick={() => setShowScanModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-colors"
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            Scan Receipt
          </motion.button>
          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Expense
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} border ${stat.borderColor} rounded-2xl p-5 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.subValue}</p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search, Filters & Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Search and Filters */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                placeholder="Search by vendor, description, category..."
              />
            </div>

            {/* Filter Button with Popover */}
            <div className="relative" ref={filterPopoverRef}>
              <motion.button
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
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
                      <h3 className="text-base font-semibold text-gray-900">Filters</h3>
                      <button
                        onClick={() => setShowFilterPopover(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Property Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                        <select
                          value={selectedPropertyId}
                          onChange={(e) => setSelectedPropertyId(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          <option value="">All Properties</option>
                          {properties.map((property) => (
                            <option key={property.id} value={property.id}>
                              {property.listingName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Booking Filter (dependent on property) */}
                      {selectedPropertyId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Booking</label>
                          <select
                            value={selectedBookingId}
                            onChange={(e) => setSelectedBookingId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                          >
                            <option value="">All Bookings</option>
                            {bookings.map((booking) => (
                              <option key={booking.id} value={booking.id}>
                                {booking.guestName} - {new Date(booking.checkInDate).toLocaleDateString()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Category Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          <option value="">All Categories</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.code}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                        <select
                          value={filterPaymentStatus}
                          onChange={(e) => setFilterPaymentStatus(e.target.value as PaymentStatus | '')}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          {PAYMENT_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Date Range */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                          <div className="relative">
                            <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="date"
                              value={filterStartDate}
                              onChange={(e) => setFilterStartDate(e.target.value)}
                              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                          <div className="relative">
                            <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="date"
                              value={filterEndDate}
                              onChange={(e) => setFilterEndDate(e.target.value)}
                              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {activeFiltersCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={clearFilters}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">
                  Property / Booking
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Vendor
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[80px]">
                  Receipt
                </th>
                <th className="sticky right-0 bg-gray-50/95 backdrop-blur-sm px-6 py-4 min-w-[60px] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedExpenses.map((expense, index) => (
                <motion.tr
                  key={expense.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  onClick={() => handleViewExpense(expense.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{formatExpenseDate(expense.expenseDate)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: getCategoryColor(expense.category) + '20',
                        color: getCategoryColor(expense.category)
                      }}
                    >
                      {getCategoryLabel(expense.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {expense.propertyName ? (
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-900 truncate max-w-[150px]">{expense.propertyName}</div>
                            {expense.bookingGuestName && (
                              <div className="text-xs text-gray-500">{expense.bookingGuestName}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">General expense</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700 truncate max-w-[140px] block">
                      {expense.vendorName || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadge(expense.paymentStatus)}`}>
                      {PAYMENT_STATUSES.find(s => s.value === expense.paymentStatus)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {expense.receiptPath ? (
                      <span className="inline-flex items-center text-green-600">
                        <DocumentTextIcon className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td
                    className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TableActionsDropdown
                      actions={getExpenseActions(expense)}
                      itemId={expense.id}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredExpenses.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CurrencyDollarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No expenses found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchTerm || activeFiltersCount > 0
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first expense.'}
              </p>
              {!searchTerm && activeFiltersCount === 0 && (
                <motion.button
                  onClick={() => setShowCreateModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Your First Expense
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredExpenses.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium text-gray-700">{startIndex + 1}</span> to{' '}
                  <span className="font-medium text-gray-700">{Math.min(endIndex, totalItems)}</span> of{' '}
                  <span className="font-medium text-gray-700">{totalItems}</span> expenses
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Page Numbers */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <CreateExpenseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleExpenseAdded}
      />

      <ExpenseViewerModal
        isOpen={showViewerModal}
        onClose={() => setShowViewerModal(false)}
        expenseId={selectedExpenseId}
        onExpenseUpdated={handleExpenseUpdated}
        onExpenseDeleted={handleExpenseDeleted}
      />

      <ExpenseCategoriesModal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        onCategoryUpdate={handleCategoryUpdate}
      />

      <ScanReceiptModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onExpenseCreated={() => loadExpenses()}
      />
    </div>
  )
}
