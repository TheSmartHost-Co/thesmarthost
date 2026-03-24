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
} from '@heroicons/react/24/outline'

interface ReviewReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  supplyListId: string
  receiptId: string
  supplyList: SupplyList | null
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

  const [step, setStep] = useState<Step>('loading')
  const [error, setError] = useState<string | null>(null)

  // Receipt image
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

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

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('loading')
      setError(null)
      setImageUrl(null)
      setIsPdf(false)
      setImageLoading(true)
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
    }
  }, [isOpen])

  // Fetch receipt detail on open
  useEffect(() => {
    if (!isOpen || !supplyListId || !receiptId) return
    loadReceiptDetail()
  }, [isOpen, supplyListId, receiptId])

  const loadReceiptDetail = async () => {
    setStep('loading')
    setError(null)

    try {
      const res = await getSupplyListReceiptById(supplyListId, receiptId)
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
      setAssignments(matchPreview.map(m => {
        if (m.matchedItemId && m.matchScore >= 0.7) {
          return { type: 'match' as const, itemId: m.matchedItemId }
        }
        return { type: 'new' as const }
      }))

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

    const newItemsPayload = assignments
      .map((a, idx) => ({ a, idx }))
      .filter(({ a }) => a.type === 'new')
      .map(({ idx }) => ({
        name: editedItems[idx]?.name ?? matches[idx].lineItemName,
        quantity: editedItems[idx]?.quantity ?? matches[idx].lineItemQuantity,
        unitCost: editedItems[idx]?.unitPrice ?? matches[idx].lineItemUnitPrice,
        totalCost: editedItems[idx]?.totalPrice ?? matches[idx].lineItemTotalPrice,
      }))

    const payload: ApplyReceiptPayload = {
      confirmedMatches: confirmed,
      newItems: newItemsPayload,
      expenseDate,
      vendorName,
      category: category || undefined,
      paymentMethod,
    }

    try {
      const res = await applySupplyListReceipt(supplyListId, receiptId, payload)
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
    const color = confidence >= 0.9 ? 'bg-green-500' : confidence >= 0.7 ? 'bg-amber-500' : 'bg-red-500'
    return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} ml-1`} title={`Confidence: ${Math.round(confidence * 100)}%`} />
  }

  const fmt = (n: number) => `$${n.toFixed(2)}`

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

  const getItemName = (idx: number) => editedItems[idx]?.name ?? matches[idx]?.lineItemName ?? ''
  const getItemTotal = (idx: number) => editedItems[idx]?.totalPrice ?? matches[idx]?.lineItemTotalPrice ?? 0
  const getItemQty = (idx: number) => editedItems[idx]?.quantity ?? matches[idx]?.lineItemQuantity ?? 0
  const getItemUnit = (idx: number) => editedItems[idx]?.unitPrice ?? matches[idx]?.lineItemUnitPrice ?? 0

  const linkedTotal = linkedItems.reduce((sum, { idx }) => sum + getItemTotal(idx), 0)
  const newTotal = newItems.reduce((sum, { idx }) => sum + getItemTotal(idx), 0)
  const activeTotal = linkedTotal + newTotal

  const editedOcrTotal = useMemo(() => {
    return editedItems.reduce((sum, item) => sum + item.totalPrice, 0)
  }, [editedItems])

  const getSupplyItemName = (itemId: string) => {
    return supplyList?.items.find(i => i.id === itemId)?.name || 'Unknown'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} zIndex={zIndex} style="p-0 max-w-4xl w-[calc(100%-1rem)] sm:w-11/12 !overflow-y-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
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

          {/* Loading */}
          {step === 'loading' && !error && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-3 border-blue-200 rounded-full animate-spin border-t-blue-600" />
              <p className="mt-3 text-sm font-medium text-gray-900">Loading receipt...</p>
              <p className="text-xs text-gray-500">Fetching OCR data and matches</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={loadReceiptDetail}
                className="mt-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Review step */}
          {step === 'review' && (
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Left: Receipt Image */}
              <div className="lg:w-2/5 flex-shrink-0">
                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden sticky top-0">
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
                    <img
                      src={imageUrl}
                      alt="Receipt"
                      className="w-full h-auto max-h-[50vh] object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 gap-2">
                      <PhotoIcon className="w-12 h-12 text-gray-300" />
                      <p className="text-xs text-gray-400">Unable to load receipt image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Review Content */}
              <div className="lg:w-3/5 space-y-4">
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
                </div>

                {/* Line items with assignment dropdowns */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-900">Line Items ({matches.length})</h3>
                    <span className="text-xs text-gray-500 tabular-nums">Total: {fmt(editedOcrTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    {matches.map((match, idx) => {
                      const assignment = assignments[idx]
                      const isLinked = assignment?.type === 'match' && !!assignment.itemId
                      const isSkipped = assignment?.type === 'skip'
                      const edited = editedItems[idx]

                      const usedItemIds = new Set(
                        assignments
                          .filter((a, i) => a.type === 'match' && a.itemId && i !== idx)
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
                              {supplyList?.items.map(item => {
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
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirm step */}
          {step === 'confirm' && (
            <div className="space-y-4">
              {/* Expense header */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Vendor</span><span className="font-medium">{vendorName || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium tabular-nums">{expenseDate}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-medium">{category || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-medium">{PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod}</span></div>
                </div>
              </div>

              {/* Linked Items */}
              {linkedItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <LinkIcon className="w-3.5 h-3.5 text-green-600" />
                    <h3 className="text-xs font-semibold text-gray-900">Linked Items ({linkedItems.length})</h3>
                    <span className="text-[10px] text-gray-400 ml-auto tabular-nums">{fmt(linkedTotal)}</span>
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
                  </div>
                </div>
              )}

              {/* New Items */}
              {newItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <PlusCircleIcon className="w-3.5 h-3.5 text-gray-500" />
                    <h3 className="text-xs font-semibold text-gray-900">New Items ({newItems.length})</h3>
                    <span className="text-[10px] text-gray-400 ml-auto tabular-nums">{fmt(newTotal)}</span>
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

              {/* Total */}
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Total</span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(activeTotal)}</span>
              </div>
            </div>
          )}
        </div>
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
