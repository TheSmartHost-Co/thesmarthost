'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/shared/modal'
import {
  getSupplyListReceiptById,
  applySupplyListReceipt,
} from '@/services/supplyListService'
import type {
  SupplyList,
  ScanReceiptMatch,
  ApplyReceiptPayload,
} from '@/services/types/supplyList'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  CheckCircleIcon,
  PhotoIcon,
  DocumentTextIcon,
  PlusCircleIcon,
  LinkIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from '@heroicons/react/24/outline'

interface ReviewReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  supplyListId?: string
  receiptId: string
  supplyList?: SupplyList | null
  onReceiptApplied: () => void
  zIndex?: number
}

type Step = 'loading' | 'review' | 'confirm'

interface LineAssignment {
  type: 'match' | 'new' | 'skip'
  itemId?: string
}

interface EditedLineItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  manualTotal: boolean
}

interface ManualLineItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  manualTotal: boolean
}

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'etransfer', label: 'E-Transfer' },
  { value: 'other', label: 'Other' },
]

export default function ReviewReceiptModal({
  isOpen,
  onClose,
  supplyListId,
  receiptId,
  supplyList,
  onReceiptApplied,
  zIndex = 60,
}: ReviewReceiptModalProps) {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore(s => s.showNotification)
  const isReceiptFirst = !supplyListId

  const [step, setStep] = useState<Step>('loading')
  const [error, setError] = useState<string | null>(null)

  // Receipt image
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageZoom, setImageZoom] = useState(1)

  // Scan results
  const [matches, setMatches] = useState<ScanReceiptMatch[]>([])

  // Editable line items
  const [editedItems, setEditedItems] = useState<EditedLineItem[]>([])

  // Editable form fields
  const [vendorName, setVendorName] = useState('')
  const [vendorConfidence, setVendorConfidence] = useState(0)
  const [expenseDate, setExpenseDate] = useState('')
  const [dateConfidence, setDateConfidence] = useState(0)
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('credit_card')

  // Line item assignments
  const [assignments, setAssignments] = useState<LineAssignment[]>([])
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

  // OCR confidence for taxes
  const [ocrSubtotalConf, setOcrSubtotalConf] = useState(0)
  const [ocrGstConf, setOcrGstConf] = useState(0)
  const [ocrPstConf, setOcrPstConf] = useState(0)
  const [ocrHstConf, setOcrHstConf] = useState(0)
  const [ocrTaxTotalConf, setOcrTaxTotalConf] = useState(0)
  const [ocrTotalConf, setOcrTotalConf] = useState(0)

  // Tax deductible
  const [isTaxDeductible, setIsTaxDeductible] = useState(false)

  // Manual line items
  const [manualLineItems, setManualLineItems] = useState<ManualLineItem[]>([])
  const [manualAssignments, setManualAssignments] = useState<LineAssignment[]>([])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('loading')
      setError(null)
      setImageUrl(null)
      setIsPdf(false)
      setImageLoading(true)
      setImageZoom(1)
      setMatches([])
      setEditedItems([])
      setVendorName('')
      setVendorConfidence(0)
      setExpenseDate('')
      setDateConfidence(0)
      setCategory('')
      setPaymentMethod('credit_card')
      setAssignments([])
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
      setOcrSubtotalConf(0)
      setOcrGstConf(0)
      setOcrPstConf(0)
      setOcrHstConf(0)
      setOcrTaxTotalConf(0)
      setOcrTotalConf(0)
      setIsTaxDeductible(false)
      setManualLineItems([])
      setManualAssignments([])
    }
  }, [isOpen])

  // Fetch receipt detail on open
  useEffect(() => {
    if (!isOpen || !supplyListId || !receiptId) return
    loadReceiptDetail()
  }, [isOpen, supplyListId, receiptId])

  // Auto-calculation: line items subtotal
  const lineItemsSubtotal = useMemo(() => {
    const ocrSum = editedItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const manualSum = manualLineItems.reduce((sum, item, idx) => {
      if (manualAssignments[idx]?.type === 'skip') return sum
      return sum + item.totalPrice
    }, 0)
    return Math.round((ocrSum + manualSum) * 100) / 100
  }, [editedItems, manualLineItems, manualAssignments])

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

  const loadReceiptDetail = async () => {
    setStep('loading')
    setError(null)

    try {
      const res = await getSupplyListReceiptById(supplyListId!, receiptId)
      if (res.status !== 'success' || !res.data) {
        setError(res.message || 'Failed to load receipt details')
        return
      }

      const detail = res.data
      const ocrRaw = detail.ocrRaw
      const matchPreview = detail.matchPreview

      // Populate form from OCR
      setVendorName(ocrRaw.vendorName.value || '')
      setVendorConfidence(ocrRaw.vendorName.confidence)
      setExpenseDate(ocrRaw.expenseDate.value || new Date().toISOString().split('T')[0])
      setDateConfidence(ocrRaw.expenseDate.confidence)

      // Populate tax confidence
      setOcrSubtotalConf(ocrRaw.subtotal?.confidence ?? 0)
      setOcrGstConf(ocrRaw.taxGst?.confidence ?? 0)
      setOcrPstConf(ocrRaw.taxPst?.confidence ?? 0)
      setOcrHstConf(ocrRaw.taxHst?.confidence ?? 0)
      setOcrTaxTotalConf(ocrRaw.taxTotal?.confidence ?? 0)
      setOcrTotalConf(ocrRaw.total?.confidence ?? 0)

      // Populate tax values from OCR
      setTaxGst(ocrRaw.taxGst?.value ?? 0)
      setTaxPst(ocrRaw.taxPst?.value ?? 0)
      setTaxHst(ocrRaw.taxHst?.value ?? 0)

      // If OCR provided subtotal/taxTotal/total, use them as manual overrides
      const ocrSubtotalVal = ocrRaw.subtotal?.value ?? 0
      const ocrTaxTotalVal = ocrRaw.taxTotal?.value ?? 0
      const ocrGrandTotalVal = ocrRaw.total?.value ?? 0

      if (ocrSubtotalVal > 0) {
        setSubtotal(ocrSubtotalVal)
        setManualSubtotal(true)
      }
      if (ocrTaxTotalVal > 0) {
        setTaxTotal(ocrTaxTotalVal)
        setManualTaxTotal(true)
      }
      if (ocrGrandTotalVal > 0) {
        setGrandTotal(ocrGrandTotalVal)
        setManualGrandTotal(true)
      }

      // Set matches and edited items from matchPreview
      setMatches(matchPreview)
      setEditedItems(matchPreview.map(m => ({
        name: m.lineItemName,
        quantity: m.lineItemQuantity,
        unitPrice: m.lineItemUnitPrice,
        totalPrice: m.lineItemTotalPrice,
        manualTotal: false,
      })))

      // Initialize assignments
      setAssignments(isReceiptFirst
        ? matchPreview.map(() => ({ type: 'new' as const }))
        : matchPreview.map(m => {
            if (m.matchedItemId && m.matchScore >= 0.7) {
              return { type: 'match' as const, itemId: m.matchedItemId }
            }
            return { type: 'new' as const }
          })
      )

      // Use signed URL from backend response
      setIsPdf(detail.mimeType === 'application/pdf')
      if (detail.signedUrl) {
        setImageUrl(detail.signedUrl)
      }
      setImageLoading(false)

      setStep('review')
    } catch (err) {
      console.error('Error loading receipt:', err)
      setError('Failed to load receipt details')
    }
  }

  const updateAssignment = (idx: number, value: string) => {
    setAssignments(prev => {
      const next = [...prev]
      if (value === '__skip__') {
        next[idx] = { type: 'skip' }
      } else if (value === '__new__') {
        next[idx] = { type: 'new' }
      } else {
        next[idx] = { type: 'match', itemId: value }
      }
      return next
    })
  }

  const updateEditedItem = (idx: number, field: 'name' | 'quantity' | 'unitPrice' | 'totalPrice', value: number | string) => {
    setEditedItems(prev => {
      const next = [...prev]
      const item = { ...next[idx] }
      if (field === 'name') {
        item.name = value as string
      } else if (field === 'quantity') {
        item.quantity = value as number
        if (!item.manualTotal) item.totalPrice = Math.round((value as number) * item.unitPrice * 100) / 100
      } else if (field === 'unitPrice') {
        item.unitPrice = value as number
        if (!item.manualTotal) item.totalPrice = Math.round(item.quantity * (value as number) * 100) / 100
      } else {
        item.totalPrice = value as number
        item.manualTotal = true
      }
      next[idx] = item
      return next
    })
  }

  // Manual line item helpers
  const addManualItem = () => {
    setManualLineItems(prev => [...prev, { name: '', quantity: 1, unitPrice: 0, totalPrice: 0, manualTotal: false }])
    setManualAssignments(prev => [...prev, { type: 'new' }])
  }

  const updateManualItem = (idx: number, field: 'name' | 'quantity' | 'unitPrice' | 'totalPrice', value: number | string) => {
    setManualLineItems(prev => {
      const next = [...prev]
      const item = { ...next[idx] }
      if (field === 'name') {
        item.name = value as string
      } else if (field === 'quantity') {
        item.quantity = value as number
        if (!item.manualTotal) item.totalPrice = Math.round((value as number) * item.unitPrice * 100) / 100
      } else if (field === 'unitPrice') {
        item.unitPrice = value as number
        if (!item.manualTotal) item.totalPrice = Math.round(item.quantity * (value as number) * 100) / 100
      } else {
        item.totalPrice = value as number
        item.manualTotal = true
      }
      next[idx] = item
      return next
    })
  }

  const removeManualItem = (idx: number) => {
    setManualLineItems(prev => prev.filter((_, i) => i !== idx))
    setManualAssignments(prev => prev.filter((_, i) => i !== idx))
  }

  const updateManualAssignment = (idx: number, value: string) => {
    setManualAssignments(prev => {
      const next = [...prev]
      if (value === '__skip__') {
        next[idx] = { type: 'skip' }
      } else if (value === '__new__') {
        next[idx] = { type: 'new' }
      } else {
        next[idx] = { type: 'match', itemId: value }
      }
      return next
    })
  }

  const handleApply = async () => {
    if (!profile?.id) return
    setSubmitting(true)

    const confirmed = assignments
      .map((a, idx) => ({ a, idx }))
      .filter(({ a }) => a.type === 'match' && a.itemId)
      .map(({ a, idx }) => ({
        itemId: a.itemId!,
        unitCost: editedItems[idx]?.unitPrice ?? matches[idx].lineItemUnitPrice,
        totalCost: editedItems[idx]?.totalPrice ?? matches[idx].lineItemTotalPrice,
      }))

    const manualConfirmed = manualAssignments
      .map((a, idx) => ({ a, idx }))
      .filter(({ a }) => a.type === 'match' && a.itemId)
      .map(({ a, idx }) => ({
        itemId: a.itemId!,
        unitCost: manualLineItems[idx].unitPrice,
        totalCost: manualLineItems[idx].totalPrice,
      }))

    const newItemsPayload = assignments
      .map((a, idx) => ({ a, idx }))
      .filter(({ a }) => a.type === 'new')
      .map(({ idx }) => ({
        name: editedItems[idx]?.name ?? matches[idx].lineItemName,
        quantity: editedItems[idx]?.quantity ?? matches[idx].lineItemQuantity,
        unitCost: editedItems[idx]?.unitPrice ?? matches[idx].lineItemUnitPrice,
        totalCost: editedItems[idx]?.totalPrice ?? matches[idx].lineItemTotalPrice,
      }))

    const manualNewPayload = manualAssignments
      .map((a, idx) => ({ a, idx }))
      .filter(({ a }) => a.type === 'new')
      .map(({ idx }) => ({
        name: manualLineItems[idx].name,
        quantity: manualLineItems[idx].quantity,
        unitCost: manualLineItems[idx].unitPrice,
        totalCost: manualLineItems[idx].totalPrice,
      }))

    const payload: ApplyReceiptPayload = {
      confirmedMatches: [...confirmed, ...manualConfirmed],
      newItems: [...newItemsPayload, ...manualNewPayload],
      expenseDate,
      vendorName,
      category: category || undefined,
      paymentMethod,
      subtotal,
      taxGst,
      taxPst,
      taxHst,
      taxTotal,
      isTaxDeductible,
    }

    try {
      const res = await applySupplyListReceipt(receiptId, payload)
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

  const getMatchBadge = (match: ScanReceiptMatch) => {
    if (match.matchType === 'exact') return <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Exact</span>
    if (match.matchType === 'fuzzy') return <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Fuzzy {Math.round(match.matchScore * 100)}%</span>
    return <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">No match</span>
  }

  const getConfidenceDot = (confidence: number) => {
    if (!confidence) return null
    const color = confidence >= 0.9 ? 'bg-green-500' : confidence >= 0.7 ? 'bg-amber-500' : 'bg-red-500'
    return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} ml-1`} title={`${Math.round(confidence * 100)}%`} />
  }

  const fmt = (n: number) => `$${n.toFixed(2)}`

  // All used item IDs across OCR and manual assignments
  const allUsedItemIds = useMemo(() => {
    const ids = new Set<string>()
    assignments.forEach(a => { if (a.type === 'match' && a.itemId) ids.add(a.itemId) })
    manualAssignments.forEach(a => { if (a.type === 'match' && a.itemId) ids.add(a.itemId) })
    return ids
  }, [assignments, manualAssignments])

  // Derive linked/new/skipped for confirm step
  const linkedItems = assignments
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => a.type === 'match' && a.itemId)
  const newItems = assignments
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => a.type === 'new')
  const skippedItems = assignments
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => a.type === 'skip')

  const manualLinkedItems = manualAssignments
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => a.type === 'match' && a.itemId)
  const manualNewItems2 = manualAssignments
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => a.type === 'new')

  const getItemName = (idx: number) => editedItems[idx]?.name ?? matches[idx]?.lineItemName ?? ''
  const getItemTotal = (idx: number) => editedItems[idx]?.totalPrice ?? matches[idx]?.lineItemTotalPrice ?? 0
  const getItemQty = (idx: number) => editedItems[idx]?.quantity ?? matches[idx]?.lineItemQuantity ?? 0
  const getItemUnit = (idx: number) => editedItems[idx]?.unitPrice ?? matches[idx]?.lineItemUnitPrice ?? 0

  const editedOcrTotal = useMemo(() => {
    return editedItems.reduce((sum, item) => sum + item.totalPrice, 0)
  }, [editedItems])

  const getSupplyItemName = (itemId: string) => {
    return supplyList?.items.find(i => i.id === itemId)?.name || 'Unknown'
  }

  // Active items for confirm step receipt summary
  const activeOcrItems = [...linkedItems, ...newItems]
  const activeManualItems = [...manualLinkedItems, ...manualNewItems2]

  return (
    <Modal isOpen={isOpen} onClose={onClose} zIndex={zIndex} style="p-0 max-w-4xl max-h-[90vh] w-[calc(100%-1rem)] sm:w-11/12 !overflow-y-hidden flex flex-col">
      {/* Header — always pinned */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Review Receipt</h2>
              <p className="text-xs text-gray-500">
                {supplyList?.propertyName || 'Supply List'} — {supplyList?.items.length || 0} items
              </p>
            </div>
            {step !== 'loading' && (
              <div className="flex items-center gap-1.5">
                {(['review', 'confirm'] as const).map((s, i) => (
                  <div
                    key={s}
                    className={`w-2 h-2 rounded-full ${
                      step === s ? 'bg-blue-600' :
                      (['review', 'confirm'].indexOf(step) > i) ? 'bg-blue-300' :
                      'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">

          {/* Loading */}
          {step === 'loading' && !error && (
            <div className="overflow-y-auto h-full px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-3 border-blue-200 rounded-full animate-spin border-t-blue-600" />
              <p className="mt-3 text-sm font-medium text-gray-900">Loading receipt...</p>
              <p className="text-xs text-gray-500">Fetching OCR data and matches</p>
            </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="overflow-y-auto h-full px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={loadReceiptDetail}
                className="mt-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg cursor-pointer"
              >
                Try Again
              </button>
            </div>
            </div>
          )}

          {/* Review step */}
          {step === 'review' && (
            <div className="absolute inset-0 flex flex-col lg:flex-row">
              {/* Left: Receipt Image */}
              <div className="lg:w-2/5 flex-shrink-0 p-4 sm:p-6 sm:pr-2 overflow-hidden">
                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden h-full">
                  {imageLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  ) : isPdf ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                      <DocumentTextIcon className="w-12 h-12 text-gray-400" />
                      <p className="text-xs text-gray-500">PDF Receipt</p>
                      {imageUrl && (
                        <a
                          href={imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        >
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                          Open PDF
                        </a>
                      )}
                    </div>
                  ) : imageUrl ? (
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
                      {/* Zoom controls */}
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
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 gap-2">
                      <PhotoIcon className="w-12 h-12 text-gray-300" />
                      <p className="text-xs text-gray-400">Unable to load receipt image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Review Content */}
              <div className="lg:w-3/5 h-full overflow-y-auto p-4 sm:p-6 sm:pl-2 space-y-4">
                {/* Editable header fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-gray-500 font-medium mb-1">
                      Vendor {getConfidenceDot(vendorConfidence)}
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
                      Date {getConfidenceDot(dateConfidence)}
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
                      placeholder="e.g. cleaning_supplies"
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
                </div>

                {/* Tax Breakdown section */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-900">Receipt Totals</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {/* Subtotal */}
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-600">Subtotal {getConfidenceDot(ocrSubtotalConf)}</span>
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
                    {/* GST */}
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-600">GST (5%) {getConfidenceDot(ocrGstConf)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={taxGst}
                          onChange={(e) => setTaxGst(parseFloat(e.target.value) || 0)}
                          className="w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    {/* PST */}
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-600">PST {getConfidenceDot(ocrPstConf)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={taxPst}
                          onChange={(e) => setTaxPst(parseFloat(e.target.value) || 0)}
                          className="w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    {/* HST */}
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-600">HST {getConfidenceDot(ocrHstConf)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={taxHst}
                          onChange={(e) => setTaxHst(parseFloat(e.target.value) || 0)}
                          className="w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    {/* Tax Total */}
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-600">Tax Total {getConfidenceDot(ocrTaxTotalConf)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={taxTotal}
                          onChange={(e) => { setTaxTotal(parseFloat(e.target.value) || 0); setManualTaxTotal(true) }}
                          className={`w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            manualTaxTotal ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                          }`}
                        />
                      </div>
                    </div>
                    {/* Grand Total */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-100">
                      <span className="text-[11px] font-semibold text-gray-900">Grand Total {getConfidenceDot(ocrTotalConf)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-500 font-semibold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={grandTotal}
                          onChange={(e) => { setGrandTotal(parseFloat(e.target.value) || 0); setManualGrandTotal(true) }}
                          className={`w-[80px] px-1.5 py-0.5 text-[11px] tabular-nums border rounded text-right font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            manualGrandTotal ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line items with assignment dropdowns */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-900">Line Items ({matches.length + manualLineItems.length})</h3>
                    <span className="text-xs text-gray-500 tabular-nums">Items total: {fmt(lineItemsSubtotal)}</span>
                  </div>
                  <div className="space-y-2">
                    {matches.map((match, idx) => {
                      const assignment = assignments[idx]
                      const isLinked = assignment?.type === 'match' && !!assignment.itemId
                      const isSkipped = assignment?.type === 'skip'
                      const edited = editedItems[idx]

                      const usedItemIds = new Set(
                        [...assignments, ...manualAssignments]
                          .filter((a, i) => {
                            if (i === idx && i < assignments.length) return false
                            return a.type === 'match' && a.itemId
                          })
                          .map(a => a.itemId!)
                      )

                      return (
                        <div
                          key={idx}
                          className={`border rounded-lg p-2.5 border-l-4 ${
                            isSkipped
                              ? 'border-l-red-400 border-gray-200 bg-red-50/30 opacity-60'
                              : isLinked
                                ? 'border-l-green-500 border-gray-200 bg-green-50/30'
                                : 'border-l-gray-300 border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {isSkipped ? (
                                  <XMarkIcon className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                ) : isLinked ? (
                                  <LinkIcon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                ) : (
                                  <PlusCircleIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                )}
                                <input
                                  type="text"
                                  value={edited?.name ?? match.lineItemName}
                                  onChange={(e) => updateEditedItem(idx, 'name', e.target.value)}
                                  className={`text-xs font-medium bg-transparent border-0 border-b border-transparent focus:border-gray-300 focus:outline-none focus:ring-0 px-0 py-0 min-w-0 flex-1 ${isSkipped ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                                />
                                {!isSkipped && getMatchBadge(match)}
                              </div>
                              <div className={`flex items-center gap-2 ml-5 ${isSkipped ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="flex items-center gap-1">
                                  <label className="text-[10px] text-gray-400">Qty:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={edited?.quantity ?? match.lineItemQuantity}
                                    onChange={(e) => updateEditedItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-[52px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                  />
                                </div>
                                <span className="text-[10px] text-gray-300">x</span>
                                <div className="flex items-center gap-1">
                                  <label className="text-[10px] text-gray-400">$</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={edited?.unitPrice ?? match.lineItemUnitPrice}
                                    onChange={(e) => updateEditedItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    className="w-[72px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                  />
                                </div>
                                <span className="text-[10px] text-gray-300">=</span>
                                <div className="flex items-center gap-1">
                                  <label className="text-[10px] text-gray-400">$</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={edited?.totalPrice ?? match.lineItemTotalPrice}
                                    onChange={(e) => updateEditedItem(idx, 'totalPrice', parseFloat(e.target.value) || 0)}
                                    className={`w-[72px] px-1.5 py-0.5 text-[11px] tabular-nums border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right font-medium ${
                                      edited?.manualTotal ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="ml-5">
                            <label className="block text-[10px] text-gray-400 mb-0.5">Link to:</label>
                            <select
                              value={
                                isSkipped ? '__skip__' :
                                assignment?.type === 'match' && assignment.itemId ? assignment.itemId : '__new__'
                              }
                              onChange={(e) => updateAssignment(idx, e.target.value)}
                              className={`w-full px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isSkipped
                                  ? 'border-red-300 bg-red-50 text-red-700'
                                  : isLinked
                                    ? 'border-green-300 bg-green-50 text-green-800'
                                    : 'border-gray-200 bg-white text-gray-700'
                              }`}
                            >
                              <option value="__skip__">Skip — don&apos;t import</option>
                              <option value="__new__">+ Create new item</option>
                              {!isReceiptFirst && supplyList?.items.map(item => {
                                const isUsed = usedItemIds.has(item.id)
                                return (
                                  <option key={item.id} value={item.id} disabled={isUsed}>
                                    {item.name} (qty: {item.quantity}){isUsed ? ' (already assigned)' : ''}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        </div>
                      )
                    })}

                    {/* Manual line items */}
                    {manualLineItems.map((item, idx) => {
                      const assignment = manualAssignments[idx]
                      const isLinked = assignment?.type === 'match' && !!assignment.itemId
                      const isSkipped = assignment?.type === 'skip'

                      const usedItemIds = new Set(
                        [...assignments, ...manualAssignments]
                          .filter((a, i) => {
                            if (i === assignments.length + idx) return false
                            return a.type === 'match' && a.itemId
                          })
                          .map(a => a.itemId!)
                      )

                      return (
                        <div
                          key={`manual-${idx}`}
                          className={`border rounded-lg p-2.5 border-l-4 border-l-blue-300 border-dashed ${
                            isSkipped ? 'border-gray-200 bg-red-50/30 opacity-60' :
                            isLinked ? 'border-gray-200 bg-green-50/30' :
                            'border-gray-200 bg-blue-50/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <PlusCircleIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateManualItem(idx, 'name', e.target.value)}
                                  placeholder="Item name"
                                  className="text-xs font-medium bg-transparent border-0 border-b border-transparent focus:border-gray-300 focus:outline-none focus:ring-0 px-0 py-0 min-w-0 flex-1 text-gray-900"
                                />
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Manual</span>
                                <button onClick={() => removeManualItem(idx)} className="cursor-pointer p-0.5 text-gray-400 hover:text-red-500">
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className={`flex items-center gap-2 ml-5 ${isSkipped ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="flex items-center gap-1">
                                  <label className="text-[10px] text-gray-400">Qty:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={item.quantity}
                                    onChange={(e) => updateManualItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-[52px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                  />
                                </div>
                                <span className="text-[10px] text-gray-300">x</span>
                                <div className="flex items-center gap-1">
                                  <label className="text-[10px] text-gray-400">$</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => updateManualItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    className="w-[72px] px-1.5 py-0.5 text-[11px] tabular-nums border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                  />
                                </div>
                                <span className="text-[10px] text-gray-300">=</span>
                                <div className="flex items-center gap-1">
                                  <label className="text-[10px] text-gray-400">$</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.totalPrice}
                                    onChange={(e) => updateManualItem(idx, 'totalPrice', parseFloat(e.target.value) || 0)}
                                    className={`w-[72px] px-1.5 py-0.5 text-[11px] tabular-nums border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right font-medium ${
                                      item.manualTotal ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="ml-5">
                            <label className="block text-[10px] text-gray-400 mb-0.5">Link to:</label>
                            <select
                              value={
                                isSkipped ? '__skip__' :
                                assignment?.type === 'match' && assignment.itemId ? assignment.itemId : '__new__'
                              }
                              onChange={(e) => updateManualAssignment(idx, e.target.value)}
                              className={`w-full px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isSkipped
                                  ? 'border-red-300 bg-red-50 text-red-700'
                                  : isLinked
                                    ? 'border-green-300 bg-green-50 text-green-800'
                                    : 'border-gray-200 bg-white text-gray-700'
                              }`}
                            >
                              <option value="__skip__">Skip — don&apos;t import</option>
                              <option value="__new__">+ Create new item</option>
                              {!isReceiptFirst && supplyList?.items.map(sItem => {
                                const isUsed = usedItemIds.has(sItem.id)
                                return (
                                  <option key={sItem.id} value={sItem.id} disabled={isUsed}>
                                    {sItem.name} (qty: {sItem.quantity}){isUsed ? ' (already assigned)' : ''}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        </div>
                      )
                    })}

                    {/* Add manual line item button */}
                    <button
                      onClick={addManualItem}
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
          {step === 'confirm' && (
            <div className="absolute inset-0 flex flex-col lg:flex-row">
              {/* Left: Receipt Image */}
              <div className="lg:w-2/5 flex-shrink-0 p-4 sm:p-6 sm:pr-2 overflow-hidden">
                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden h-full">
                  {imageLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  ) : isPdf ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                      <DocumentTextIcon className="w-12 h-12 text-gray-400" />
                      <p className="text-xs text-gray-500">PDF Receipt</p>
                      {imageUrl && (
                        <a
                          href={imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        >
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                          Open PDF
                        </a>
                      )}
                    </div>
                  ) : imageUrl ? (
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
                      {/* Zoom controls */}
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
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 gap-2">
                      <PhotoIcon className="w-12 h-12 text-gray-300" />
                      <p className="text-xs text-gray-400">Unable to load receipt image</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Right: Confirm Content */}
              <div className="lg:w-3/5 h-full overflow-y-auto p-4 sm:p-6 sm:pl-2 space-y-4">
              {/* Expense header */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Vendor</span><span className="font-medium">{vendorName || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium tabular-nums">{expenseDate}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-medium">{category || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-medium">{PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod}</span></div>
                  <div className="flex justify-between sm:col-span-2"><span className="text-gray-500">Tax Deductible</span><span className="font-medium">{isTaxDeductible ? 'Yes' : 'No'}</span></div>
                </div>
              </div>

              {/* Linked Items */}
              {(linkedItems.length > 0 || manualLinkedItems.length > 0) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <LinkIcon className="w-3.5 h-3.5 text-green-600" />
                    <h3 className="text-xs font-semibold text-gray-900">Linked Items ({linkedItems.length + manualLinkedItems.length})</h3>
                  </div>
                  <div className="border border-green-200 rounded-lg divide-y divide-green-100 bg-green-50/30">
                    {linkedItems.map(({ a, idx }) => (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-900 truncate">{getItemName(idx)}</p>
                          <p className="text-[10px] text-green-600 truncate">
                            → {getSupplyItemName(a.itemId!)}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-gray-700 tabular-nums flex-shrink-0">
                          {fmt(getItemTotal(idx))}
                        </span>
                      </div>
                    ))}
                    {manualLinkedItems.map(({ a, idx }) => (
                      <div key={`m-${idx}`} className="px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-900 truncate">{manualLineItems[idx].name}</p>
                          <p className="text-[10px] text-green-600 truncate">
                            → {getSupplyItemName(a.itemId!)}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-gray-700 tabular-nums flex-shrink-0">
                          {fmt(manualLineItems[idx].totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Items */}
              {(newItems.length > 0 || manualNewItems2.length > 0) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <PlusCircleIcon className="w-3.5 h-3.5 text-gray-500" />
                    <h3 className="text-xs font-semibold text-gray-900">New Items ({newItems.length + manualNewItems2.length})</h3>
                  </div>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-gray-50/50">
                    {newItems.map(({ idx }) => (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-900 truncate">{getItemName(idx)}</p>
                          <p className="text-[10px] text-gray-400">
                            Qty: {getItemQty(idx)} x {fmt(getItemUnit(idx))}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-gray-700 tabular-nums flex-shrink-0">
                          {fmt(getItemTotal(idx))}
                        </span>
                      </div>
                    ))}
                    {manualNewItems2.map(({ idx }) => (
                      <div key={`m-${idx}`} className="px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-900 truncate">{manualLineItems[idx].name}</p>
                          <p className="text-[10px] text-gray-400">
                            Qty: {manualLineItems[idx].quantity} x {fmt(manualLineItems[idx].unitPrice)}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-gray-700 tabular-nums flex-shrink-0">
                          {fmt(manualLineItems[idx].totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped Items */}
              {skippedItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <XMarkIcon className="w-3.5 h-3.5 text-red-500" />
                    <h3 className="text-xs font-semibold text-gray-900">Skipped Items ({skippedItems.length})</h3>
                  </div>
                  <div className="border border-red-200 rounded-lg divide-y divide-red-100 bg-red-50/30">
                    {skippedItems.map(({ idx }) => (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 truncate line-through">{getItemName(idx)}</p>
                          <p className="text-[10px] text-red-400">Won&apos;t be imported</p>
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums flex-shrink-0 line-through">
                          {fmt(getItemTotal(idx))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Receipt Summary */}
              <div className="border border-gray-200 rounded-lg">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-xs font-semibold text-gray-900">Receipt Summary</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {activeOcrItems.map(({ idx }) => (
                    <div key={idx} className="flex justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-700 truncate mr-2">{getItemName(idx)}</span>
                      <span className="text-[11px] text-gray-700 tabular-nums flex-shrink-0">{fmt(getItemTotal(idx))}</span>
                    </div>
                  ))}
                  {activeManualItems.map(({ idx }) => (
                    <div key={`m-${idx}`} className="flex justify-between px-3 py-1.5">
                      <span className="text-[11px] text-gray-700 truncate mr-2">{manualLineItems[idx].name}</span>
                      <span className="text-[11px] text-gray-700 tabular-nums flex-shrink-0">{fmt(manualLineItems[idx].totalPrice)}</span>
                    </div>
                  ))}
                  {/* Dashed separator */}
                  <div className="px-3 py-0">
                    <div className="border-t border-dashed border-gray-300" />
                  </div>
                  {/* Subtotal */}
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
                  {/* Grand Total */}
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
              <button
                onClick={onClose}
                className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
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
                Back to matches
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
