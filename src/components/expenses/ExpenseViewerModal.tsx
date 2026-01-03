'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import {
  getExpenseById,
  updateExpense,
  deleteExpense,
  uploadReceipt,
  deleteReceipt,
  getReceiptPreviewUrl,
  downloadReceipt,
  formatCurrency,
  formatExpenseDate
} from '@/services/expenseService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import { getProperties } from '@/services/propertyService'
import { getBookings } from '@/services/bookingService'
import type {
  Expense,
  UpdateExpensePayload,
  PaymentMethod,
  PaymentStatus
} from '@/services/types/expense'
import type { ExpenseCategory } from '@/services/types/expenseCategories'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  EyeIcon,
  PhotoIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface ExpenseViewerModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  onExpenseUpdated?: () => void
  onExpenseDeleted?: (expenseId: string) => void
}

type ModalMode = 'view' | 'edit' | 'receipt'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'etransfer', label: 'E-Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'reimbursed', label: 'Reimbursed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const ExpenseViewerModal: React.FC<ExpenseViewerModalProps> = ({
  isOpen,
  onClose,
  expenseId,
  onExpenseUpdated,
  onExpenseDeleted,
}) => {
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ModalMode>('view')
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [loadingReceipt, setLoadingReceipt] = useState(false)

  // Edit form state
  const [propertyId, setPropertyId] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('CAD')
  const [category, setCategory] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [description, setDescription] = useState('')
  const [isReimbursable, setIsReimbursable] = useState(false)
  const [isTaxDeductible, setIsTaxDeductible] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid')
  const [submitting, setSubmitting] = useState(false)

  // Tax breakdown state
  const [subtotal, setSubtotal] = useState('')
  const [taxGst, setTaxGst] = useState('')
  const [taxPst, setTaxPst] = useState('')
  const [taxHst, setTaxHst] = useState('')
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false)

  // Receipt upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  // Reference data
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  useEffect(() => {
    if (isOpen && expenseId && profile?.id) {
      setMode('view')
      setReceiptUrl(null)
      fetchExpense()
      loadReferenceData()
    }
  }, [isOpen, expenseId, profile?.id])

  // Load bookings when property changes in edit mode
  useEffect(() => {
    if (mode === 'edit' && propertyId && profile?.id) {
      loadBookingsForProperty(propertyId)
    }
  }, [propertyId, mode, profile?.id])

  const fetchExpense = async () => {
    if (!profile?.id || !expenseId) return

    setLoading(true)
    try {
      const response = await getExpenseById(expenseId, profile.id)
      if (response.status === 'success') {
        setExpense(response.data)
        initializeEditForm(response.data)
      } else {
        showNotification(response.message || 'Failed to load expense', 'error')
      }
    } catch (error) {
      console.error('Error loading expense:', error)
      showNotification('Error loading expense', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadReferenceData = async () => {
    if (!profile?.id) return

    try {
      const [propertiesRes, categoriesRes] = await Promise.all([
        getProperties(profile.id),
        getCategoriesByUserId(profile.id),
      ])

      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data || [])
      }

      if (categoriesRes.status === 'success') {
        setCategories(categoriesRes.data || [])
      }
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  const loadBookingsForProperty = async (propId: string) => {
    if (!profile?.id) return

    try {
      const res = await getBookings({ userId: profile.id, propertyId: propId })
      if (res.status === 'success') {
        setBookings(res.data || [])
      }
    } catch (error) {
      console.error('Error loading bookings:', error)
    }
  }

  const initializeEditForm = (exp: Expense) => {
    setPropertyId(exp.propertyId || '')
    setBookingId(exp.bookingId || '')
    setExpenseDate(exp.expenseDate.split('T')[0])
    setAmount(exp.amount.toString())
    setCurrency(exp.currency)
    setCategory(exp.category)
    setVendorName(exp.vendorName || '')
    setDescription(exp.description || '')
    setIsReimbursable(exp.isReimbursable)
    setIsTaxDeductible(exp.isTaxDeductible)
    setPaymentMethod(exp.paymentMethod || 'credit_card')
    setPaymentStatus(exp.paymentStatus)

    // Tax breakdown fields
    setSubtotal(exp.subtotal?.toString() || '')
    setTaxGst(exp.taxGst?.toString() || '')
    setTaxPst(exp.taxPst?.toString() || '')
    setTaxHst(exp.taxHst?.toString() || '')
    // Show tax breakdown if any tax field has a value
    setShowTaxBreakdown(!!(exp.subtotal || exp.taxGst || exp.taxPst || exp.taxHst || exp.taxTotal))

    // Load bookings for property if exists
    if (exp.propertyId && profile?.id) {
      loadBookingsForProperty(exp.propertyId)
    }
  }

  const handleModeSwitch = async (newMode: ModalMode) => {
    if (newMode === 'receipt' && expense?.receiptPath && !receiptUrl) {
      await loadReceiptPreview()
    }
    setMode(newMode)
  }

  const loadReceiptPreview = async () => {
    if (!profile?.id || !expenseId) return

    setLoadingReceipt(true)
    try {
      const url = await getReceiptPreviewUrl(expenseId, profile.id)
      setReceiptUrl(url)
    } catch (error) {
      console.error('Error loading receipt:', error)
      showNotification('Error loading receipt preview', 'error')
    } finally {
      setLoadingReceipt(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile?.id || !expense) return

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification('Please enter a valid amount', 'error')
      return
    }

    setSubmitting(true)
    try {
      // Calculate tax total from components
      const parsedSubtotal = subtotal ? parseFloat(subtotal) : undefined
      const parsedTaxGst = taxGst ? parseFloat(taxGst) : undefined
      const parsedTaxPst = taxPst ? parseFloat(taxPst) : undefined
      const parsedTaxHst = taxHst ? parseFloat(taxHst) : undefined
      const calculatedTaxTotal = (parsedTaxGst || 0) + (parsedTaxPst || 0) + (parsedTaxHst || 0)

      const payload: UpdateExpensePayload = {
        userId: profile.id,
        propertyId: propertyId || null,
        bookingId: bookingId || null,
        expenseDate,
        amount: parsedAmount,
        currency,
        category,
        vendorName: vendorName.trim() || undefined,
        description: description.trim() || undefined,
        isReimbursable,
        isTaxDeductible,
        paymentMethod,
        paymentStatus,
        subtotal: parsedSubtotal,
        taxGst: parsedTaxGst,
        taxPst: parsedTaxPst,
        taxHst: parsedTaxHst,
        taxTotal: calculatedTaxTotal > 0 ? calculatedTaxTotal : undefined,
      }

      const response = await updateExpense(expense.id, payload)
      if (response.status === 'success') {
        showNotification('Expense updated successfully', 'success')
        setExpense(response.data)
        setMode('view')
        onExpenseUpdated?.()
      } else {
        showNotification(response.message || 'Failed to update expense', 'error')
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      showNotification('Error updating expense', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!profile?.id || !expense) return

    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return
    }

    try {
      const response = await deleteExpense(expense.id, profile.id)
      if (response.status === 'success') {
        showNotification('Expense deleted successfully', 'success')
        onExpenseDeleted?.(expense.id)
        onClose()
      } else {
        showNotification(response.message || 'Failed to delete expense', 'error')
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      showNotification('Error deleting expense', 'error')
    }
  }

  const handleDownloadReceipt = async () => {
    if (!profile?.id || !expense) return

    try {
      await downloadReceipt(expense.id, profile.id)
      showNotification('Download started', 'success')
    } catch (error) {
      console.error('Error downloading receipt:', error)
      showNotification('Error downloading receipt', 'error')
    }
  }

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      showNotification('Invalid file type', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('File size too large. Maximum: 5MB', 'error')
      return
    }

    setSelectedFile(file)
  }

  const handleUploadReceipt = async () => {
    if (!profile?.id || !expense || !selectedFile) return

    setUploadingReceipt(true)
    try {
      const response = await uploadReceipt(expense.id, profile.id, selectedFile)
      if (response.status === 'success' && response.data) {
        showNotification('Receipt uploaded successfully', 'success')
        setExpense(response.data)
        setSelectedFile(null)
        // Reload preview
        const url = await getReceiptPreviewUrl(expense.id, profile.id)
        setReceiptUrl(url)
        onExpenseUpdated?.()
      } else {
        showNotification(response.message || 'Failed to upload receipt', 'error')
      }
    } catch (error) {
      console.error('Error uploading receipt:', error)
      showNotification('Error uploading receipt', 'error')
    } finally {
      setUploadingReceipt(false)
    }
  }

  const handleDeleteReceipt = async () => {
    if (!profile?.id || !expense) return

    if (!confirm('Remove the receipt from this expense?')) return

    try {
      const response = await deleteReceipt(expense.id, profile.id)
      if (response.status === 'success') {
        showNotification('Receipt removed successfully', 'success')
        setExpense(prev => prev ? { ...prev, receiptPath: undefined, receiptOriginalName: undefined, receiptMimeType: undefined } : null)
        setReceiptUrl(null)
        setMode('view')
        onExpenseUpdated?.()
      } else {
        showNotification(response.message || 'Failed to remove receipt', 'error')
      }
    } catch (error) {
      console.error('Error removing receipt:', error)
      showNotification('Error removing receipt', 'error')
    }
  }

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

  const isImageReceipt = expense?.receiptMimeType?.startsWith('image/')

  const renderViewMode = () => {
    if (!expense) return null

    return (
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: getCategoryColor(expense.category) + '20',
                  color: getCategoryColor(expense.category)
                }}
              >
                {getCategoryLabel(expense.category)}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadge(expense.paymentStatus)}`}>
                {PAYMENT_STATUSES.find(s => s.value === expense.paymentStatus)?.label}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">
              {formatCurrency(expense.amount, expense.currency)}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleModeSwitch('edit')}
              className="cursor-pointer p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit expense"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="cursor-pointer p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete expense"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Date</div>
              <div className="text-sm font-medium text-gray-900">{formatExpenseDate(expense.expenseDate)}</div>
            </div>
          </div>

          {expense.propertyName && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">Property</div>
                <div className="text-sm font-medium text-gray-900">{expense.propertyName}</div>
              </div>
            </div>
          )}

          {expense.vendorName && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <TagIcon className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">Vendor</div>
                <div className="text-sm font-medium text-gray-900">{expense.vendorName}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Payment Method</div>
              <div className="text-sm font-medium text-gray-900">
                {PAYMENT_METHODS.find(m => m.value === expense.paymentMethod)?.label || expense.paymentMethod}
              </div>
            </div>
          </div>
        </div>

        {expense.description && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Description</div>
            <div className="text-sm text-gray-900">{expense.description}</div>
          </div>
        )}

        {expense.bookingGuestName && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 mb-1">Linked to Booking</div>
            <div className="text-sm font-medium text-blue-900">
              {expense.bookingGuestName} - {expense.bookingCheckInDate && formatExpenseDate(expense.bookingCheckInDate)}
            </div>
          </div>
        )}

        {/* Flags */}
        <div className="flex flex-wrap gap-2">
          {expense.isReimbursable && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700">
              Reimbursable
            </span>
          )}
          {expense.isTaxDeductible && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700">
              Tax Deductible
            </span>
          )}
        </div>

        {/* Tax Breakdown Display */}
        {(expense.subtotal || expense.taxGst || expense.taxPst || expense.taxHst || expense.taxTotal) && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-900 mb-3">Tax Breakdown</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {expense.subtotal !== undefined && expense.subtotal !== null && (
                <div>
                  <div className="text-xs text-gray-500">Subtotal</div>
                  <div className="font-medium text-gray-900">{formatCurrency(expense.subtotal, expense.currency)}</div>
                </div>
              )}
              {expense.taxGst !== undefined && expense.taxGst !== null && (
                <div>
                  <div className="text-xs text-gray-500">GST (5%)</div>
                  <div className="font-medium text-gray-900">{formatCurrency(expense.taxGst, expense.currency)}</div>
                </div>
              )}
              {expense.taxPst !== undefined && expense.taxPst !== null && (
                <div>
                  <div className="text-xs text-gray-500">PST</div>
                  <div className="font-medium text-gray-900">{formatCurrency(expense.taxPst, expense.currency)}</div>
                </div>
              )}
              {expense.taxHst !== undefined && expense.taxHst !== null && (
                <div>
                  <div className="text-xs text-gray-500">HST</div>
                  <div className="font-medium text-gray-900">{formatCurrency(expense.taxHst, expense.currency)}</div>
                </div>
              )}
              {expense.taxTotal !== undefined && expense.taxTotal !== null && (
                <div>
                  <div className="text-xs text-gray-500">Total Tax</div>
                  <div className="font-medium text-gray-900">{formatCurrency(expense.taxTotal, expense.currency)}</div>
                </div>
              )}
            </div>
            {expense.ocrProcessed && (
              <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                Extracted via OCR
              </div>
            )}
          </div>
        )}

        {/* Receipt section */}
        {expense.receiptPath ? (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">Receipt Attached</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleModeSwitch('receipt')}
                  className="cursor-pointer text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  View Receipt
                </button>
                <button
                  onClick={handleDownloadReceipt}
                  className="cursor-pointer text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  Download
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">{expense.receiptOriginalName}</p>
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
            <DocumentTextIcon className="mx-auto w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 mb-2">No receipt attached</p>
            <button
              onClick={() => handleModeSwitch('receipt')}
              className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Add Receipt
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderEditMode = () => {
    if (!expense) return null

    return (
      <form onSubmit={handleEditSubmit} className="space-y-4 text-black">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Edit Expense</h3>
          <button
            type="button"
            onClick={() => {
              initializeEditForm(expense)
              setMode('view')
            }}
            className="cursor-pointer text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Property and Booking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Property</label>
            <select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value)
                setBookingId('')
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.listingName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Booking</label>
            <select
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              disabled={!propertyId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">No booking</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.guestName} - {new Date(b.checkInDate).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount, Date, Category */}
        <div className="grid grid-cols-1 md:grid-cols-[150px_1fr_1fr] gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount *</label>
            <div className="flex">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="border border-gray-300 rounded-l-lg px-2 py-2 bg-gray-50"
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
              </select>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-l-0 border-gray-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.code}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vendor and Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vendor Name</label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Flags */}
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isReimbursable}
              onChange={(e) => setIsReimbursable(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Reimbursable</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isTaxDeductible}
              onChange={(e) => setIsTaxDeductible(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Tax Deductible</span>
          </label>
        </div>

        {/* Tax Breakdown (Collapsible) */}
        <div className="border border-gray-200 rounded-lg">
          <button
            type="button"
            onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
            className="cursor-pointer w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>Tax Breakdown (Optional)</span>
            {showTaxBreakdown ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {showTaxBreakdown && (
            <div className="p-4 pt-0 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subtotal</label>
                  <input
                    type="number"
                    step="0.01"
                    value={subtotal}
                    onChange={(e) => setSubtotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GST (5%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxGst}
                    onChange={(e) => setTaxGst(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PST</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxPst}
                    onChange={(e) => setTaxPst(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">HST</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxHst}
                    onChange={(e) => setTaxHst(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Total Tax will be calculated automatically from GST + PST + HST
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={() => {
              initializeEditForm(expense)
              setMode('view')
            }}
            className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    )
  }

  const renderReceiptMode = () => {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-black">Receipt</h3>
          <button
            onClick={() => setMode('view')}
            className="cursor-pointer text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Preview */}
        {expense?.receiptPath ? (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {loadingReceipt ? (
                <div className="flex items-center justify-center h-[400px] bg-gray-50">
                  <div className="text-gray-500">Loading receipt...</div>
                </div>
              ) : receiptUrl ? (
                isImageReceipt ? (
                  <div className="flex justify-center bg-gray-100 p-4">
                    <img
                      src={receiptUrl}
                      alt="Receipt"
                      className="max-w-full max-h-[500px] object-contain"
                    />
                  </div>
                ) : (
                  <iframe
                    src={receiptUrl}
                    className="w-full h-[500px]"
                    title="Receipt Preview"
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-[400px] bg-gray-50">
                  <div className="text-center">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Could not load preview</p>
                    <button
                      onClick={handleDownloadReceipt}
                      className="cursor-pointer mt-2 text-blue-600 hover:text-blue-800"
                    >
                      Download instead
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">{expense.receiptOriginalName}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadReceipt}
                  className="cursor-pointer flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleDeleteReceipt}
                  className="cursor-pointer flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  <TrashIcon className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </div>

            {/* Replace Receipt */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Replace Receipt</p>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isDragOver ? 'border-blue-400 bg-blue-50' : selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  const files = Array.from(e.dataTransfer.files)
                  if (files[0]) handleFileSelect(files[0])
                }}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-sm text-green-700">{selectedFile.name}</span>
                    <button
                      onClick={handleUploadReceipt}
                      disabled={uploadingReceipt}
                      className="cursor-pointer px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                    >
                      {uploadingReceipt ? 'Uploading...' : 'Upload'}
                    </button>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="cursor-pointer text-red-600 hover:text-red-800 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer text-sm text-gray-600">
                    Drop a new file or{' '}
                    <span className="text-blue-600 hover:text-blue-800">browse</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* No receipt - upload form */
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver ? 'border-blue-400 bg-blue-50' : selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragOver(false)
              const files = Array.from(e.dataTransfer.files)
              if (files[0]) handleFileSelect(files[0])
            }}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <DocumentTextIcon className="mx-auto h-10 w-10 text-green-600" />
                <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleUploadReceipt}
                    disabled={uploadingReceipt}
                    className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {uploadingReceipt ? 'Uploading...' : 'Upload Receipt'}
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <CloudArrowUpIcon className="mx-auto h-10 w-10 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Drag and drop your receipt here, or{' '}
                  <label className="text-blue-600 hover:text-blue-800 cursor-pointer">
                    click to browse
                    <input
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                  </label>
                </p>
                <p className="text-xs text-gray-500">JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, TXT (max 5MB)</p>
              </div>
            )}
          </div>
        )}

        {/* Back button */}
        <div className="flex justify-start pt-4">
          <button
            onClick={() => setMode('view')}
            className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Details
          </button>
        </div>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-3xl w-11/12">
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => handleModeSwitch('view')}
          className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            mode === 'view'
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => handleModeSwitch('edit')}
          className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            mode === 'edit'
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => handleModeSwitch('receipt')}
          className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            mode === 'receipt'
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Receipt {expense?.receiptPath && <span className="ml-1 text-green-600">*</span>}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading expense...</div>
        </div>
      ) : !expense ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Expense not found</div>
        </div>
      ) : (
        <>
          {mode === 'view' && renderViewMode()}
          {mode === 'edit' && renderEditMode()}
          {mode === 'receipt' && renderReceiptMode()}
        </>
      )}

      {/* Modal Footer */}
      <div className="flex justify-end pt-6 border-t mt-6">
        <button
          onClick={onClose}
          className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default ExpenseViewerModal
