'use client'

import { notifyError } from '@/utils/notify'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Modal from '@/components/shared/modal'
import {
  createPaystub,
  getAvailableTimeEntries,
  getAvailablePaystubExpenses,
  updatePaystubItem,
  getPaystubById,
} from '@/services/paystubService'
import type {
  Paystub,
  AvailableTimeEntry,
  AvailablePaystubExpense,
  PaystubExtraItemPayload,
} from '@/services/types/paystub'
import { searchReceipts, uploadReceipt } from '@/services/receiptService'
import type { UploadedReceipt, UploadReceiptResponse } from '@/services/types/receipt'
import { getProperties } from '@/services/propertyService'
import type { Property } from '@/services/types/property'
import { updateReceipt } from '@/services/receiptService'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  ClockIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  CurrencyDollarIcon,
  PlusIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  ShoppingCartIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { formatHours, formatMoney } from '@/lib/format'
import ExpenseViewerModal from '@/components/expenses/ExpenseViewerModal'
import ReceiptDetailModal from '@/components/receipt/detail/ReceiptDetailModal'

// ---- Types & helpers -------------------------------------------------------

interface CreatePaystubModalProps {
  isOpen: boolean
  onClose: () => void
  teamMemberId: string
  teamMemberName?: string
  isPM: boolean
  userId: string
  onCreated: (paystub: Paystub) => void
}

interface ExtraItemDraft extends PaystubExtraItemPayload {
  _id: string
}

interface TimeEntryOverride {
  hoursWorked: number
  amount: number
  amountManuallySet: boolean
}

const formatDateInput = (d: Date): string => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const todayISO = () => formatDateInput(new Date())

const isDateInRange = (date: string | null | undefined, start: string, end: string): boolean => {
  if (!date) return true
  if (start && date < start) return false
  if (end && date > end) return false
  return true
}

const calcAmount = (hours: number, rate: number | null | undefined): number => {
  if (rate == null) return 0
  return Math.round(hours * rate * 100) / 100
}

// Receipt money fields come from Postgres NUMERIC columns, which `pg` serializes as
// STRINGS (e.g. "75.71") despite the `number` TS type. Doing math on them concatenates
// ("0"+"75.71"), and formatMoney rejects non-finite input — so the builder rendered a
// blank/$0 receipt total even though the value was present (PAYSTUB-004). Coerce first.
// subtotal+tax is authoritative with a fallback to the grand-total column, matching the
// backend's `(subtotal+tax) || total` (paystubs.controller.js).
const receiptDisplayAmount = (r: UploadedReceipt): number => {
  const subtotal = Number(r.subtotal ?? 0)
  const taxTotal = Number(r.taxTotal ?? 0)
  const total = Number(r.total ?? 0)
  return (subtotal + taxTotal) || total
}

// ---- Component -------------------------------------------------------------

