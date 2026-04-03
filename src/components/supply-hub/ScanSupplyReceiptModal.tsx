'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import Modal from '@/components/shared/modal'
import {
  uploadReceipt,
  getReceiptById,
  applyReceipt,
  updateReceiptLineItem,
  createReceiptLineItem,
  deleteReceiptLineItem,
} from '@/services/receiptService'
import type { SupplyList } from '@/services/types/supplyList'
import type {
  ReceiptDetail,
  ReceiptLineItem,
  ApplyReceiptPayload,
  AutoApplyOptions,
} from '@/services/types/receipt'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { getCleaningProjects } from '@/services/cleaningProjectService'
import type { CleaningProject } from '@/services/types/cleaningProject'
import { parseLocalDate } from '@/utils/dateUtils'
import {
  CloudArrowUpIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PhotoIcon,
  DocumentTextIcon,
  PlusCircleIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from '@heroicons/react/24/outline'

interface ScanSupplyReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  supplyListId?: string
  supplyList?: SupplyList | null
  properties?: { id: string; listingName: string }[]
  onReceiptApplied: () => void
  defaultPropertyId?: string
  defaultProjectId?: string
  receiptId?: string // When provided, skip upload and go straight to review
  autoApply?: boolean // When true, skip review and auto-apply on upload (used by ProjectDetailModal)
  paidByType?: 'company' | 'cleaner'
  paidById?: string | null
}

type Step = 'upload' | 'processing' | 'review' | 'confirm' | 'success'
type ModalContext = 'auto-apply-existing' | 'auto-apply-new' | 'manual' | 'review-existing'

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'etransfer', label: 'E-Transfer' },
  { value: 'other', label: 'Other' },
]

