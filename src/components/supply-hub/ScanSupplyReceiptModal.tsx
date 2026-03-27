'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import Modal from '@/components/shared/modal'
import {
  scanSupplyListReceipt,
  applySupplyListReceipt,
} from '@/services/supplyListService'
import type {
  SupplyList,
  ScanReceiptOcrData,
  ScanReceiptMatch,
  ApplyReceiptPayload,
  OcrDataField,
} from '@/services/types/supplyList'
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
  LinkIcon,
  XMarkIcon,
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
}

type Step = 'upload' | 'processing' | 'review' | 'confirm'

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

export default function ScanSupplyReceiptModal({
  isOpen,
  onClose,
  supplyListId,
  supplyList,
  properties,
  onReceiptApplied,
  defaultPropertyId,
  defaultProjectId,
}: ScanSupplyReceiptModalProps) {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore(s => s.showNotification)

  const isReceiptFirst = !supplyListId

  const [step, setStep] = useState<Step>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projects, setProjects] = useState<CleaningProject[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Scan results
  const [receiptId, setReceiptId] = useState('')
  const [ocrData, setOcrData] = useState<ScanReceiptOcrData | null>(null)
  const [matches, setMatches] = useState<ScanReceiptMatch[]>([])

  // Receipt image
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(1)

  // Editable line items
  const [editedItems, setEditedItems] = useState<EditedLineItem[]>([])

  // Editable form fields
  const [vendorName, setVendorName] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('credit_card')

  // Line item assignments: index-aligned with matches array
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

  // OCR confidence
  const [ocrVendorConf, setOcrVendorConf] = useState(0)
  const [ocrDateConf, setOcrDateConf] = useState(0)
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
      setStep('upload')
      setSelectedFile(null)
      setSelectedPropertyId('')
      setSelectedProjectId('')
      setProjects([])
      setError(null)
      setReceiptId('')
      setOcrData(null)
      setMatches([])
      setImageUrl(null)
      setImageZoom(1)
      setEditedItems([])
      setVendorName('')
      setExpenseDate('')
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
      setOcrVendorConf(0)
      setOcrDateConf(0)
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

  // Pre-select property when opened with a default (from ProjectDetailModal)
  useEffect(() => {
    if (isOpen && isReceiptFirst && defaultPropertyId) {
      setSelectedPropertyId(defaultPropertyId)
    }
  }, [isOpen, isReceiptFirst, defaultPropertyId])

  // Pre-select project when projects finish loading (from ProjectDetailModal)
  useEffect(() => {
    if (isOpen && defaultProjectId && projects.length > 0) {
      const match = projects.find(p => p.id === defaultProjectId)
      if (match) setSelectedProjectId(defaultProjectId)
    }
  }, [isOpen, defaultProjectId, projects])

  // Fetch active projects when property changes (receipt-first mode)
  useEffect(() => {
    if (!isReceiptFirst || !selectedPropertyId || !profile?.id) {
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
  }, [isReceiptFirst, selectedPropertyId, profile?.id])

  // Auto-calculation: line items subtotal
  const lineItemsSubtotal = useMemo(() => {
    const ocrSum = editedItems.reduce((sum, item, idx) => {
      if (assignments[idx]?.type === 'skip') return sum
      return sum + item.totalPrice
    }, 0)
    const manualSum = manualLineItems.reduce((sum, item, idx) => {
      if (manualAssignments[idx]?.type === 'skip') return sum
      return sum + item.totalPrice
    }, 0)
    return Math.round((ocrSum + manualSum) * 100) / 100
  }, [editedItems, assignments, manualLineItems, manualAssignments])

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
      const res = await scanSupplyListReceipt(
        selectedFile,
        isReceiptFirst ? { propertyId: selectedPropertyId } : { supplyListId: supplyListId! }
      )
      if (res.status === 'success' && res.data) {
        setReceiptId(res.data.receiptId)
        // Backend may nest OCR data under ocrData.data — unwrap if needed
        const rawOcr = res.data.ocrData as ScanReceiptOcrData | { data: ScanReceiptOcrData; rawResponse?: string }
        const ocr: ScanReceiptOcrData = 'data' in rawOcr && rawOcr.data && 'vendorName' in rawOcr.data ? rawOcr.data : rawOcr as ScanReceiptOcrData
        setOcrData(ocr)
        setImageUrl(res.data.signedUrl || null)

        // Populate form
        setVendorName(ocr.vendorName.value || '')
        setExpenseDate(ocr.expenseDate.value || new Date().toISOString().split('T')[0])

        // Populate confidence
        setOcrVendorConf(ocr.vendorName.confidence)
        setOcrDateConf(ocr.expenseDate.confidence)
        setOcrSubtotalConf(ocr.subtotal?.confidence ?? 0)
        setOcrGstConf(ocr.taxGst?.confidence ?? 0)
        setOcrPstConf(ocr.taxPst?.confidence ?? 0)
        setOcrHstConf(ocr.taxHst?.confidence ?? 0)
        setOcrTaxTotalConf(ocr.taxTotal?.confidence ?? 0)
        setOcrTotalConf(ocr.total?.confidence ?? 0)

        // Populate tax values from OCR
        setTaxGst(ocr.taxGst?.value ?? 0)
        setTaxPst(ocr.taxPst?.value ?? 0)
        setTaxHst(ocr.taxHst?.value ?? 0)

        // If OCR provided subtotal/taxTotal/total, use them as manual overrides
        const ocrSubtotalVal = ocr.subtotal?.value ?? 0
        const ocrTaxTotalVal = ocr.taxTotal?.value ?? 0
        const ocrGrandTotalVal = ocr.total?.value ?? 0

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

        // For receipt-first with no matches, synthesize from OCR line items
        let effectiveMatches = res.data.matches
        if (effectiveMatches.length === 0 && ocr.lineItems) {
          // Handle both formats: array of OcrDataField items, or { value: [...], confidence } wrapper
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawLineItems = ocr.lineItems as any
          const lineItemArray: { name: string; quantity: number; unitPrice?: number; totalPrice?: number; price?: number }[] =
            Array.isArray(rawLineItems)
              ? rawLineItems.map((li: { name: OcrDataField<string>; quantity: OcrDataField<number>; unitPrice: OcrDataField<number>; totalPrice: OcrDataField<number> }) => ({
                  name: li.name.value, quantity: li.quantity.value, unitPrice: li.unitPrice.value, totalPrice: li.totalPrice.value,
                }))
              : Array.isArray(rawLineItems?.value)
                ? rawLineItems.value
                : []

          if (lineItemArray.length > 0) {
            effectiveMatches = lineItemArray.map(li => ({
              lineItemName: li.name,
              lineItemQuantity: li.quantity,
              lineItemUnitPrice: li.unitPrice ?? li.price ?? 0,
              lineItemTotalPrice: li.totalPrice ?? li.price ?? 0,
              matchedItemId: null,
              matchedItemName: null,
              matchScore: 0,
              matchType: 'none' as const,
            }))
          }
        }
        setMatches(effectiveMatches)

        // Initialize editable line items from scan results
        setEditedItems(effectiveMatches.map(m => ({
          name: m.lineItemName,
          quantity: m.lineItemQuantity,
          unitPrice: m.lineItemUnitPrice,
          totalPrice: m.lineItemTotalPrice,
          manualTotal: false,
        })))

        // Initialize assignments from scan results
        const initialAssignments: LineAssignment[] = isReceiptFirst
          ? effectiveMatches.map(() => ({ type: 'new' as const }))
          : effectiveMatches.map(m => {
              if (m.matchedItemId && m.matchScore >= 0.7) {
                return { type: 'match' as const, itemId: m.matchedItemId }
              }
              return { type: 'new' as const }
            })
        setAssignments(initialAssignments)

        setStep('review')
      } else {
        setError(res.message || 'Failed to scan receipt')
        setStep('upload')
      }
    } catch (err) {
      console.error('Scan error:', err)
      setError('Error scanning receipt. Please try again.')
      setStep('upload')
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
    setManualSubtotal(false)
    setManualGrandTotal(false)
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
    if (field !== 'name') { setManualSubtotal(false); setManualGrandTotal(false) }
  }

  // Manual line item helpers
  const addManualItem = () => {
    setManualLineItems(prev => [...prev, { name: '', quantity: 1, unitPrice: 0, totalPrice: 0, manualTotal: false }])
    setManualAssignments(prev => [...prev, { type: 'new' }])
    setManualSubtotal(false)
    setManualGrandTotal(false)
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
    if (field !== 'name') { setManualSubtotal(false); setManualGrandTotal(false) }
  }

  const removeManualItem = (idx: number) => {
    setManualLineItems(prev => prev.filter((_, i) => i !== idx))
    setManualAssignments(prev => prev.filter((_, i) => i !== idx))
    setManualSubtotal(false)
    setManualGrandTotal(false)
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
    setManualSubtotal(false)
    setManualGrandTotal(false)
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

    // Manual items matched to existing supply list items
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

    // Manual items as new
    const manualNewItems = manualAssignments
      .map((a, idx) => ({ a, idx }))
      .filter(({ a }) => a.type === 'new')
      .map(({ idx }) => ({
        name: manualLineItems[idx].name,
        quantity: manualLineItems[idx].quantity,
        unitCost: manualLineItems[idx].unitPrice,
        totalCost: manualLineItems[idx].totalPrice,
      }))

    const payload: ApplyReceiptPayload = {
      ...(isReceiptFirst ? { propertyId: selectedPropertyId } : {}),
      ...(isReceiptFirst && selectedProjectId ? { projectId: selectedProjectId } : {}),
      confirmedMatches: [...confirmed, ...manualConfirmed],
      newItems: [...newItemsPayload, ...manualNewItems],
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

  // Derive linked/new/skipped lists for confirm step (using edited values)
  const linkedItems = assignments
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => a.type === 'match' && a.itemId)
  const newItems = assignments
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => a.type === 'new')
  const skippedItems = assignments
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => a.type === 'skip')

  // Manual item confirm lists
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

  // Compute edited OCR total
  const editedOcrTotal = useMemo(() => {
    return editedItems.reduce((sum, item) => sum + item.totalPrice, 0)
  }, [editedItems])

  // Helper to find supply list item name by id
  const getSupplyItemName = (itemId: string) => {
    return supplyList?.items.find(i => i.id === itemId)?.name || 'Unknown'
  }

  // Active items for confirm step receipt summary
  const activeOcrItems = [...linkedItems, ...newItems]
  const activeManualItems = [...manualLinkedItems, ...manualNewItems2]

  return (
    <Modal isOpen={isOpen} onClose={onClose} style={`p-0 w-[calc(100%-1rem)] sm:w-11/12 !overflow-y-hidden flex flex-col !max-h-[90vh] ${step === 'review' || step === 'confirm' ? '!h-[90vh]' : ''} ${(step === 'review' || step === 'confirm') && imageUrl ? 'max-w-4xl' : 'max-w-2xl'}`}>
      {/* Header — always pinned */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scan Receipt</h2>
            <p className="text-xs text-gray-500">
              {isReceiptFirst
                ? 'Upload a receipt to auto-create a supply list'
                : `${supplyList?.propertyName || 'Supply List'} — ${supplyList?.items.length || 0} items`}
            </p>
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {(['upload', 'processing', 'review', 'confirm'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${
                  step === s ? 'bg-blue-600' :
                  (['upload', 'processing', 'review', 'confirm'].indexOf(step) > i) ? 'bg-blue-300' :
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

              {/* Property selector for receipt-first mode */}
              {isReceiptFirst && properties && properties.length > 0 && (
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

              {/* Project picker (receipt-first mode) */}
              {isReceiptFirst && selectedPropertyId && projects.length > 0 && (
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
                        disabled={isReceiptFirst && !selectedPropertyId}
                        className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <ArrowPathIcon className="w-4 h-4" /> Scan
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
              <p className="mt-3 text-sm font-medium text-gray-900">Scanning receipt...</p>
              <p className="text-xs text-gray-500">Extracting line items and matching to supply list</p>
            </div>
            </div>
          )}

          {/* Review step */}
          {step === 'review' && ocrData && (
            <div className={imageUrl ? 'absolute inset-0 flex flex-col lg:flex-row' : 'overflow-y-auto h-full'}>
              {/* Left: Receipt Image (only if URL available) */}
              {imageUrl && (
                <div className="lg:w-2/5 flex-shrink-0 p-4 sm:p-6 sm:pr-2 overflow-hidden">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden h-full">
                    {selectedFile?.type === 'application/pdf' ? (
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
                    Vendor {getConfidenceDot(ocrVendorConf)}
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
                    Date {getConfidenceDot(ocrDateConf)}
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

                    // Compute used item IDs (excluding current row) to prevent duplicate assignments
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
                        {/* Line item info */}
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
                            {/* Editable qty / unit price / total */}
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
                        {/* Assignment dropdown */}
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
                            <option value="__new__">+ Add as new item</option>
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
                            <option value="__new__">+ Add as new item</option>
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
            <div className={imageUrl ? 'absolute inset-0 flex flex-col lg:flex-row' : 'overflow-y-auto h-full'}>
              {/* Left: Receipt Image (only if URL available) */}
              {imageUrl && (
                <div className="lg:w-2/5 flex-shrink-0 p-4 sm:p-6 sm:pr-2 overflow-hidden">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden h-full">
                    {selectedFile?.type === 'application/pdf' ? (
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
                  <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-medium">{category || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-medium">{PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod}</span></div>
                  <div className="flex justify-between sm:col-span-2"><span className="text-gray-500">Tax Deductible</span><span className="font-medium">{isTaxDeductible ? 'Yes' : 'No'}</span></div>
                  {selectedProjectId && projects.length > 0 && (() => {
                    const proj = projects.find(p => p.id === selectedProjectId)
                    if (!proj) return null
                    const d = parseLocalDate(proj.projectDate.split('T')[0])
                    return (
                      <div className="flex justify-between sm:col-span-2">
                        <span className="text-gray-500">Project</span>
                        <span className="font-medium">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Linked Items section */}
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

              {/* New Items section */}
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

              {/* Skipped Items section */}
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
                          <p className="text-[10px] text-red-400">
                            Won&apos;t be imported
                          </p>
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
                  {/* Tax rows — only show if > 0 */}
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
                onClick={() => { setStep('upload'); setSelectedFile(null) }}
                className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Scan another
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