const CreatePaystubModal: React.FC<CreatePaystubModalProps> = ({
  isOpen, onClose, teamMemberId, teamMemberName, isPM, userId, onCreated,
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)

  // ─── Period + filters ────────────────────────────────────────────────────
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [payDate, setPayDate] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // ─── Available items ─────────────────────────────────────────────────────
  const [availableTimeEntries, setAvailableTimeEntries] = useState<AvailableTimeEntry[]>([])
  const [availableExpenses, setAvailableExpenses] = useState<AvailablePaystubExpense[]>([])
  const [matchedReceipts, setMatchedReceipts] = useState<UploadedReceipt[]>([])
  const [loadingTimeEntries, setLoadingTimeEntries] = useState(false)
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [loadingReceipts, setLoadingReceipts] = useState(false)

  // ─── Selections + per-item overrides ─────────────────────────────────────
  const [selectedTimeEntryIds, setSelectedTimeEntryIds] = useState<Set<string>>(new Set())
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set())
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set())
  const [extraItems, setExtraItems] = useState<ExtraItemDraft[]>([])
  const [timeEntryOverrides, setTimeEntryOverrides] = useState<Map<string, TimeEntryOverride>>(new Map())
  const [receiptPropertyOverrides, setReceiptPropertyOverrides] = useState<Record<string, string>>({})

  // ─── Properties (for filter + extra-item dropdown + receipt overrides + ReceiptDetailModal) ──
  const [properties, setProperties] = useState<Property[]>([])

  // ─── Extra-item draft form ───────────────────────────────────────────────
  const [extraDesc, setExtraDesc] = useState('')
  const [extraAmount, setExtraAmount] = useState('')
  const [extraPropertyId, setExtraPropertyId] = useState('')

  // ─── Receipt upload ──────────────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadFilePreview, setUploadFilePreview] = useState<string | null>(null)
  const [uploadPropertyId, setUploadPropertyId] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // ─── Cart + submit + confirmation + conflict ─────────────────────────────
  const [cartExpanded, setCartExpanded] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [periodConflict, setPeriodConflict] = useState<{
    timeEntries: AvailableTimeEntry[]
    expenses: AvailablePaystubExpense[]
    receipts: UploadedReceipt[]
  } | null>(null)

  // ─── Per-row editor sub-modals ───────────────────────────────────────────
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null)

  // ─── Derived counts ──────────────────────────────────────────────────────
  const timeEntryCount = selectedTimeEntryIds.size
  const expenseCount = selectedExpenseIds.size
  const receiptCount = selectedReceiptIds.size
  const extraCount = extraItems.length
  const totalItemCount = timeEntryCount + expenseCount + receiptCount + extraCount

  // Auto-dismiss confirmation if all items removed
  useEffect(() => {
    if (showConfirmation && totalItemCount === 0) setShowConfirmation(false)
  }, [showConfirmation, totalItemCount])

  // ─── Reset on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    setPeriodStart(formatDateInput(first))
    setPeriodEnd(formatDateInput(now))
    const pd = new Date()
    pd.setDate(pd.getDate() + 5)
    setPayDate(formatDateInput(pd))
    setPropertyFilter('')
    setSearchQuery('')
    setSelectedTimeEntryIds(new Set())
    setSelectedExpenseIds(new Set())
    setSelectedReceiptIds(new Set())
    setExtraItems([])
    setTimeEntryOverrides(new Map())
    setReceiptPropertyOverrides({})
    setExtraDesc('')
    setExtraAmount('')
    setExtraPropertyId('')
    setUploadFile(null)
    setUploadFilePreview(null)
    setUploadPropertyId('')
    setIsUploading(false)
    setIsDragOver(false)
    setCartExpanded(false)
    setShowConfirmation(false)
    setIsSubmitting(false)
    setPeriodConflict(null)
  }, [isOpen])

  // ─── Load properties ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !userId) return
    getProperties(userId).then((res) => {
      if (res.status === 'success') setProperties(res.data)
    }).catch(console.error)
  }, [isOpen, userId])

  // ─── Date presets ────────────────────────────────────────────────────────
  const applyPreset = (preset: 'last7' | 'last30' | 'thisMonth' | 'lastMonth') => {
    const now = new Date()
    if (preset === 'last7') {
      const d = new Date(); d.setDate(d.getDate() - 7)
      setPeriodStart(formatDateInput(d))
      setPeriodEnd(formatDateInput(now))
    } else if (preset === 'last30') {
      const d = new Date(); d.setDate(d.getDate() - 30)
      setPeriodStart(formatDateInput(d))
      setPeriodEnd(formatDateInput(now))
    } else if (preset === 'thisMonth') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      setPeriodStart(formatDateInput(first))
      setPeriodEnd(formatDateInput(now))
    } else {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      setPeriodStart(formatDateInput(first))
      setPeriodEnd(formatDateInput(last))
    }
  }

  // ─── Fetch available items when filters change ───────────────────────────
  useEffect(() => {
    if (!isOpen || !teamMemberId) return
    setLoadingTimeEntries(true)
    let cancelled = false
    ;(async () => {
      try {
        const res = await getAvailableTimeEntries(
          teamMemberId,
          periodStart || undefined,
          periodEnd || undefined,
        )
        if (cancelled) return
        if (res.status === 'success') {
          setAvailableTimeEntries(res.data)
          // Initialize/refresh overrides; preserve user-edited values
          setTimeEntryOverrides((prev) => {
            const next = new Map<string, TimeEntryOverride>()
            res.data.forEach((e) => {
              if (prev.has(e.id)) {
                next.set(e.id, prev.get(e.id)!)
              } else {
                const hours = e.hoursWorked ?? 0
                next.set(e.id, {
                  hoursWorked: hours,
                  amount: calcAmount(hours, e.hourlyRateAtEntry),
                  amountManuallySet: false,
                })
              }
            })
            return next
          })
        }
      } catch (err) {
        if (!cancelled) console.error('Error fetching available time entries:', err)
      } finally {
        if (!cancelled) setLoadingTimeEntries(false)
      }
    })()
    return () => { cancelled = true }
  }, [isOpen, teamMemberId, periodStart, periodEnd])

  useEffect(() => {
    if (!isOpen || !teamMemberId) return
    setLoadingExpenses(true)
    let cancelled = false
    ;(async () => {
      try {
        const res = await getAvailablePaystubExpenses(
          teamMemberId,
          periodStart || undefined,
          periodEnd || undefined,
          propertyFilter || undefined,
          undefined,
          searchQuery || undefined,
        )
        if (cancelled) return
        if (res.status === 'success') setAvailableExpenses(res.data)
      } catch (err) {
        if (!cancelled) console.error('Error fetching available expenses:', err)
      } finally {
        if (!cancelled) setLoadingExpenses(false)
      }
    })()
    return () => { cancelled = true }
  }, [isOpen, teamMemberId, periodStart, periodEnd, propertyFilter, searchQuery])

  const loadReceipts = useCallback(async () => {
    setLoadingReceipts(true)
    try {
      const res = await searchReceipts({
        status: 'matched',
        linked: 'unlinked',
        propertyId: propertyFilter || undefined,
        search: searchQuery || undefined,
      })
      if (res.status === 'success') setMatchedReceipts(res.data)
    } catch (err) {
      console.error('Error fetching receipts:', err)
    } finally {
      setLoadingReceipts(false)
    }
  }, [propertyFilter, searchQuery])

  useEffect(() => {
    if (!isOpen) return
    loadReceipts()
  }, [isOpen, loadReceipts])

  // ─── Out-of-range detection (only on period-date change) ─────────────────
  useEffect(() => {
    if (!isOpen) return
    const oorTE: AvailableTimeEntry[] = []
    selectedTimeEntryIds.forEach((id) => {
      const e = availableTimeEntries.find((x) => x.id === id)
      if (e && !isDateInRange(e.startedAt.slice(0, 10), periodStart, periodEnd)) oorTE.push(e)
    })
    const oorEx: AvailablePaystubExpense[] = []
    selectedExpenseIds.forEach((id) => {
      const e = availableExpenses.find((x) => x.id === id)
      if (e && !isDateInRange(e.expenseDate, periodStart, periodEnd)) oorEx.push(e)
    })
    const oorRc: UploadedReceipt[] = []
    selectedReceiptIds.forEach((id) => {
      const r = matchedReceipts.find((x) => x.id === id)
      if (r && r.expenseDate && !isDateInRange(r.expenseDate, periodStart, periodEnd)) oorRc.push(r)
    })
    if (oorTE.length + oorEx.length + oorRc.length > 0) {
      setPeriodConflict({ timeEntries: oorTE, expenses: oorEx, receipts: oorRc })
    } else {
      setPeriodConflict(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, periodEnd])

  const handleExpandPeriod = () => {
    if (!periodConflict) return
    const dates: string[] = []
    periodConflict.timeEntries.forEach((t) => dates.push(t.startedAt.slice(0, 10)))
    periodConflict.expenses.forEach((e) => dates.push(e.expenseDate))
    periodConflict.receipts.forEach((r) => { if (r.expenseDate) dates.push(r.expenseDate) })
    if (dates.length === 0) { setPeriodConflict(null); return }
    const minD = dates.reduce((m, d) => (d < m ? d : m), dates[0])
    const maxD = dates.reduce((m, d) => (d > m ? d : m), dates[0])
    if (periodStart && minD < periodStart) setPeriodStart(minD)
    if (periodEnd && maxD > periodEnd) setPeriodEnd(maxD)
    setPeriodConflict(null)
  }

  const handleDropOutOfRange = () => {
    if (!periodConflict) return
    const droppedCount = periodConflict.timeEntries.length + periodConflict.expenses.length + periodConflict.receipts.length
    if (periodConflict.timeEntries.length > 0) {
      setSelectedTimeEntryIds((prev) => {
        const next = new Set(prev); periodConflict.timeEntries.forEach((t) => next.delete(t.id)); return next
      })
    }
    if (periodConflict.expenses.length > 0) {
      setSelectedExpenseIds((prev) => {
        const next = new Set(prev); periodConflict.expenses.forEach((e) => next.delete(e.id)); return next
      })
    }
    if (periodConflict.receipts.length > 0) {
      setSelectedReceiptIds((prev) => {
        const next = new Set(prev); periodConflict.receipts.forEach((r) => next.delete(r.id)); return next
      })
    }
    if (droppedCount > 0) showNotification(`Dropped ${droppedCount} out-of-range item${droppedCount === 1 ? '' : 's'}.`, 'info')
    setPeriodConflict(null)
  }

  // ─── Selection helpers ───────────────────────────────────────────────────
  const toggle = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  }

  const updateTimeEntryHours = (id: string, hours: number) => {
    setTimeEntryOverrides((prev) => {
      const next = new Map(prev)
      const cur = next.get(id)
      if (!cur) return prev
      const entry = availableTimeEntries.find((e) => e.id === id)
      const rate = entry?.hourlyRateAtEntry ?? null
      next.set(id, {
        ...cur,
        hoursWorked: hours,
        amount: cur.amountManuallySet ? cur.amount : calcAmount(hours, rate),
      })
      return next
    })
  }

  const updateTimeEntryAmount = (id: string, amount: number) => {
    setTimeEntryOverrides((prev) => {
      const next = new Map(prev)
      const cur = next.get(id)
      if (!cur) return prev
      next.set(id, { ...cur, amount, amountManuallySet: true })
      return next
    })
  }

  // ─── Subtotals ───────────────────────────────────────────────────────────
  const timeEntrySubtotal = useMemo(() => {
    let total = 0
    selectedTimeEntryIds.forEach((id) => {
      const ov = timeEntryOverrides.get(id)
      if (ov) total += ov.amount
    })
    return total
  }, [selectedTimeEntryIds, timeEntryOverrides])

  const expenseSubtotal = useMemo(() => {
    let total = 0
    selectedExpenseIds.forEach((id) => {
      const ex = availableExpenses.find((e) => e.id === id)
      if (ex) total += ex.amount
    })
    return total
  }, [selectedExpenseIds, availableExpenses])

  const receiptSubtotal = useMemo(() => {
    let total = 0
    selectedReceiptIds.forEach((id) => {
      const r = matchedReceipts.find((x) => x.id === id)
      if (r) total += receiptDisplayAmount(r)
    })
    return total
  }, [selectedReceiptIds, matchedReceipts])

  const extraSubtotal = useMemo(() => extraItems.reduce((s, x) => s + x.amount, 0), [extraItems])

  const grandTotal = timeEntrySubtotal + expenseSubtotal + receiptSubtotal + extraSubtotal
  const totalHours = useMemo(() => {
    let h = 0
    selectedTimeEntryIds.forEach((id) => {
      const ov = timeEntryOverrides.get(id)
      if (ov) h += ov.hoursWorked
    })
    return h
  }, [selectedTimeEntryIds, timeEntryOverrides])

  // ─── Extra-charge add ────────────────────────────────────────────────────
  const handleAddExtra = () => {
    if (!extraDesc.trim() || !extraAmount || !extraPropertyId) {
      showNotification('Description, amount, and property are required.', 'error')
      return
    }
    setExtraItems((list) => [...list, {
      _id: `tmp_${Date.now()}_${Math.random()}`,
      description: extraDesc.trim(),
      amount: parseFloat(extraAmount),
      propertyId: extraPropertyId,
      expenseDate: periodEnd || todayISO(),
    }])
    setExtraDesc(''); setExtraAmount('')
  }

  // ─── Receipt upload (drag-drop / file picker) ────────────────────────────
  const handleFilePick = (f: File | null) => {
    if (uploadFilePreview) URL.revokeObjectURL(uploadFilePreview)
    setUploadFile(f)
    setUploadFilePreview(f && f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
  }
  const handleCancelUpload = () => {
    if (uploadFilePreview) URL.revokeObjectURL(uploadFilePreview)
    setUploadFile(null); setUploadFilePreview(null); setUploadPropertyId('')
  }
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFilePick(f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const handleUploadSubmit = async () => {
    if (!uploadFile || !uploadPropertyId) return
    setIsUploading(true)
    try {
      const res = (await uploadReceipt(uploadFile, uploadPropertyId)) as UploadReceiptResponse
      if (res.status === 'success') {
        showNotification('Receipt uploaded — processing.', 'success')
        handleCancelUpload()
        setTimeout(loadReceipts, 1500)
      } else {
        showNotification(res.message || 'Upload failed.', 'error')
      }
    } catch (err) {
      notifyError(err, 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  // ─── Submit pipeline ─────────────────────────────────────────────────────
  const handleStartSubmit = () => {
    if (totalItemCount === 0) {
      showNotification('Add at least one item.', 'error')
      return
    }
    const needsProperty = Array.from(selectedReceiptIds).filter((rid) => {
      const r = matchedReceipts.find((x) => x.id === rid)
      return r && !r.propertyId && !receiptPropertyOverrides[rid]
    })
    if (needsProperty.length > 0) {
      showNotification('Pick a property for each receipt without one.', 'error')
      return
    }
    setShowConfirmation(true)
  }

  const handleConfirmCreate = async () => {
    setIsSubmitting(true)
    try {
      // Pre-step 1: persist receipt-property overrides
      for (const [receiptId, propertyId] of Object.entries(receiptPropertyOverrides)) {
        if (!selectedReceiptIds.has(receiptId) || !propertyId) continue
        await updateReceipt(receiptId, { propertyId })
      }

      // Create the paystub
      const res = await createPaystub({
        teamMemberId: isPM ? teamMemberId : undefined,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        payDate: payDate || undefined,
        timeEntryIds: Array.from(selectedTimeEntryIds),
        expenseIds: Array.from(selectedExpenseIds),
        receiptIds: Array.from(selectedReceiptIds),
        extraItems: extraItems.map(({ _id, ...rest }) => rest),
      })
      if (res.status !== 'success') {
        showNotification(res.message || 'Failed to create paystub.', 'error')
        setIsSubmitting(false)
        return
      }
      const createdPaystub = res.data

      // Pre-step 2: apply time-entry overrides (hours/amount) via per-item PUT
      const overridePromises: Promise<unknown>[] = []
      const created = await getPaystubById(createdPaystub.id)
      if (created.status === 'success' && created.data.items) {
        for (const item of created.data.items) {
          if (item.itemType !== 'time_entry' || !item.timeEntryId) continue
          const ov = timeEntryOverrides.get(item.timeEntryId)
          if (!ov) continue
          const originalHours = availableTimeEntries.find((e) => e.id === item.timeEntryId)?.hoursWorked ?? 0
          const changed = ov.amountManuallySet || ov.hoursWorked !== originalHours
          if (!changed) continue
          overridePromises.push(updatePaystubItem(createdPaystub.id, item.id, {
            hoursWorked: ov.hoursWorked,
            amount: ov.amount,
          }))
        }
      }
      await Promise.all(overridePromises)

      // Refetch for the final state
      const final = await getPaystubById(createdPaystub.id)
      const ready = final.status === 'success' ? final.data : createdPaystub
      showNotification('Paystub created.', 'success')
      onCreated(ready)
      onClose()
    } catch (err) {
      notifyError(err, 'Error creating paystub.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Rendering ───────────────────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-4xl w-11/12 !max-h-[90vh]" zIndex={60}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 flex items-center justify-between gap-4 pr-12">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">New paystub</h2>
            {teamMemberName && <p className="text-xs text-gray-500 truncate">For {teamMemberName}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-gray-500">
              {totalItemCount} item{totalItemCount !== 1 ? 's' : ''}
              {totalHours > 0 && <> · {formatHours(totalHours)}</>}
            </div>
            <div className="text-lg font-semibold text-emerald-700 tabular-nums">
              {formatMoney(grandTotal, 'CAD')}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Period + filters */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mr-1">Quick range</span>
              <PresetButton onClick={() => applyPreset('last7')}>Last 7 days</PresetButton>
              <PresetButton onClick={() => applyPreset('last30')}>Last 30 days</PresetButton>
              <PresetButton onClick={() => applyPreset('thisMonth')}>This month</PresetButton>
              <PresetButton onClick={() => applyPreset('lastMonth')}>Last month</PresetButton>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">From</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">To</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pay date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Property</label>
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.listingName || p.address}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Vendor, description, property…"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Time Entries */}
          <Section
            icon={<ClockIcon className="w-4 h-4 text-blue-600" />}
            title="Time entries"
            count={availableTimeEntries.length}
            selectedCount={timeEntryCount}
            info="Approved time entries for this team member that aren't on any paystub yet."
          >
            {loadingTimeEntries ? (
              <SectionLoading color="blue" />
            ) : availableTimeEntries.length === 0 ? (
              <EmptyHint icon={<ClockIcon className="w-7 h-7 text-gray-400" />} title="No time entries" hint="No approved entries in this date range." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {availableTimeEntries.map((e) => {
                  const checked = selectedTimeEntryIds.has(e.id)
                  const ov = timeEntryOverrides.get(e.id)
                  const hours = ov?.hoursWorked ?? e.hoursWorked ?? 0
                  const amount = ov?.amount ?? calcAmount(hours, e.hourlyRateAtEntry)
                  const dateLabel = new Date(e.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  return (
                    <li
                      key={e.id}
                      className={`px-3 py-2 ${checked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <div
                        onClick={() => setSelectedTimeEntryIds((s) => toggle(s, e.id))}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 truncate">{dateLabel}</div>
                          <div className="text-xs text-gray-500">
                            {e.hourlyRateAtEntry != null
                              ? `${formatMoney(e.hourlyRateAtEntry, e.currencyAtEntry ?? 'CAD')}/hr`
                              : 'No rate set'}
                          </div>
                        </div>
                        {/* Inline hours override */}
                        <div className="flex items-center gap-1.5" onClick={(ev) => ev.stopPropagation()}>
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={hours}
                            onChange={(ev) => updateTimeEntryHours(e.id, parseFloat(ev.target.value) || 0)}
                            className="w-16 px-2 py-1 text-xs text-right bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums"
                          />
                          <span className="text-[10px] text-gray-400">h</span>
                        </div>
                        <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                          <span className="text-xs text-gray-400">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(ev) => updateTimeEntryAmount(e.id, parseFloat(ev.target.value) || 0)}
                            className="w-20 px-2 py-1 text-xs text-right bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums"
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>

          {/* Section: Expenses */}
          <Section
            icon={<BanknotesIcon className="w-4 h-4 text-emerald-600" />}
            title="Expenses"
            count={availableExpenses.length}
            selectedCount={expenseCount}
            info="Expenses paid by this team member that aren't on any paystub yet."
          >
            {loadingExpenses ? (
              <SectionLoading color="emerald" />
            ) : availableExpenses.length === 0 ? (
              <EmptyHint icon={<BanknotesIcon className="w-7 h-7 text-gray-400" />} title="No reimbursable expenses" hint="No matching expenses in this range." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {availableExpenses.map((e) => {
                  const checked = selectedExpenseIds.has(e.id)
                  return (
                    <li
                      key={e.id}
                      className={`px-3 py-2 ${checked ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                    >
                      <div
                        onClick={() => setSelectedExpenseIds((s) => toggle(s, e.id))}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="rounded text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{e.vendorName}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {e.expenseDate}{e.propertyName && ` · ${e.propertyName}`}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                          {formatMoney(e.amount, 'CAD')}
                        </div>
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setEditingExpenseId(e.id) }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded flex-shrink-0"
                          title="Edit expense"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>

          {/* Section: Receipts */}
          <Section
            icon={<ReceiptPercentIcon className="w-4 h-4 text-purple-600" />}
            title="Receipts"
            count={matchedReceipts.length}
            selectedCount={receiptCount}
            info="Matched receipts ready to be turned into paystub line items."
          >
            {/* Drag-drop upload area */}
            {!uploadFile ? (
              <label
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`block border-2 border-dashed rounded-xl px-4 py-5 mb-3 text-center cursor-pointer transition-colors ${
                  isDragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <ArrowUpTrayIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-600">
                  Drop a receipt or <span className="text-purple-700 underline">browse</span>
                </p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="border border-gray-200 rounded-xl p-3 mb-3 flex items-center gap-3 bg-purple-50">
                {uploadFilePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={uploadFilePreview} alt="" className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                    <ReceiptPercentIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 truncate">{uploadFile.name}</div>
                  <select
                    value={uploadPropertyId}
                    onChange={(e) => setUploadPropertyId(e.target.value)}
                    className="mt-1 w-full px-2 py-1 text-xs bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Pick a property…</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.listingName || p.address}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  disabled={isUploading || !uploadPropertyId}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            )}

            {loadingReceipts ? (
              <SectionLoading color="purple" />
            ) : matchedReceipts.length === 0 ? (
              <EmptyHint icon={<ReceiptPercentIcon className="w-7 h-7 text-gray-400" />} title="No matched receipts" hint="Upload a receipt above to add it once OCR completes." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {matchedReceipts.map((r) => {
                  const checked = selectedReceiptIds.has(r.id)
                  const needsProperty = checked && !r.propertyId && !receiptPropertyOverrides[r.id]
                  return (
                    <li
                      key={r.id}
                      className={`px-3 py-2 ${checked ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                    >
                      <div
                        onClick={() => setSelectedReceiptIds((s) => toggle(s, r.id))}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="rounded text-purple-600 focus:ring-purple-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {r.vendorName || r.originalName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {r.expenseDate || '—'}{r.propertyName && ` · ${r.propertyName}`}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                          {(r.subtotal != null || r.taxTotal != null || r.total != null)
                            ? formatMoney(receiptDisplayAmount(r), 'CAD')
                            : '—'}
                        </div>
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setEditingReceiptId(r.id) }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded flex-shrink-0"
                          title="Edit receipt"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </div>
                      {needsProperty && (
                        <select
                          value={receiptPropertyOverrides[r.id] ?? ''}
                          onChange={(e) => setReceiptPropertyOverrides((o) => ({ ...o, [r.id]: e.target.value }))}
                          onClick={(ev) => ev.stopPropagation()}
                          className="mt-2 ml-7 w-[calc(100%-1.75rem)] px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded text-amber-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="">Pick a property for this receipt…</option>
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>{p.listingName || p.address}</option>
                          ))}
                        </select>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>

          {/* Section: Extra Charges */}
          <Section
            icon={<CurrencyDollarIcon className="w-4 h-4 text-amber-600" />}
            title="Extra charges"
            count={extraItems.length}
            selectedCount={extraItems.length}
            info="Add manual line items like mileage, bonuses, or other adjustments."
          >
            {extraItems.length > 0 && (
              <ul className="divide-y divide-gray-100 mb-3">
                {extraItems.map((x) => (
                  <li key={x._id} className="px-3 py-2 flex items-center gap-3 bg-amber-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{x.description}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {(() => {
                          const p = properties.find((pp) => pp.id === x.propertyId)
                          return p ? (p.listingName || p.address) : '—'
                        })()}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 tabular-nums">{formatMoney(x.amount, 'CAD')}</div>
                    <button
                      type="button"
                      onClick={() => setExtraItems((list) => list.filter((item) => item._id !== x._id))}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-3 py-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={extraDesc}
                  onChange={(e) => setExtraDesc(e.target.value)}
                  placeholder="Description (e.g. Mileage)"
                  className="flex-1 px-2.5 py-1.5 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={extraAmount}
                    onChange={(e) => setExtraAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-6 pr-2 py-1.5 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={extraPropertyId}
                  onChange={(e) => setExtraPropertyId(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select property…</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.listingName || p.address}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddExtra}
                  disabled={!extraDesc.trim() || !extraAmount || !extraPropertyId}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded hover:bg-amber-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </Section>

          {/* Cart preview */}
          <div className="mt-5 border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setCartExpanded(!cartExpanded)}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                <ShoppingCartIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Selected items</span>
                <span className="text-xs text-gray-500">({totalItemCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-emerald-700 tabular-nums">{formatMoney(grandTotal, 'CAD')}</span>
                {cartExpanded ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {cartExpanded && (
              <div className="px-4 py-3 space-y-2 text-xs">
                {timeEntryCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time entries ({timeEntryCount})</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(timeEntrySubtotal, 'CAD')}</span>
                  </div>
                )}
                {expenseCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expenses ({expenseCount})</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(expenseSubtotal, 'CAD')}</span>
                  </div>
                )}
                {receiptCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Receipts ({receiptCount})</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(receiptSubtotal, 'CAD')}</span>
                  </div>
                )}
                {extraCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Extra charges ({extraCount})</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(extraSubtotal, 'CAD')}</span>
                  </div>
                )}
                {totalItemCount === 0 && (
                  <p className="text-gray-400 italic text-center py-2">No items selected yet.</p>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-emerald-700 tabular-nums">{formatMoney(grandTotal, 'CAD')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 sticky bottom-0 bg-white flex items-center justify-between gap-4">
          <div className="text-xs text-gray-500">
            {totalHours > 0 && <>{formatHours(totalHours)} · </>}
            {totalItemCount} item{totalItemCount !== 1 ? 's' : ''} · {formatMoney(grandTotal, 'CAD')}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartSubmit}
              disabled={isSubmitting || totalItemCount === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? 'Creating…' : 'Review & create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Period conflict portal modal ─── */}
      {periodConflict && createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-semibold text-gray-900">Items outside this period</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {(() => {
                  const total = periodConflict.timeEntries.length + periodConflict.expenses.length + periodConflict.receipts.length
                  return `${total} selected ${total === 1 ? 'item is' : 'items are'} outside the chosen date range. Expand the period to keep them, or drop them from the paystub.`
                })()}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-xs">
              {periodConflict.timeEntries.length > 0 && (
                <ConflictGroup
                  label="Time entries"
                  items={periodConflict.timeEntries.map((t) => ({
                    key: t.id,
                    label: new Date(t.startedAt).toLocaleDateString(),
                    date: t.startedAt.slice(0, 10),
                  }))}
                />
              )}
              {periodConflict.expenses.length > 0 && (
                <ConflictGroup
                  label="Expenses"
                  items={periodConflict.expenses.map((e) => ({
                    key: e.id,
                    label: e.vendorName || e.description || 'Expense',
                    date: e.expenseDate,
                  }))}
                />
              )}
              {periodConflict.receipts.length > 0 && (
                <ConflictGroup
                  label="Receipts"
                  items={periodConflict.receipts.map((r) => ({
                    key: r.id,
                    label: r.vendorName || r.originalName || 'Receipt',
                    date: r.expenseDate || '—',
                  }))}
                />
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={handleDropOutOfRange}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Drop items
              </button>
              <button
                type="button"
                onClick={handleExpandPeriod}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Expand period
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─── Confirmation overlay ─── */}
      {showConfirmation && createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isSubmitting && setShowConfirmation(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <ShoppingCartIcon className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">Confirm new paystub</h3>
                  <p className="text-xs text-gray-500">Review before creating. You can edit items afterward.</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Period</span>
                <span className="text-gray-900 font-medium tabular-nums">{periodStart || '—'} → {periodEnd || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pay date</span>
                <span className="text-gray-900 font-medium tabular-nums">{payDate || '—'}</span>
              </div>
              {teamMemberName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">For</span>
                  <span className="text-gray-900 font-medium">{teamMemberName}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                {timeEntryCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Time entries ({timeEntryCount}) · {formatHours(totalHours)}</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(timeEntrySubtotal, 'CAD')}</span>
                  </div>
                )}
                {expenseCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Expenses ({expenseCount})</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(expenseSubtotal, 'CAD')}</span>
                  </div>
                )}
                {receiptCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Receipts ({receiptCount})</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(receiptSubtotal, 'CAD')}</span>
                  </div>
                )}
                {extraCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Extra charges ({extraCount})</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(extraSubtotal, 'CAD')}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between text-base">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-emerald-700 tabular-nums">{formatMoney(grandTotal, 'CAD')}</span>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Confirm & create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─── Editor sub-modals (open on pencil-click) ─── */}
      {editingExpenseId && (
        <ExpenseViewerModal
          isOpen={true}
          onClose={() => setEditingExpenseId(null)}
          expenseId={editingExpenseId}
          zIndex={90}
          onExpenseUpdated={() => {
            // Refetch expenses so the row reflects the edit
            if (!teamMemberId) return
            getAvailablePaystubExpenses(
              teamMemberId,
              periodStart || undefined,
              periodEnd || undefined,
              propertyFilter || undefined,
              undefined,
              searchQuery || undefined,
            ).then((res) => {
              if (res.status === 'success') setAvailableExpenses(res.data)
            }).catch(console.error)
          }}
        />
      )}
      {editingReceiptId && (
        <ReceiptDetailModal
          isOpen={true}
          onClose={() => setEditingReceiptId(null)}
          receiptId={editingReceiptId}
          properties={properties}
          zIndex={90}
          onUpdated={() => loadReceipts()}
        />
      )}
    </>
  )
}

// ---- Subcomponents ---------------------------------------------------------

const PresetButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50"
  >
    {children}
  </button>
)

interface SectionProps {
  icon: React.ReactNode
  title: string
  count: number
  selectedCount: number
  info: string
  children: React.ReactNode
}

const Section: React.FC<SectionProps> = ({ icon, title, count, selectedCount, info, children }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <span className="text-xs text-gray-500">({count})</span>
      {selectedCount > 0 && (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
          {selectedCount} selected
        </span>
      )}
    </div>
    <p className="flex items-center gap-1 text-[11px] text-gray-400 mb-3">
      <InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
      {info}
    </p>
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      {children}
    </div>
  </div>
)

const SectionLoading: React.FC<{ color: 'blue' | 'emerald' | 'purple' | 'amber' }> = ({ color }) => {
  const borderColor = {
    blue: 'border-blue-500',
    emerald: 'border-emerald-500',
    purple: 'border-purple-500',
    amber: 'border-amber-500',
  }[color]
  return (
    <div className="flex items-center justify-center py-10">
      <div className={`w-6 h-6 border-2 ${borderColor} border-t-transparent rounded-full animate-spin`} />
    </div>
  )
}

const EmptyHint: React.FC<{ icon: React.ReactNode; title: string; hint: string }> = ({ icon, title, hint }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-2">
      {icon}
    </div>
    <h4 className="text-sm font-semibold text-gray-700 mb-0.5">{title}</h4>
    <p className="text-xs text-gray-500 max-w-xs">{hint}</p>
  </div>
)

interface ConflictGroupProps {
  label: string
  items: { key: string; label: string; date: string }[]
}

const ConflictGroup: React.FC<ConflictGroupProps> = ({ label, items }) => (
  <div>
    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
    <ul className="space-y-1">
      {items.map((it) => (
        <li key={it.key} className="flex justify-between text-gray-700">
          <span className="truncate">{it.label}</span>
          <span className="text-gray-400 tabular-nums flex-shrink-0 ml-3">{it.date}</span>
        </li>
      ))}
    </ul>
  </div>
)

export default CreatePaystubModal