export default function ScanSupplyReceiptModal({
  isOpen,
  onClose,
  supplyListId,
  supplyList,
  properties,
  onReceiptApplied,
  defaultPropertyId,
  defaultProjectId,
  receiptId: receiptIdProp,
  autoApply: autoApplyProp,
  paidByType,
  paidById,
}: ScanSupplyReceiptModalProps) {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore(s => s.showNotification)

  // Determine context from props
  const context: ModalContext = useMemo(() => {
    if (receiptIdProp) return 'review-existing'
    if (autoApplyProp && supplyListId) return 'auto-apply-existing'
    if (autoApplyProp && defaultProjectId && defaultPropertyId) return 'auto-apply-new'
    return 'manual'
  }, [receiptIdProp, autoApplyProp, supplyListId, defaultProjectId, defaultPropertyId])

  const isAutoApply = context === 'auto-apply-existing' || context === 'auto-apply-new'

  const [step, setStep] = useState<Step>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projects, setProjects] = useState<CleaningProject[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Receipt data (persisted from backend)
  const [receiptDetail, setReceiptDetail] = useState<ReceiptDetail | null>(null)
  const [lineItems, setLineItems] = useState<ReceiptLineItem[]>([])

  // Receipt image
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(1)

  // Editable form fields (populated from receipt)
  const [vendorName, setVendorName] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [submitting, setSubmitting] = useState(false)

  // Tax values
  const [subtotal, setSubtotal] = useState(0)
  const [taxGst, setTaxGst] = useState(0)
  const [taxPst, setTaxPst] = useState(0)
  const [taxHst, setTaxHst] = useState(0)
  const [taxTotal, setTaxTotal] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)

  // Manual override flags
  const [manualSubtotal, setManualSubtotal] = useState(false)
  const [manualTaxTotal, setManualTaxTotal] = useState(false)
  const [manualGrandTotal, setManualGrandTotal] = useState(false)

  // Tax deductible
  const [isTaxDeductible, setIsTaxDeductible] = useState(false)

  // Success step data (autoApply only)
  const [successData, setSuccessData] = useState<{ total: number; itemCount: number; vendor: string } | null>(null)

  // Supply list mode for apply step (manual context)
  const [supplyListMode, setSupplyListMode] = useState<'none' | 'new' | 'existing'>('none')
  const [applySupplyListId, setApplySupplyListId] = useState('')

  // Saving indicator for inline line item edits
  const [savingItemId, setSavingItemId] = useState<string | null>(null)

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('upload')
      setSelectedFile(null)
      setSelectedPropertyId('')
      setSelectedProjectId('')
      setProjects([])
      setError(null)
      setReceiptDetail(null)
      setLineItems([])
      setImageUrl(null)
      setImageZoom(1)
      setVendorName('')
      setExpenseDate('')
      setCategory('')
      setPaymentMethod('credit_card')
      setSubmitting(false)
      setSubtotal(0)
      setTaxGst(0)
      setTaxPst(0)
      setTaxHst(0)
      setTaxTotal(0)
      setGrandTotal(0)
      setManualSubtotal(false)
      setManualTaxTotal(false)
      setManualGrandTotal(false)
      setIsTaxDeductible(false)
      setSuccessData(null)
      setSupplyListMode('none')
      setApplySupplyListId('')
      setSavingItemId(null)
    }
  }, [isOpen])

  // Pre-select property when opened with a default
  useEffect(() => {
    if (isOpen && defaultPropertyId) {
      setSelectedPropertyId(defaultPropertyId)
    }
  }, [isOpen, defaultPropertyId])

  // Pre-select project when projects finish loading
  useEffect(() => {
    if (isOpen && defaultProjectId && projects.length > 0) {
      const match = projects.find(p => p.id === defaultProjectId)
      if (match) setSelectedProjectId(defaultProjectId)
    }
  }, [isOpen, defaultProjectId, projects])

  // Load existing receipt when receiptId prop is provided (Context D: review-existing)
  useEffect(() => {
    if (!isOpen || !receiptIdProp) return
    let cancelled = false

    const loadReceipt = async () => {
      setStep('processing')
      try {
        const res = await getReceiptById(receiptIdProp)
        if (cancelled) return
        if (res.status === 'success' && res.data) {
          populateFromReceipt(res.data, res.data.lineItems || [])
          setStep('review')
        } else {
          setError(res.message || 'Failed to load receipt')
          setStep('upload')
        }
      } catch {
        if (!cancelled) {
          setError('Error loading receipt')
          setStep('upload')
        }
      }
    }
    loadReceipt()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, receiptIdProp])

  // Fetch active projects when property changes (manual context only)
  useEffect(() => {
    if (context !== 'manual' || !selectedPropertyId || !profile?.id) {
      setProjects([])
      setSelectedProjectId('')
      return
    }
    let cancelled = false
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 7)
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 30)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    getCleaningProjects({ userId: profile.id, startDate: fmt(startDate), endDate: fmt(endDate) })
      .then(res => {
        if (cancelled) return
        if (res.status === 'success') {
          const active = res.data.filter(
            p => p.propertyId === selectedPropertyId &&
              ['assigned', 'confirmed', 'in_progress'].includes(p.status)
          )
          setProjects(active)
        }
      })
      .catch(() => { /* ignore */ })

    return () => { cancelled = true }
  }, [context, selectedPropertyId, profile?.id])

  // Populate form fields from a ReceiptDetail
  const populateFromReceipt = (receipt: ReceiptDetail, items: ReceiptLineItem[]) => {
    setReceiptDetail(receipt)
    setLineItems(items)
    setImageUrl(receipt.signedUrl || null)

    // Populate header from receipt fields
    setVendorName(receipt.vendorName || '')
    setExpenseDate(receipt.expenseDate || new Date().toISOString().split('T')[0])
    setPaymentMethod(receipt.paymentMethod || 'credit_card')

    // Populate taxes
    setTaxGst(receipt.taxGst ?? 0)
    setTaxPst(receipt.taxPst ?? 0)
    setTaxHst(receipt.taxHst ?? 0)

    // Use receipt-level totals as manual overrides if available
    if (receipt.subtotal && receipt.subtotal > 0) {
      setSubtotal(receipt.subtotal)
      setManualSubtotal(true)
    }
    if (receipt.taxTotal && receipt.taxTotal > 0) {
      setTaxTotal(receipt.taxTotal)
      setManualTaxTotal(true)
    }
    if (receipt.total && receipt.total > 0) {
      setGrandTotal(receipt.total)
      setManualGrandTotal(true)
    }

    // Set property from receipt if available
    if (receipt.propertyId) {
      setSelectedPropertyId(receipt.propertyId)
    }
  }

  // Auto-calculation: line items subtotal
  const lineItemsSubtotal = useMemo(() => {
    return Math.round(lineItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0) * 100) / 100
  }, [lineItems])

  // Auto-calc subtotal from line items
  useEffect(() => {
    if (!manualSubtotal) setSubtotal(lineItemsSubtotal)
  }, [lineItemsSubtotal, manualSubtotal])

  // Auto-calc tax total from individual taxes
  const computedTaxTotal = useMemo(() => {
    return Math.round((taxGst + taxPst + taxHst) * 100) / 100
  }, [taxGst, taxPst, taxHst])

  useEffect(() => {
    if (!manualTaxTotal) setTaxTotal(computedTaxTotal)
  }, [computedTaxTotal, manualTaxTotal])

  // Auto-calc grand total
  useEffect(() => {
    if (!manualGrandTotal) setGrandTotal(Math.round((subtotal + taxTotal) * 100) / 100)
  }, [subtotal, taxTotal, manualGrandTotal])

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      showNotification('Invalid file type. Upload an image or PDF.', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showNotification('File too large. Maximum 10MB.', 'error')
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (isAutoApply) {
        // Auto-apply: single call creates receipt + expense + optional supply list
        const autoApplyOptions: AutoApplyOptions = {
          autoApply: true,
          ...(paidByType ? { paidByType } : {}),
          ...(paidById ? { paidById } : {}),
          supplyList: context === 'auto-apply-existing'
            ? { mode: 'existing', supplyListId: supplyListId! }
            : { mode: 'new', projectId: defaultProjectId },
        }

        const res = await uploadReceipt(
          selectedFile,
          selectedPropertyId || defaultPropertyId,
          context === 'auto-apply-existing' ? supplyListId : undefined,
          autoApplyOptions
        )

        if (res.status === 'success' && res.data) {
          const receipt = res.data.receipt
          setSuccessData({
            total: receipt.total ?? 0,
            itemCount: res.data.lineItems?.length ?? 0,
            vendor: receipt.vendorName || 'Unknown',
          })
          setStep('success')
        } else {
          setError(res.message || 'Failed to process receipt')
          setStep('upload')
        }
      } else {
        // Manual: upload only, user reviews and applies separately
        const res = await uploadReceipt(
          selectedFile,
          selectedPropertyId || undefined,
          undefined
        )

        if (res.status === 'success' && res.data) {
          populateFromReceipt(res.data.receipt, res.data.lineItems || [])
          setStep('review')
        } else {
          setError(res.message || 'Failed to scan receipt')
          setStep('upload')
        }
      }
    } catch (err) {
      console.error('Receipt processing error:', err)
      setError('Error processing receipt. Please try again.')
      setStep('upload')
    }
  }

  // Line item inline edit handlers
  const handleUpdateLineItem = async (
    lineItemId: string,
    field: 'name' | 'quantity' | 'unitPrice' | 'totalPrice',
    value: number | string
  ) => {
    if (!receiptDetail) return
    setSavingItemId(lineItemId)
    try {
      const payload: Record<string, unknown> = {}
      if (field === 'name') payload.name = value as string
      else if (field === 'quantity') payload.quantity = value as number
      else if (field === 'unitPrice') payload.unitPrice = value as number
      else if (field === 'totalPrice') payload.totalPrice = value as number

      const res = await updateReceiptLineItem(receiptDetail.id, lineItemId, payload)
      if (res.status === 'success') {
        setLineItems(prev => prev.map(li => li.id === lineItemId ? res.data : li))
      }
    } catch {
      // Silent fail for inline edits
    } finally {
      setSavingItemId(null)
    }
  }

  const handleAddLineItem = async () => {
    if (!receiptDetail) return
    try {
      const res = await createReceiptLineItem(receiptDetail.id, {
        name: 'New Item',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      })
      if (res.status === 'success') {
        setLineItems(prev => [...prev, res.data])
      }
    } catch {
      showNotification('Error adding line item', 'error')
    }
  }

  const handleDeleteLineItem = async (lineItemId: string) => {
    if (!receiptDetail) return
    setSavingItemId(lineItemId)
    try {
      const res = await deleteReceiptLineItem(receiptDetail.id, lineItemId)
      if (res.status === 'success') {
        setLineItems(prev => prev.filter(li => li.id !== lineItemId))
      }
    } catch {
      showNotification('Error deleting line item', 'error')
    } finally {
      setSavingItemId(null)
    }
  }

  const handleApply = async () => {
    if (!profile?.id || !receiptDetail) return
    setSubmitting(true)

    const propertyId = selectedPropertyId || receiptDetail.propertyId || ''
    if (!propertyId) {
      showNotification('Please select a property', 'error')
      setSubmitting(false)
      return
    }

    const payload: ApplyReceiptPayload = {
      propertyId,
      expenseDate,
      vendorName,
      category: category || 'SUPPLIES',
      paymentMethod,
      paidByType: 'company',
      paidById: null,
      subtotal,
      taxGst,
      taxPst,
      taxHst,
      taxTotal,
      supplyList: {
        mode: supplyListMode,
        ...(supplyListMode === 'existing' && applySupplyListId ? { supplyListId: applySupplyListId } : {}),
        ...(supplyListMode === 'new' && selectedProjectId ? { projectId: selectedProjectId } : {}),
      },
    }

    try {
      const res = await applyReceipt(receiptDetail.id, payload)
      if (res.status === 'success') {
        showNotification('Expense created from receipt!', 'success')
        onReceiptApplied()
        onClose()
      } else {
        showNotification(res.message || 'Failed to apply receipt', 'error')
      }
    } catch (err) {
      console.error('Apply error:', err)
      showNotification('Error creating expense', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const getConfidenceDot = (confidence: number) => {
    if (!confidence) return null
    const color = confidence >= 0.9 ? 'bg-green-500' : confidence >= 0.7 ? 'bg-amber-500' : 'bg-red-500'
    return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} ml-1`} title={`${Math.round(confidence * 100)}%`} />
  }

  const fmt = (n: number | null | undefined) => `$${(Number(n) || 0).toFixed(2)}`

  // Extract OCR confidence from receiptDetail.ocrRaw
  const ocrConf = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = receiptDetail?.ocrRaw as any
    if (!raw) return { vendor: 0, date: 0, subtotal: 0, gst: 0, pst: 0, hst: 0, taxTotal: 0, total: 0 }
    return {
      vendor: raw?.vendorName?.confidence ?? 0,
      date: raw?.expenseDate?.confidence ?? 0,
      subtotal: raw?.subtotal?.confidence ?? 0,
      gst: raw?.taxGst?.confidence ?? 0,
      pst: raw?.taxPst?.confidence ?? 0,
      hst: raw?.taxHst?.confidence ?? 0,
      taxTotal: raw?.taxTotal?.confidence ?? 0,
      total: raw?.total?.confidence ?? 0,
    }
  }, [receiptDetail])

  // Determine if file is PDF
  const isPdf = receiptDetail?.mimeType === 'application/pdf' || selectedFile?.type === 'application/pdf'

  // Steps for progress dots depend on context
  const stepDots: Step[] = isAutoApply
    ? ['upload', 'processing', 'success']
    : context === 'review-existing'
      ? ['review', 'confirm']
      : ['upload', 'processing', 'review', 'confirm']

  return (
    <Modal isOpen={isOpen} onClose={onClose} style={`p-0 w-[calc(100%-1rem)] sm:w-11/12 !overflow-y-hidden flex flex-col !max-h-[90vh] ${step === 'review' || step === 'confirm' ? '!h-[90vh]' : ''} ${(step === 'review' || step === 'confirm') && imageUrl ? 'max-w-4xl' : 'max-w-2xl'}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {context === 'review-existing' ? 'Review Receipt' : 'Scan Receipt'}
            </h2>
            <p className="text-xs text-gray-500">
              {isAutoApply
                ? 'Upload a receipt to auto-create expense'
                : context === 'review-existing'
                  ? 'Review and apply this receipt'
                  : supplyList
                    ? `${supplyList.propertyName || 'Supply List'} — ${supplyList.items?.length || 0} items`
                    : 'Upload a receipt to review and apply'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {stepDots.map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${
                  step === s ? 'bg-blue-600' :
                  stepDots.indexOf(step) > i ? 'bg-blue-300' :
                  'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">

        {/* Upload step */}
        {step === 'upload' && (
          <div className="overflow-y-auto h-full px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{error}</div>
              )}

              {/* Property selector (manual context only) */}
              {context === 'manual' && properties && properties.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Property</label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => { setSelectedPropertyId(e.target.value); setSelectedProjectId('') }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select a property...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.listingName}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Project picker (manual context) */}
              {context === 'manual' && selectedPropertyId && projects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Cleaning Project <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Standalone (no project)</option>
                    {projects.map(p => {
                      const d = parseLocalDate(p.projectDate.split('T')[0])
                      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      return (
                        <option key={p.id} value={p.id}>
                          {label} — {p.status.replace('_', ' ')}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isDragOver ? 'border-blue-400 bg-blue-50' :
                  selectedFile ? 'border-green-400 bg-green-50' :
                  'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      {selectedFile.type.startsWith('image/') ? (
                        <PhotoIcon className="w-8 h-8 text-green-600" />
                      ) : (
                        <DocumentTextIcon className="w-8 h-8 text-green-600" />
                      )}
                      <div className="text-left">
                        <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={processReceipt}
                        disabled={context === 'manual' && !selectedPropertyId}
                        className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <ArrowPathIcon className="w-4 h-4" /> {isAutoApply ? 'Upload & Apply' : 'Scan'}
                      </button>
                      <button onClick={() => setSelectedFile(null)} className="cursor-pointer px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="space-y-2 cursor-pointer block">
                    <CloudArrowUpIcon className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Drop receipt here or{' '}
                      <span className="text-blue-600 hover:text-blue-800 font-medium">browse</span>
                    </p>
                    <p className="text-[10px] text-gray-400">JPG, PNG, GIF, WebP, PDF — max 10MB</p>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Processing step */}
        {step === 'processing' && (
          <div className="overflow-y-auto h-full px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-3 border-blue-200 rounded-full animate-spin border-t-blue-600" />
              <p className="mt-3 text-sm font-medium text-gray-900">
                {isAutoApply ? 'Processing receipt...' : context === 'review-existing' ? 'Loading receipt...' : 'Scanning receipt...'}
              </p>
              <p className="text-xs text-gray-500">
                {isAutoApply ? 'Uploading, scanning, and creating expense' : 'Extracting line items'}
              </p>
            </div>
          </div>
        )}

        {/* Success step (autoApply only) */}
        {step === 'success' && successData && (
          <div className="overflow-y-auto h-full px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Receipt Processed</h3>
              <p className="text-sm text-gray-500 mb-6">Expense created successfully</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full max-w-xs">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vendor</span>
                    <span className="font-medium text-gray-900">{successData.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Items</span>
                    <span className="font-medium text-gray-900">{successData.itemCount}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-500">Total</span>
                    <span className="font-semibold text-gray-900">{fmt(successData.total)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { onReceiptApplied(); onClose() }}
                className="cursor-pointer mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Review step */}
        {step === 'review' && receiptDetail && (
          <div className={imageUrl ? 'absolute inset-0 flex flex-col lg:flex-row' : 'overflow-y-auto h-full'}>
            {/* Left: Receipt Image */}
            {imageUrl && (
              <div className="lg:w-2/5 flex-shrink-0 p-4 sm:p-6 sm:pr-2 overflow-hidden">
                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden h-full">
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                      <DocumentTextIcon className="w-12 h-12 text-gray-400" />
                      <p className="text-xs text-gray-500">PDF Receipt</p>
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                      >
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <div className="relative">
                      <div
                        className="overflow-auto h-full cursor-grab active:cursor-grabbing"
                        onWheel={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            e.preventDefault()
                            setImageZoom(z => Math.min(4, Math.max(0.5, z + (e.deltaY < 0 ? 0.15 : -0.15))))
                          }
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt="Receipt"
                          className="w-full h-auto object-contain transition-transform duration-150 origin-top-left"
                          style={{ transform: `scale(${imageZoom})` }}
                          draggable={false}
                        />
                      </div>
                      <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm px-1 py-0.5">
                        <button
                          onClick={() => setImageZoom(z => Math.max(0.5, z - 0.25))}
                          className="cursor-pointer p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                          disabled={imageZoom <= 0.5}
                        >
                          <MagnifyingGlassMinusIcon className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] tabular-nums text-gray-500 w-8 text-center">{Math.round(imageZoom * 100)}%</span>
                        <button
                          onClick={() => setImageZoom(z => Math.min(4, z + 0.25))}
                          className="cursor-pointer p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                          disabled={imageZoom >= 4}
                        >
                          <MagnifyingGlassPlusIcon className="w-3.5 h-3.5" />
                        </button>
                        {imageZoom !== 1 && (
                          <button
                            onClick={() => setImageZoom(1)}
                            className="cursor-pointer px-1 py-0.5 text-[10px] text-blue-600 hover:text-blue-800"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Right: Review Content */}
            <div className={imageUrl ? 'lg:w-3/5 h-full overflow-y-auto p-4 sm:p-6 sm:pl-2 space-y-4' : 'px-4 pb-4 sm:px-6 sm:pb-6 space-y-4'}>
              {/* Editable header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-medium mb-1">
                    Vendor {getConfidenceDot(ocrConf.vendor)}
                  </label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-medium mb-1">
                    Date {getConfidenceDot(ocrConf.date)}
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. SUPPLIES"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 font-medium mb-1">Payment</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <label className="sm:col-span-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTaxDeductible}
                    onChange={(e) => setIsTaxDeductible(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700">Tax deductible</span>
                </label>

                {/* Property selector (review-existing context, if no property set) */}
                {context === 'review-existing' && !receiptDetail.propertyId && properties && properties.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase text-gray-500 font-medium mb-1">Property</label>
                    <select
                      value={selectedPropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select a property...</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.listingName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Tax Breakdown section */}
              <div className="border border-gray-200 rounded-lg">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-xs font-semibold text-gray-900">Receipt Totals</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-[11px] text-gray-600">Subtotal {getConfidenceDot(ocrConf.subtotal)}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={subtotal}
                        onChange={(e) => { setSubtotal(parseFloat(e.target.value) || 0); setManualSubtotal(true) }}
                        className={`w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          manualSubtotal ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-[11px] text-gray-600">GST (5%) {getConfidenceDot(ocrConf.gst)}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400">$</span>
                      <input
                        type="number" min="0" step="0.01" value={taxGst}
                        onChange={(e) => setTaxGst(parseFloat(e.target.value) || 0)}
                        className="w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-[11px] text-gray-600">PST {getConfidenceDot(ocrConf.pst)}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400">$</span>
                      <input
                        type="number" min="0" step="0.01" value={taxPst}
                        onChange={(e) => setTaxPst(parseFloat(e.target.value) || 0)}
                        className="w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-[11px] text-gray-600">HST {getConfidenceDot(ocrConf.hst)}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400">$</span>
                      <input
                        type="number" min="0" step="0.01" value={taxHst}
                        onChange={(e) => setTaxHst(parseFloat(e.target.value) || 0)}
                        className="w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-[11px] text-gray-600">Tax Total {getConfidenceDot(ocrConf.taxTotal)}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400">$</span>
                      <input
                        type="number" min="0" step="0.01" value={taxTotal}
                        onChange={(e) => { setTaxTotal(parseFloat(e.target.value) || 0); setManualTaxTotal(true) }}
                        className={`w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          manualTaxTotal ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-100">
                    <span className="text-[11px] font-semibold text-gray-900">Grand Total {getConfidenceDot(ocrConf.total)}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-500 font-semibold">$</span>
                      <input
                        type="number" min="0" step="0.01" value={grandTotal}
                        onChange={(e) => { setGrandTotal(parseFloat(e.target.value) || 0); setManualGrandTotal(true) }}
                        className={`w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border rounded text-right font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          manualGrandTotal ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Line items — editable, persisted via API */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-900">Line Items ({lineItems.length})</h3>
                  <span className="text-xs text-gray-500 tabular-nums">Items total: {fmt(lineItemsSubtotal)}</span>
                </div>
                <div className="space-y-2">
                  {lineItems.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-2.5 border-l-4 border-l-gray-300 border-gray-200 bg-white ${
                        savingItemId === item.id ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                setLineItems(prev => prev.map(li => li.id === item.id ? { ...li, name: e.target.value } : li))
                              }}
                              onBlur={(e) => handleUpdateLineItem(item.id, 'name', e.target.value)}
                              className="text-xs font-medium bg-transparent border-0 border-b border-transparent focus:border-gray-300 focus:outline-none focus:ring-0 px-0 py-0 min-w-0 flex-1 text-gray-900"
                            />
                            <button
                              onClick={() => handleDeleteLineItem(item.id)}
                              className="cursor-pointer p-0.5 text-gray-400 hover:text-red-500"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 ml-0">
                            <div className="flex items-center gap-1">
                              <label className="text-[10px] text-gray-400">Qty:</label>
                              <input
                                type="number" min="0" step="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value, 10) || 0
                                  setLineItems(prev => prev.map(li => li.id === item.id
                                    ? { ...li, quantity: qty, totalPrice: Math.round(qty * (Number(li.unitPrice) || 0) * 100) / 100 }
                                    : li
                                  ))
                                }}
                                onBlur={(e) => {
                                  const qty = parseInt(e.target.value, 10) || 0
                                  const total = Math.round(qty * (Number(item.unitPrice) || 0) * 100) / 100
                                  handleUpdateLineItem(item.id, 'quantity', qty)
                                  handleUpdateLineItem(item.id, 'totalPrice', total)
                                }}
                                className="w-[52px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                              />
                            </div>
                            <span className="text-[10px] text-gray-300">x</span>
                            <div className="flex items-center gap-1">
                              <label className="text-[10px] text-gray-400">$</label>
                              <input
                                type="number" min="0" step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const price = parseFloat(e.target.value) || 0
                                  setLineItems(prev => prev.map(li => li.id === item.id
                                    ? { ...li, unitPrice: price, totalPrice: Math.round(li.quantity * price * 100) / 100 }
                                    : li
                                  ))
                                }}
                                onBlur={(e) => {
                                  const price = parseFloat(e.target.value) || 0
                                  const total = Math.round(item.quantity * price * 100) / 100
                                  handleUpdateLineItem(item.id, 'unitPrice', price)
                                  handleUpdateLineItem(item.id, 'totalPrice', total)
                                }}
                                className="w-[72px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                              />
                            </div>
                            <span className="text-[10px] text-gray-300">=</span>
                            <div className="flex items-center gap-1">
                              <label className="text-[10px] text-gray-400">$</label>
                              <input
                                type="number" min="0" step="0.01"
                                value={item.totalPrice}
                                onChange={(e) => {
                                  const total = parseFloat(e.target.value) || 0
                                  setLineItems(prev => prev.map(li => li.id === item.id ? { ...li, totalPrice: total } : li))
                                }}
                                onBlur={(e) => handleUpdateLineItem(item.id, 'totalPrice', parseFloat(e.target.value) || 0)}
                                className="w-[72px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleAddLineItem}
                    className="cursor-pointer w-full border-2 border-dashed border-gray-300 rounded-lg p-2.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <PlusCircleIcon className="w-4 h-4" />
                    Add line item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirm step */}
        {step === 'confirm' && receiptDetail && (
          <div className={imageUrl ? 'absolute inset-0 flex flex-col lg:flex-row' : 'overflow-y-auto h-full'}>
            {/* Left: Receipt Image */}
            {imageUrl && (
              <div className="lg:w-2/5 flex-shrink-0 p-4 sm:p-6 sm:pr-2 overflow-hidden">
                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden h-full">
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                      <DocumentTextIcon className="w-12 h-12 text-gray-400" />
                      <p className="text-xs text-gray-500">PDF Receipt</p>
                      <a href={imageUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg">
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" /> Open PDF
                      </a>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="overflow-auto h-full cursor-grab active:cursor-grabbing"
                        onWheel={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            e.preventDefault()
                            setImageZoom(z => Math.min(4, Math.max(0.5, z + (e.deltaY < 0 ? 0.15 : -0.15))))
                          }
                        }}>
                        <img src={imageUrl} alt="Receipt"
                          className="w-full h-auto object-contain transition-transform duration-150 origin-top-left"
                          style={{ transform: `scale(${imageZoom})` }} draggable={false} />
                      </div>
                      <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm px-1 py-0.5">
                        <button onClick={() => setImageZoom(z => Math.max(0.5, z - 0.25))}
                          className="cursor-pointer p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30" disabled={imageZoom <= 0.5}>
                          <MagnifyingGlassMinusIcon className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] tabular-nums text-gray-500 w-8 text-center">{Math.round(imageZoom * 100)}%</span>
                        <button onClick={() => setImageZoom(z => Math.min(4, z + 0.25))}
                          className="cursor-pointer p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30" disabled={imageZoom >= 4}>
                          <MagnifyingGlassPlusIcon className="w-3.5 h-3.5" />
                        </button>
                        {imageZoom !== 1 && (
                          <button onClick={() => setImageZoom(1)} className="cursor-pointer px-1 py-0.5 text-[10px] text-blue-600 hover:text-blue-800">Reset</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={imageUrl ? 'lg:w-3/5 h-full overflow-y-auto p-4 sm:p-6 sm:pl-2 space-y-4' : 'px-4 pb-4 sm:px-6 sm:pb-6 space-y-4'}>
              {/* Expense header */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Vendor</span><span className="font-medium">{vendorName || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium tabular-nums">{expenseDate}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-medium">{category || 'SUPPLIES'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-medium">{PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod}</span></div>
                  <div className="flex justify-between sm:col-span-2"><span className="text-gray-500">Tax Deductible</span><span className="font-medium">{isTaxDeductible ? 'Yes' : 'No'}</span></div>
                </div>
              </div>

              {/* Supply list mode selector */}
              <div className="border border-gray-200 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-gray-900 mb-2">Supply List</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="supplyListMode" value="none" checked={supplyListMode === 'none'}
                      onChange={() => setSupplyListMode('none')}
                      className="text-blue-600 focus:ring-blue-500" />
                    <span className="text-xs text-gray-700">Expense only (no supply list)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="supplyListMode" value="new" checked={supplyListMode === 'new'}
                      onChange={() => setSupplyListMode('new')}
                      className="text-blue-600 focus:ring-blue-500" />
                    <span className="text-xs text-gray-700">Create new supply list from items</span>
                  </label>
                  {supplyListMode === 'new' && selectedProjectId && (
                    <p className="text-[10px] text-gray-500 ml-6">Will be linked to selected project</p>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="supplyListMode" value="existing" checked={supplyListMode === 'existing'}
                      onChange={() => setSupplyListMode('existing')}
                      className="text-blue-600 focus:ring-blue-500" />
                    <span className="text-xs text-gray-700">Match to existing supply list</span>
                  </label>
                  {supplyListMode === 'existing' && (
                    <div className="ml-6">
                      <input
                        type="text"
                        value={applySupplyListId}
                        onChange={(e) => setApplySupplyListId(e.target.value)}
                        placeholder="Supply list ID"
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Summary */}
              <div className="border border-gray-200 rounded-lg">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-xs font-semibold text-gray-900">Receipt Summary</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-700 truncate mr-2">{item.name}</span>
                      <span className="text-[11px] text-gray-700 tabular-nums flex-shrink-0">{fmt(item.totalPrice)}</span>
                    </div>
                  ))}
                  <div className="px-3 py-0"><div className="border-t border-dashed border-gray-300" /></div>
                  <div className="flex justify-between px-3 py-1.5">
                    <span className="text-[11px] text-gray-600">Subtotal</span>
                    <span className="text-[11px] text-gray-700 tabular-nums">{fmt(subtotal)}</span>
                  </div>
                  {taxGst > 0 && (
                    <div className="flex justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-600">GST (5%)</span>
                      <span className="text-[11px] text-gray-700 tabular-nums">{fmt(taxGst)}</span>
                    </div>
                  )}
                  {taxPst > 0 && (
                    <div className="flex justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-600">PST</span>
                      <span className="text-[11px] text-gray-700 tabular-nums">{fmt(taxPst)}</span>
                    </div>
                  )}
                  {taxHst > 0 && (
                    <div className="flex justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-600">HST</span>
                      <span className="text-[11px] text-gray-700 tabular-nums">{fmt(taxHst)}</span>
                    </div>
                  )}
                  {taxTotal > 0 && (
                    <div className="flex justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-600">Tax Total</span>
                      <span className="text-[11px] text-gray-700 tabular-nums">{fmt(taxTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 bg-gray-100">
                    <span className="text-[11px] font-semibold text-gray-900">GRAND TOTAL</span>
                    <span className="text-[11px] font-semibold text-gray-900 tabular-nums">{fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {(step === 'review' || step === 'confirm') && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-6 flex justify-between items-center gap-3">
          {step === 'review' ? (
            <>
              {context !== 'review-existing' ? (
                <button
                  onClick={() => { setStep('upload'); setSelectedFile(null) }}
                  className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Scan another
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => setStep('confirm')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
              >
                Review Summary
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('review')}
                className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Back to review
              </button>
              <button
                onClick={handleApply}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircleIcon className="w-4 h-4" />
                {submitting ? 'Creating...' : 'Create Expense'}
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
