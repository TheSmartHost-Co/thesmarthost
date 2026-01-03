'use client'

import React, { useState, useCallback } from 'react'
import Modal from '@/components/shared/modal'
import { scanReceipt, createExpense, formatCurrency } from '@/services/expenseService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import { getProperties } from '@/services/propertyService'
import type { OcrReceiptData, PaymentMethod, CreateExpensePayload } from '@/services/types/expense'
import type { ExpenseCategory } from '@/services/types/expenseCategories'
import type { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CameraIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'

interface ScanReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  onExpenseCreated: () => void
}

type ModalStep = 'upload' | 'processing' | 'review' | 'creating'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'etransfer', label: 'E-Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
]

const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({
  isOpen,
  onClose,
  onExpenseCreated
}) => {
  const [step, setStep] = useState<ModalStep>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [ocrData, setOcrData] = useState<OcrReceiptData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reference data
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loadedReferenceData, setLoadedReferenceData] = useState(false)

  // Form state (editable after OCR)
  const [vendorName, setVendorName] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [subtotal, setSubtotal] = useState('')
  const [taxGst, setTaxGst] = useState('')
  const [taxPst, setTaxPst] = useState('')
  const [taxHst, setTaxHst] = useState('')
  const [taxTotal, setTaxTotal] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card')
  const [category, setCategory] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [isReimbursable, setIsReimbursable] = useState(false)
  const [isTaxDeductible, setIsTaxDeductible] = useState(true)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Load reference data when modal opens
  const loadReferenceData = useCallback(async () => {
    if (!profile?.id || loadedReferenceData) return

    try {
      const [categoriesRes, propertiesRes] = await Promise.all([
        getCategoriesByUserId(profile.id),
        getProperties(profile.id)
      ])

      if (categoriesRes.status === 'success') {
        setCategories(categoriesRes.data || [])
        // Set default category if available
        const defaultCat = categoriesRes.data?.find(c => c.isDefault)
        if (defaultCat) setCategory(defaultCat.code)
      }

      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data || [])
      }

      setLoadedReferenceData(true)
    } catch (err) {
      console.error('Error loading reference data:', err)
    }
  }, [profile?.id, loadedReferenceData])

  React.useEffect(() => {
    if (isOpen) {
      loadReferenceData()
    }
  }, [isOpen, loadReferenceData])

  // Reset modal state when closed
  React.useEffect(() => {
    if (!isOpen) {
      setStep('upload')
      setSelectedFile(null)
      setOcrData(null)
      setError(null)
      setVendorName('')
      setExpenseDate('')
      setSubtotal('')
      setTaxGst('')
      setTaxPst('')
      setTaxHst('')
      setTaxTotal('')
      setAmount('')
      setDescription('')
      setPaymentMethod('credit_card')
      setCategory('')
      setPropertyId('')
      setIsReimbursable(false)
      setIsTaxDeductible(true)
    }
  }, [isOpen])

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf'
    ]

    if (!allowedTypes.includes(file.type)) {
      showNotification('Invalid file type. Please upload an image or PDF.', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showNotification('File too large. Maximum size is 10MB.', 'error')
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) handleFileSelect(files[0])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const processReceipt = async () => {
    if (!selectedFile) return

    setStep('processing')
    setError(null)

    try {
      const response = await scanReceipt(selectedFile)

      if (response.status === 'success' && response.data) {
        setOcrData(response.data)

        // Populate form with extracted data
        setVendorName(response.data.vendorName.value || '')
        setExpenseDate(response.data.expenseDate.value || new Date().toISOString().split('T')[0])
        setSubtotal(response.data.subtotal.value?.toString() || '')
        setTaxGst(response.data.taxGst.value?.toString() || '0')
        setTaxPst(response.data.taxPst.value?.toString() || '0')
        setTaxHst(response.data.taxHst.value?.toString() || '0')
        setTaxTotal(response.data.taxTotal.value?.toString() || '0')
        setAmount(response.data.total.value?.toString() || '')
        setDescription(response.data.description.value || '')

        // Map payment method
        const pm = response.data.paymentMethod.value?.toLowerCase()
        if (pm?.includes('credit')) setPaymentMethod('credit_card')
        else if (pm?.includes('debit')) setPaymentMethod('debit_card')
        else if (pm?.includes('cash')) setPaymentMethod('cash')
        else if (pm?.includes('transfer') || pm?.includes('etransfer')) setPaymentMethod('etransfer')
        else setPaymentMethod('credit_card')

        setStep('review')
      } else {
        setError(response.message || 'Failed to scan receipt')
        setStep('upload')
      }
    } catch (err) {
      console.error('OCR error:', err)
      setError('Error processing receipt. Please try again.')
      setStep('upload')
    }
  }

  const handleCreateExpense = async () => {
    if (!profile?.id) return

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification('Please enter a valid amount', 'error')
      return
    }

    if (!category) {
      showNotification('Please select a category', 'error')
      return
    }

    if (!expenseDate) {
      showNotification('Please enter a date', 'error')
      return
    }

    setStep('creating')

    try {
      const payload: CreateExpensePayload = {
        userId: profile.id,
        propertyId: propertyId || undefined,
        expenseDate,
        amount: parsedAmount,
        currency: 'CAD',
        category,
        vendorName: vendorName.trim() || undefined,
        description: description.trim() || undefined,
        receipt: selectedFile || undefined,
        isReimbursable,
        isTaxDeductible,
        paymentMethod,
        paymentStatus: 'paid',
        subtotal: parseFloat(subtotal) || undefined,
        taxGst: parseFloat(taxGst) || 0,
        taxPst: parseFloat(taxPst) || 0,
        taxHst: parseFloat(taxHst) || 0,
        taxTotal: parseFloat(taxTotal) || 0,
        ocrProcessed: true,
        ocrConfidence: ocrData ? {
          vendorName: ocrData.vendorName.confidence,
          expenseDate: ocrData.expenseDate.confidence,
          subtotal: ocrData.subtotal.confidence,
          taxGst: ocrData.taxGst.confidence,
          taxPst: ocrData.taxPst.confidence,
          taxHst: ocrData.taxHst.confidence,
          taxTotal: ocrData.taxTotal.confidence,
          total: ocrData.total.confidence,
          description: ocrData.description.confidence,
          paymentMethod: ocrData.paymentMethod.confidence
        } : undefined
      }

      const response = await createExpense(payload)

      if (response.status === 'success') {
        showNotification('Expense created from receipt!', 'success')
        onExpenseCreated()
        onClose()
      } else {
        showNotification(response.message || 'Failed to create expense', 'error')
        setStep('review')
      }
    } catch (err) {
      console.error('Create expense error:', err)
      showNotification('Error creating expense', 'error')
      setStep('review')
    }
  }

  const getConfidenceIndicator = (confidence: number) => {
    if (confidence >= 0.8) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" title={`${Math.round(confidence * 100)}% confidence`} />
    } else if (confidence >= 0.5) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" title={`${Math.round(confidence * 100)}% confidence - please verify`} />
    } else {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" title={`${Math.round(confidence * 100)}% confidence - needs review`} />
    }
  }

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CameraIcon className="mx-auto h-12 w-12 text-blue-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Scan Receipt</h3>
        <p className="text-sm text-gray-500">
          Upload a receipt image or PDF and we&apos;ll extract the details automatically
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              {selectedFile.type.startsWith('image/') ? (
                <PhotoIcon className="w-10 h-10 text-green-600" />
              ) : (
                <DocumentTextIcon className="w-10 h-10 text-green-600" />
              )}
              <div className="text-left">
                <p className="font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={processReceipt}
                className="cursor-pointer px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <ArrowPathIcon className="w-5 h-5" />
                Scan Receipt
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-gray-600">
                Drag and drop your receipt here, or{' '}
                <label className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supports JPG, PNG, GIF, WEBP, PDF (max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderProcessingStep = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
      </div>
      <p className="mt-4 text-lg font-medium text-gray-900">Scanning receipt...</p>
      <p className="text-sm text-gray-500">Extracting vendor, date, taxes, and total</p>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6 text-black">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Review & Edit</h3>
        <button
          onClick={() => {
            setStep('upload')
            setSelectedFile(null)
            setOcrData(null)
          }}
          className="cursor-pointer text-sm text-blue-600 hover:text-blue-800"
        >
          Scan another
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        <strong>Tip:</strong> Fields marked with ⚠️ have low confidence. Please verify before creating.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendor Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-1">
            Vendor Name
            {ocrData && getConfidenceIndicator(ocrData.vendorName.confidence)}
          </label>
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Store name"
          />
        </div>

        {/* Date */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-1">
            Date *
            {ocrData && getConfidenceIndicator(ocrData.expenseDate.confidence)}
          </label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Subtotal */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-1">
            Subtotal (before tax)
            {ocrData && getConfidenceIndicator(ocrData.subtotal.confidence)}
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              className="w-full border border-gray-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Total */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-1">
            Total Amount *
            {ocrData && getConfidenceIndicator(ocrData.total.confidence)}
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Tax Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              GST
              {ocrData && getConfidenceIndicator(ocrData.taxGst.confidence)}
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-white text-gray-500 text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                value={taxGst}
                onChange={(e) => setTaxGst(e.target.value)}
                className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              PST
              {ocrData && getConfidenceIndicator(ocrData.taxPst.confidence)}
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-white text-gray-500 text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                value={taxPst}
                onChange={(e) => setTaxPst(e.target.value)}
                className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              HST
              {ocrData && getConfidenceIndicator(ocrData.taxHst.confidence)}
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-white text-gray-500 text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                value={taxHst}
                onChange={(e) => setTaxHst(e.target.value)}
                className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              Total Tax
              {ocrData && getConfidenceIndicator(ocrData.taxTotal.confidence)}
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-2 py-1.5 border border-r-0 border-gray-300 rounded-l-lg bg-white text-gray-500 text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                value={taxTotal}
                onChange={(e) => setTaxTotal(e.target.value)}
                className="w-full border border-gray-300 rounded-r-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category and Property */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.code}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Property</label>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.listingName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description and Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-1">
            Description
            {ocrData && getConfidenceIndicator(ocrData.description.confidence)}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What was purchased"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-1">
            Payment Method
            {ocrData && getConfidenceIndicator(ocrData.paymentMethod.confidence)}
          </label>
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

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <button
          onClick={onClose}
          className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateExpense}
          className="cursor-pointer px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <CheckCircleIcon className="w-5 h-5" />
          Create Expense
        </button>
      </div>
    </div>
  )

  const renderCreatingStep = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-green-200 rounded-full animate-spin border-t-green-600" />
      </div>
      <p className="mt-4 text-lg font-medium text-gray-900">Creating expense...</p>
      <p className="text-sm text-gray-500">Saving expense and uploading receipt</p>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-2xl w-11/12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <CameraIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scan Receipt</h2>
          <p className="text-sm text-gray-500">Upload and auto-extract expense details</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`w-3 h-3 rounded-full ${step === 'upload' ? 'bg-blue-600' : 'bg-gray-300'}`} />
        <div className={`w-3 h-3 rounded-full ${step === 'processing' ? 'bg-blue-600' : 'bg-gray-300'}`} />
        <div className={`w-3 h-3 rounded-full ${step === 'review' || step === 'creating' ? 'bg-blue-600' : 'bg-gray-300'}`} />
      </div>

      {/* Content */}
      {step === 'upload' && renderUploadStep()}
      {step === 'processing' && renderProcessingStep()}
      {step === 'review' && renderReviewStep()}
      {step === 'creating' && renderCreatingStep()}
    </Modal>
  )
}

export default ScanReceiptModal
