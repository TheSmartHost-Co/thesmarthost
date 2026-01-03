'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import { createExpense } from '@/services/expenseService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import { getProperties } from '@/services/propertyService'
import { getBookings } from '@/services/bookingService'
import type { CreateExpensePayload, Expense, PaymentMethod, PaymentStatus } from '@/services/types/expense'
import type { ExpenseCategory } from '@/services/types/expenseCategories'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface CreateExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (expense: Expense) => void
  preselectedPropertyId?: string
  preselectedBookingId?: string
}

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

const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  preselectedPropertyId,
  preselectedBookingId,
}) => {
  // Form state
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

  // Tax breakdown state
  const [subtotal, setSubtotal] = useState('')
  const [taxGst, setTaxGst] = useState('')
  const [taxPst, setTaxPst] = useState('')
  const [taxHst, setTaxHst] = useState('')
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false)

  // Receipt state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Data state
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Load data on mount
  useEffect(() => {
    if (isOpen && profile?.id) {
      loadData()
      resetForm()
    }
  }, [isOpen, profile?.id])

  // Load bookings when property changes
  useEffect(() => {
    if (propertyId && profile?.id) {
      loadBookingsForProperty(propertyId)
    } else {
      setBookings([])
      setBookingId('')
    }
  }, [propertyId, profile?.id])

  const loadData = async () => {
    if (!profile?.id) return

    setLoading(true)
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
        // Set default category if available
        const defaultCat = categoriesRes.data.find(c => c.isDefault)
        if (defaultCat) {
          setCategory(defaultCat.code)
        }
      }

      // Set preselected values
      if (preselectedPropertyId) {
        setPropertyId(preselectedPropertyId)
      }
      if (preselectedBookingId) {
        setBookingId(preselectedBookingId)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      showNotification('Error loading form data', 'error')
    } finally {
      setLoading(false)
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

  const resetForm = () => {
    setPropertyId(preselectedPropertyId || '')
    setBookingId(preselectedBookingId || '')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setAmount('')
    setCurrency('CAD')
    setCategory('')
    setVendorName('')
    setDescription('')
    setIsReimbursable(false)
    setIsTaxDeductible(false)
    setPaymentMethod('credit_card')
    setPaymentStatus('paid')
    setSelectedFile(null)
    setSubtotal('')
    setTaxGst('')
    setTaxPst('')
    setTaxHst('')
    setShowTaxBreakdown(false)
  }

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      showNotification('Invalid file type. Allowed: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, TXT', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('File size too large. Maximum: 5MB', 'error')
      return
    }

    setSelectedFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile?.id) {
      showNotification('User not authenticated', 'error')
      return
    }

    // Validation
    if (!expenseDate) {
      showNotification('Expense date is required', 'error')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification('Please enter a valid amount greater than 0', 'error')
      return
    }

    if (!category) {
      showNotification('Please select a category', 'error')
      return
    }

    setSubmitting(true)
    try {
      // Calculate tax total
      const gst = parseFloat(taxGst) || 0
      const pst = parseFloat(taxPst) || 0
      const hst = parseFloat(taxHst) || 0
      const taxTotal = gst + pst + hst

      const payload: CreateExpensePayload = {
        userId: profile.id,
        propertyId: propertyId || undefined,
        bookingId: bookingId || undefined,
        expenseDate,
        amount: parsedAmount,
        currency,
        category,
        vendorName: vendorName.trim() || undefined,
        description: description.trim() || undefined,
        receipt: selectedFile || undefined,
        isReimbursable,
        isTaxDeductible,
        paymentMethod,
        paymentStatus,
        subtotal: parseFloat(subtotal) || undefined,
        taxGst: gst || undefined,
        taxPst: pst || undefined,
        taxHst: hst || undefined,
        taxTotal: taxTotal || undefined,
      }

      const response = await createExpense(payload)
      if (response.status === 'success') {
        showNotification('Expense created successfully', 'success')
        onAdd(response.data)
        onClose()
      } else {
        showNotification(response.message || 'Failed to create expense', 'error')
      }
    } catch (error) {
      console.error('Error creating expense:', error)
      showNotification('Error creating expense', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryColor = (categoryCode: string) => {
    const cat = categories.find(c => c.code === categoryCode)
    return cat?.colorHex || '#6B7280'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl w-11/12">
      <h2 className="text-xl mb-6 text-black">Add New Expense</h2>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading form data...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 text-black">
          {/* Property and Booking Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property</label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No property (general expense)</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.listingName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Booking</label>
              <select
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                disabled={!propertyId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">No booking (property-level expense)</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.guestName} - {new Date(booking.checkInDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {!propertyId && (
                <p className="mt-1 text-xs text-gray-500">Select a property first to attach to a booking</p>
              )}
            </div>
          </div>

          {/* Amount, Date, Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount *</label>
              <div className="flex">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="border border-gray-300 rounded-l-lg px-2 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 border border-l-0 border-gray-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{
                  borderLeftWidth: category ? '4px' : '1px',
                  borderLeftColor: category ? getCategoryColor(category) : undefined
                }}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.code}>
                    {cat.label} ({cat.code})
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No categories found. Create categories first.</p>
              )}
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Home Depot, Amazon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the expense"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Financial Flags */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isReimbursable}
                onChange={(e) => setIsReimbursable(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Reimbursable</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTaxDeductible}
                onChange={(e) => setIsTaxDeductible(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Tax Deductible</span>
            </label>
          </div>

          {/* Tax Breakdown (Optional) */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
              className="w-full px-4 py-3 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Tax Breakdown (Optional)</span>
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subtotal</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={subtotal}
                        onChange={(e) => setSubtotal(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">GST (5%)</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={taxGst}
                        onChange={(e) => setTaxGst(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">PST</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={taxPst}
                        onChange={(e) => setTaxPst(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">HST</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={taxHst}
                        onChange={(e) => setTaxHst(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                {(parseFloat(taxGst) > 0 || parseFloat(taxPst) > 0 || parseFloat(taxHst) > 0) && (
                  <div className="text-right text-sm text-gray-600">
                    Total Tax: <span className="font-medium">${((parseFloat(taxGst) || 0) + (parseFloat(taxPst) || 0) + (parseFloat(taxHst) || 0)).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Receipt (Optional)</label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50'
                  : selectedFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <DocumentTextIcon className="mx-auto h-8 w-8 text-green-600" />
                  <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="cursor-pointer text-xs text-red-600 hover:text-red-800"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <CloudArrowUpIcon className="mx-auto h-8 w-8 text-gray-400" />
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
          </div>

          {/* Form Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Expense'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default CreateExpenseModal
