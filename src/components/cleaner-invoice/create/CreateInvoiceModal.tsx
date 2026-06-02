'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Modal from '../../shared/modal'
import { createInvoice, getAvailableProjects, getAvailableExpenses } from '@/services/cleanerInvoiceService'
import { searchReceipts, uploadReceipt, archiveReceipt, updateReceipt } from '@/services/receiptService'
import { getProperties } from '@/services/propertyService'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import type { Cleaner } from '@/services/types/cleaner'
import type { CleanerInvoice, AvailableProject, AvailableExpense, ExtraItemPayload } from '@/services/types/cleanerInvoice'
import type { UploadedReceipt, UploadReceiptResponse } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'
import ReceiptThumbnail from '@/components/shared/ReceiptThumbnail'
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  PlusIcon,
  CameraIcon,
  PhotoIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  TrashIcon,
  InformationCircleIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { TAX_RATES, calcTax } from '@/constants/taxRates'
import ExpenseViewerModal from '@/components/expenses/ExpenseViewerModal'
import ReceiptDetailModal from '@/components/receipt/detail/ReceiptDetailModal'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  cleaner: Cleaner
  onCreated: (invoice: CleanerInvoice) => void
}

// ─── Per-project override (editable before generating) ────────────────────────

interface ProjectOverride {
  durationMinutes: number
  amount: number
  amountManuallySet: boolean
  isTaxable: boolean
}

// ─── Local extra item with client-side ID ─────────────────────────────────────

interface LocalExtraItem extends ExtraItemPayload {
  _id: string
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function getDurationMinutes(project: AvailableProject): number {
  if (project.cleanerPropertyDurationMinutes) return project.cleanerPropertyDurationMinutes
  if (project.propertyDefaultDurationMinutes) return project.propertyDefaultDurationMinutes
  if (project.actualStart && project.actualEnd) {
    return Math.round(
      (new Date(project.actualEnd).getTime() - new Date(project.actualStart).getTime()) / 1000 / 60
    )
  }
  return project.estimatedDurationMinutes || 0
}

function calcAmount(
  rateType: string | null | undefined,
  rateAmount: number | null | undefined,
  durationMinutes: number,
  cleanerHourlyRate?: number
): number {
  if (rateType === 'flat' && rateAmount) return rateAmount
  if (rateType === 'hourly' && rateAmount) {
    return Math.round(rateAmount * (durationMinutes / 60) * 100) / 100
  }
  if (cleanerHourlyRate) {
    return Math.round(cleanerHourlyRate * (durationMinutes / 60) * 100) / 100
  }
  return 0
}

function getRateLabel(
  project: AvailableProject,
  cleanerHourlyRate: number | undefined,
  t: (key: string, opts?: Record<string, string>) => string
): string {
  if (project.propertyRateType === 'flat' && project.propertyRateAmount) {
    return `$${project.propertyRateAmount.toFixed(2)} ${t('flatRateShort')}`
  }
  if (project.propertyRateType === 'hourly' && project.propertyRateAmount) {
    return `$${project.propertyRateAmount.toFixed(2)}/${t('hourlyRateShort')}`
  }
  if (cleanerHourlyRate) {
    return `$${cleanerHourlyRate.toFixed(2)}/${t('hourlyRateShort')} (${t('defaultLower')})`
  }
  return t('noRateSetLabel')
}

function isHourlyRate(project: AvailableProject, cleanerHourlyRate?: number): boolean {
  if (project.propertyRateType === 'flat') return false
  if (project.propertyRateType === 'hourly') return true
  return !!cleanerHourlyRate
}

function formatProjectDate(dateStr: string): string {
  const date = new Date(dateStr.split('T')[0] + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatAmount(n: number | null | undefined): string {
  if (n == null) return '$0.00'
  return `$${Number(n).toFixed(2)}`
}

/** Check if a date string falls within optional start/end bounds */
function isDateInRange(dateStr: string, start?: string, end?: string): boolean {
  if (!start && !end) return true
  const d = dateStr.split('T')[0]
  if (start && d < start) return false
  if (end && d > end) return false
  return true
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024

// ─── Component ────────────────────────────────────────────────────────────────

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  cleaner,
  onCreated,
}) => {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((s) => s.showNotification)
  const profile = useUserStore((s) => s.profile)

  // ─── Global filters ──────────────────────────────────────────────────────

  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // ─── Properties for filter + extra charge picker ─────────────────────────

  const [properties, setProperties] = useState<Property[]>([])

  // ─── Projects tab ─────────────────────────────────────────────────────────

  const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set())
  const [projectOverrides, setProjectOverrides] = useState<Map<string, ProjectOverride>>(new Map())
  const [loadingProjects, setLoadingProjects] = useState(false)

  // ─── Expenses tab ─────────────────────────────────────────────────────────

  const [availableExpenses, setAvailableExpenses] = useState<AvailableExpense[]>([])
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set())
  const [loadingExpenses, setLoadingExpenses] = useState(false)

  // ─── Receipts tab ─────────────────────────────────────────────────────────

  const [matchedReceipts, setMatchedReceipts] = useState<UploadedReceipt[]>([])
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set())
  const [loadingReceipts, setLoadingReceipts] = useState(false)
  // Upload sub-state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadFilePreview, setUploadFilePreview] = useState<string | null>(null)
  const [uploadPropertyId, setUploadPropertyId] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // ─── Extra charges tab ────────────────────────────────────────────────────

  const [extraItems, setExtraItems] = useState<LocalExtraItem[]>([])
  const [extraDesc, setExtraDesc] = useState('')
  const [extraAmount, setExtraAmount] = useState('')
  const [extraPropertyId, setExtraPropertyId] = useState('')
  const [extraTaxable, setExtraTaxable] = useState(false)

  // ─── Tax toggles ──────────────────────────────────────────────────────────

  const [taxHstEnabled, setTaxHstEnabled] = useState(cleaner.taxHstEnabled || false)
  const [taxGstEnabled, setTaxGstEnabled] = useState(cleaner.taxGstEnabled || false)
  const [taxQstEnabled, setTaxQstEnabled] = useState(cleaner.taxQstEnabled || false)

  // ─── Cart & submit ────────────────────────────────────────────────────────

  const [cartExpanded, setCartExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // ─── Period date conflict (selections outside narrowed range) ─────────────

  const [periodConflict, setPeriodConflict] = useState<{
    projects: AvailableProject[]
    expenses: AvailableExpense[]
    receipts: UploadedReceipt[]
  } | null>(null)

  // ─── Per-row editor sub-modals ───────────────────────────────────────────
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null)

  // ─── Derived counts ───────────────────────────────────────────────────────

  const projectCount = selectedProjectIds.size
  const expenseCount = selectedExpenseIds.size
  const receiptCount = selectedReceiptIds.size
  const extraCount = extraItems.length
  const totalItemCount = projectCount + expenseCount + receiptCount + extraCount

  // Auto-dismiss confirmation if all items removed
  useEffect(() => {
    if (showConfirmation && totalItemCount === 0) setShowConfirmation(false)
  }, [showConfirmation, totalItemCount])

  // ─── Reset on modal open ──────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      setPeriodStart(formatDateInput(first))
      setPeriodEnd(formatDateInput(now))
      setPropertyFilter('')
      setSearchQuery('')
setSelectedProjectIds(new Set())
      setProjectOverrides(new Map())
      setSelectedExpenseIds(new Set())
      setSelectedReceiptIds(new Set())
      setExtraItems([])
      setExtraDesc('')
      setExtraAmount('')
      setExtraPropertyId('')
      setExtraTaxable(false)
      setCartExpanded(false)
      setShowConfirmation(false)
      setTaxHstEnabled(cleaner.taxHstEnabled || false)
      setTaxGstEnabled(cleaner.taxGstEnabled || false)
      setTaxQstEnabled(cleaner.taxQstEnabled || false)
      setUploadFile(null)
      setUploadFilePreview(null)
      setUploadPropertyId('')
      setIsUploading(false)
      setIsDragOver(false)
    }
  }, [isOpen])

  // ─── Load properties ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !profile?.id) return
    const parentId = profile.pmUserId || profile.id
    getProperties(parentId).then((res) => {
      if (res.status === 'success') setProperties(res.data)
    }).catch(console.error)
  }, [isOpen, profile?.id])

  // ─── Fetch projects when filters change ───────────────────────────────────

  useEffect(() => {
    if (!isOpen) return
    if (!periodStart || !periodEnd) return
    const fetchProjects = async () => {
      setLoadingProjects(true)
      try {
        const res = await getAvailableProjects(
          cleaner.id,
          periodStart || undefined,
          periodEnd || undefined,
          propertyFilter || undefined,
          searchQuery || undefined
        )
        if (res.status === 'success') {
          setAvailableProjects(res.data)
          // Build overrides for new projects (preserve existing ones)
          const anyTaxEnabled = taxHstEnabled || taxGstEnabled || taxQstEnabled
          setProjectOverrides((prev) => {
            const next = new Map<string, ProjectOverride>()
            res.data.forEach((p) => {
              if (prev.has(p.id)) {
                next.set(p.id, prev.get(p.id)!)
              } else {
                const dur = getDurationMinutes(p)
                next.set(p.id, {
                  durationMinutes: dur,
                  amount: calcAmount(p.propertyRateType, p.propertyRateAmount, dur, cleaner.hourlyRate),
                  amountManuallySet: false,
                  isTaxable: anyTaxEnabled,
                })
              }
            })
            return next
          })
        }
      } catch (err) {
        console.error('Error fetching projects:', err)
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [isOpen, cleaner.id, periodStart, periodEnd, propertyFilter, searchQuery])

  // ─── Fetch expenses when filters change ───────────────────────────────────

  useEffect(() => {
    if (!isOpen) return
    if (!periodStart || !periodEnd) return
    const fetchExpenses = async () => {
      setLoadingExpenses(true)
      try {
        const res = await getAvailableExpenses(
          cleaner.id,
          periodStart || undefined,
          periodEnd || undefined,
          propertyFilter || undefined,
          undefined, // category
          searchQuery || undefined
        )
        if (res.status === 'success') {
          setAvailableExpenses(res.data)
        }
      } catch (err) {
        console.error('Error fetching expenses:', err)
      } finally {
        setLoadingExpenses(false)
      }
    }
    fetchExpenses()
  }, [isOpen, cleaner.id, periodStart, periodEnd, propertyFilter, searchQuery])

  // ─── Fetch matched receipts when filters change ───────────────────────────

  useEffect(() => {
    if (!isOpen) return
    if (!periodStart || !periodEnd) return
    const fetchReceipts = async () => {
      setLoadingReceipts(true)
      try {
        const res = await searchReceipts({
          status: 'matched',
          propertyId: propertyFilter || undefined,
          search: searchQuery || undefined,
          startDate: periodStart || undefined,
          endDate: periodEnd || undefined,
          limit: 100,
        })
        if (res.status === 'success') {
          // Only show receipts the cleaner uploaded (they can view others but can't apply them)
          const ownReceipts = cleaner.authUserId
            ? res.data.filter((r) => r.uploadedBy === cleaner.authUserId)
            : res.data
          setMatchedReceipts(ownReceipts)
        }
      } catch (err) {
        console.error('Error fetching receipts:', err)
      } finally {
        setLoadingReceipts(false)
      }
    }
    fetchReceipts()
  }, [isOpen, cleaner.id, periodStart, periodEnd, propertyFilter, searchQuery])

  // ─── Detect out-of-range selections when dates narrow ─────────────────────
  // Instead of silently deselecting, surface a conflict modal so the user can
  // choose to expand the period or drop the items.

  useEffect(() => {
    if (!isOpen) return

    const oorProjects: AvailableProject[] = []
    selectedProjectIds.forEach((id) => {
      const p = availableProjects.find((proj) => proj.id === id)
      if (p && !isDateInRange(p.projectDate, periodStart, periodEnd)) {
        oorProjects.push(p)
      }
    })

    const oorExpenses: AvailableExpense[] = []
    selectedExpenseIds.forEach((id) => {
      const e = availableExpenses.find((exp) => exp.id === id)
      if (e && !isDateInRange(e.expenseDate, periodStart, periodEnd)) {
        oorExpenses.push(e)
      }
    })

    const oorReceipts: UploadedReceipt[] = []
    selectedReceiptIds.forEach((id) => {
      const r = matchedReceipts.find((rec) => rec.id === id)
      if (r && r.expenseDate && !isDateInRange(r.expenseDate, periodStart, periodEnd)) {
        oorReceipts.push(r)
      }
    })

    if (oorProjects.length + oorExpenses.length + oorReceipts.length > 0) {
      setPeriodConflict({ projects: oorProjects, expenses: oorExpenses, receipts: oorReceipts })
    } else {
      setPeriodConflict(null)
    }
    // Intentionally only depends on period dates — list/selection changes are
    // handled by their own effects, and re-running on every selection toggle
    // would surface the modal mid-interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, periodEnd])

  const handleExpandPeriod = () => {
    if (!periodConflict) return
    const dates: string[] = []
    periodConflict.projects.forEach((p) => dates.push(p.projectDate))
    periodConflict.expenses.forEach((e) => dates.push(e.expenseDate))
    periodConflict.receipts.forEach((r) => {
      if (r.expenseDate) dates.push(r.expenseDate)
    })
    if (dates.length === 0) {
      setPeriodConflict(null)
      return
    }
    const minDate = dates.reduce((m, d) => (d < m ? d : m), dates[0])
    const maxDate = dates.reduce((m, d) => (d > m ? d : m), dates[0])
    if (periodStart && minDate < periodStart) setPeriodStart(minDate)
    if (periodEnd && maxDate > periodEnd) setPeriodEnd(maxDate)
    setPeriodConflict(null)
  }

  const handleDropOutOfRange = () => {
    if (!periodConflict) return
    const droppedCount =
      periodConflict.projects.length +
      periodConflict.expenses.length +
      periodConflict.receipts.length

    if (periodConflict.projects.length > 0) {
      setSelectedProjectIds((prev) => {
        const next = new Set(prev)
        periodConflict.projects.forEach((p) => next.delete(p.id))
        return next
      })
    }
    if (periodConflict.expenses.length > 0) {
      setSelectedExpenseIds((prev) => {
        const next = new Set(prev)
        periodConflict.expenses.forEach((e) => next.delete(e.id))
        return next
      })
    }
    if (periodConflict.receipts.length > 0) {
      setSelectedReceiptIds((prev) => {
        const next = new Set(prev)
        periodConflict.receipts.forEach((r) => next.delete(r.id))
        return next
      })
    }
    if (droppedCount > 0) {
      showNotification(t('itemsDeselectedWarning', { count: droppedCount }), 'info')
    }
    setPeriodConflict(null)
  }

  // ─── Subtotal calculations ────────────────────────────────────────────────

  const projectSubtotal = useMemo(() => {
    let total = 0
    selectedProjectIds.forEach((id) => {
      const ov = projectOverrides.get(id)
      if (ov) total += ov.amount
    })
    return total
  }, [selectedProjectIds, projectOverrides])

  const expenseSubtotal = useMemo(() => {
    let total = 0
    selectedExpenseIds.forEach((id) => {
      const exp = availableExpenses.find((e) => e.id === id)
      if (exp) total += Number(exp.amount)
    })
    return total
  }, [selectedExpenseIds, availableExpenses])

  const receiptSubtotal = useMemo(() => {
    let total = 0
    selectedReceiptIds.forEach((id) => {
      const r = matchedReceipts.find((rec) => rec.id === id)
      if (r) total += Number(r.total || r.subtotal || 0)
    })
    return total
  }, [selectedReceiptIds, matchedReceipts])

  const extraSubtotal = useMemo(() => {
    return extraItems.reduce((s, item) => s + item.amount, 0)
  }, [extraItems])

  const selectedSubtotal = projectSubtotal + expenseSubtotal + receiptSubtotal + extraSubtotal

  // Taxable subtotal — only taxable project items + taxable extra items
  const taxableSubtotal = useMemo(() => {
    let total = 0
    selectedProjectIds.forEach((id) => {
      const ov = projectOverrides.get(id)
      if (ov && ov.isTaxable) total += ov.amount
    })
    extraItems.forEach((item) => {
      if (item.isTaxable) total += item.amount
    })
    return total
  }, [selectedProjectIds, projectOverrides, extraItems])

  const hasTax = taxHstEnabled || taxGstEnabled || taxQstEnabled
  const taxPreview = useMemo(() => {
    const hst = taxHstEnabled ? calcTax(taxableSubtotal, 'hst') : 0
    const gst = taxGstEnabled ? calcTax(taxableSubtotal, 'gst') : 0
    const qst = taxQstEnabled ? calcTax(taxableSubtotal, 'qst') : 0
    return { hst, gst, qst, total: hst + gst + qst }
  }, [taxableSubtotal, taxHstEnabled, taxGstEnabled, taxQstEnabled])

  const selectedTotal = selectedSubtotal + taxPreview.total

  // ─── Project handlers ─────────────────────────────────────────────────────

  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDurationChange = (projectId: string, totalMinutes: number) => {
    const project = availableProjects.find((p) => p.id === projectId)
    if (!project) return
    setProjectOverrides((prev) => {
      const next = new Map(prev)
      const current = next.get(projectId)
      if (current) {
        const newAmount = current.amountManuallySet
          ? current.amount
          : calcAmount(project.propertyRateType, project.propertyRateAmount, totalMinutes, cleaner.hourlyRate)
        next.set(projectId, { ...current, durationMinutes: totalMinutes, amount: newAmount })
      }
      return next
    })
  }

  const handleHoursChange = (projectId: string, value: string) => {
    const current = projectOverrides.get(projectId)
    const currentTotal = current?.durationMinutes ?? 0
    const currentMins = currentTotal % 60
    const newHours = value.trim() ? parseInt(value) : 0
    handleDurationChange(projectId, newHours * 60 + currentMins)
  }

  const handleMinsChange = (projectId: string, value: string) => {
    const current = projectOverrides.get(projectId)
    const currentTotal = current?.durationMinutes ?? 0
    const currentHours = Math.floor(currentTotal / 60)
    const newMins = value.trim() ? parseInt(value) : 0
    handleDurationChange(projectId, currentHours * 60 + Math.min(newMins, 59))
  }

  const handleAmountChange = (projectId: string, value: string) => {
    setProjectOverrides((prev) => {
      const next = new Map(prev)
      const current = next.get(projectId)
      if (current) {
        const numVal = value.trim() ? parseFloat(value) : 0
        next.set(projectId, { ...current, amount: numVal, amountManuallySet: true })
      }
      return next
    })
  }

  // ─── Receipt upload handlers ──────────────────────────────────────────────

  const handleFileSelect = useCallback((f: File) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      showNotification(t('invalidFileType'), 'error')
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      showNotification(t('fileTooLarge'), 'error')
      return
    }
    setUploadFile(f)
    if (f.type.startsWith('image/')) {
      setUploadFilePreview(URL.createObjectURL(f))
    } else {
      setUploadFilePreview(null)
    }
  }, [showNotification, t])

  const removeUploadFile = () => {
    setUploadFile(null)
    if (uploadFilePreview) {
      URL.revokeObjectURL(uploadFilePreview)
      setUploadFilePreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) handleFileSelect(files[0])
  }, [handleFileSelect])

  const handleUploadReceipt = async () => {
    if (!uploadFile || !uploadPropertyId) return
    setIsUploading(true)
    try {
      const res = (await uploadReceipt(uploadFile, uploadPropertyId)) as UploadReceiptResponse
      if (res.status === 'success') {
        showNotification(t('receiptAddedToInvoice'), 'success')
        const newReceiptId = res.data.receipt.id
        // Refresh matched receipts so the new upload appears in the Receipts section
        const recRes = await searchReceipts({
          status: 'matched',
          propertyId: propertyFilter || undefined,
          search: searchQuery || undefined,
          startDate: periodStart || undefined,
          endDate: periodEnd || undefined,
          limit: 100,
        })
        if (recRes.status === 'success') {
          const ownReceipts = cleaner.authUserId
            ? recRes.data.filter((r) => r.uploadedBy === cleaner.authUserId)
            : recRes.data
          setMatchedReceipts(ownReceipts)
        }
        // Auto-select the new receipt (works even if filters would otherwise hide it)
        setSelectedReceiptIds((prev) => new Set([...prev, newReceiptId]))
        removeUploadFile()
        setUploadPropertyId('')
      } else {
        showNotification(res.message || t('failedToUploadAndApply'), 'error')
      }
    } catch (err) {
      console.error('Upload error:', err)
      showNotification(err instanceof Error ? err.message : t('failedToUploadAndApply'), 'error')
    } finally {
      setIsUploading(false)
    }
  }

  // ─── Archive receipt handler ──────────────────────────────────────────────

  const handleArchiveReceipt = async (receiptId: string) => {
    try {
      const res = await archiveReceipt(receiptId)
      if (res.status === 'success') {
        setMatchedReceipts((prev) => prev.filter((r) => r.id !== receiptId))
        setSelectedReceiptIds((prev) => {
          if (!prev.has(receiptId)) return prev
          const next = new Set(prev)
          next.delete(receiptId)
          return next
        })
        showNotification(t('receiptArchived'), 'success')
      } else {
        showNotification(res.message || t('failedToArchiveReceipt'), 'error')
      }
    } catch (err) {
      console.error('Archive error:', err)
      showNotification(err instanceof Error ? err.message : t('failedToArchiveReceipt'), 'error')
    }
  }

  // ─── Assign property to receipt ────────────────────────────────────────────

  const [assigningReceiptProperty, setAssigningReceiptProperty] = useState<string | null>(null)

  const handleAssignReceiptProperty = async (receiptId: string, propertyId: string) => {
    setAssigningReceiptProperty(receiptId)
    try {
      const res = await updateReceipt(receiptId, { propertyId })
      if (res.status === 'success') {
        setMatchedReceipts((prev) =>
          prev.map((r) =>
            r.id === receiptId
              ? { ...r, propertyId, propertyName: properties.find((p) => p.id === propertyId)?.address || null }
              : r
          )
        )
      } else {
        showNotification(res.message || t('failedToUpdateReceipt'), 'error')
      }
    } catch (err) {
      console.error('Assign property error:', err)
      showNotification(err instanceof Error ? err.message : t('failedToUpdateReceipt'), 'error')
    } finally {
      setAssigningReceiptProperty(null)
    }
  }

  // ─── Extra charge handlers ────────────────────────────────────────────────

  const handleAddExtraItem = () => {
    if (!extraDesc.trim()) {
      showNotification(t('descriptionRequired'), 'error')
      return
    }
    if (!extraAmount || parseFloat(extraAmount) <= 0) {
      showNotification(t('amountRequired'), 'error')
      return
    }
    if (!extraPropertyId) {
      showNotification(t('propertyRequired'), 'error')
      return
    }

    const newItem: LocalExtraItem = {
      _id: crypto.randomUUID(),
      description: extraDesc.trim(),
      amount: parseFloat(extraAmount),
      propertyId: extraPropertyId,
      isTaxable: extraTaxable,
    }

    setExtraItems((prev) => [...prev, newItem])
    setExtraDesc('')
    setExtraAmount('')
    setExtraPropertyId('')
    setExtraTaxable(false)
    showNotification(t('extraItemAdded'), 'success')
  }

  const removeExtraItem = (id: string) => {
    setExtraItems((prev) => prev.filter((item) => item._id !== id))
  }

  // ─── Generate invoice ─────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (totalItemCount === 0) return
    setIsSubmitting(true)

    try {
      // Build project overrides
      const itemOverrides: Record<string, { durationMinutes?: number; amount?: number; isTaxable?: boolean }> = {}
      selectedProjectIds.forEach((id) => {
        const project = availableProjects.find((p) => p.id === id)
        const override = projectOverrides.get(id)
        if (!project || !override) return
        const defaultDuration = getDurationMinutes(project)
        const hasChanges = override.durationMinutes !== defaultDuration || override.amountManuallySet || override.isTaxable
        if (hasChanges) {
          const entry: { durationMinutes?: number; amount?: number; isTaxable?: boolean } = {}
          if (override.durationMinutes !== defaultDuration) entry.durationMinutes = override.durationMinutes
          if (override.amountManuallySet) entry.amount = override.amount
          if (override.isTaxable) entry.isTaxable = true
          itemOverrides[id] = entry
        }
      })

      const res = await createInvoice({
        cleanerId: cleaner.id,
        ...(periodStart && { periodStart }),
        ...(periodEnd && { periodEnd }),
        projectIds: Array.from(selectedProjectIds),
        expenseIds: Array.from(selectedExpenseIds),
        receiptIds: Array.from(selectedReceiptIds),
        ...(extraItems.length > 0 ? {
          extraItems: extraItems.map(({ _id, ...rest }) => rest),
        } : {}),
        ...(Object.keys(itemOverrides).length > 0 ? { itemOverrides } : {}),
        taxHstEnabled,
        taxGstEnabled,
        taxQstEnabled,
      })

      if (res.status === 'success') {
        showNotification(
          t('invoiceGeneratedWithItems', { number: res.data.invoiceNumber, count: res.data.items?.length || totalItemCount }),
          'success'
        )
        onCreated(res.data)
      } else {
        showNotification(res.message || t('failedToGenerateInvoice'), 'error')
      }
    } catch (err) {
      console.error('Error creating invoice:', err)
      showNotification(err instanceof Error ? err.message : t('errorGeneratingInvoice'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderConflictItemRow = (label: string, dateStr: string | null | undefined) => (
    <div className="flex items-center justify-between gap-3 py-1.5 px-2 rounded text-xs">
      <span className="text-gray-700 truncate">{label}</span>
      <span className="text-gray-400 tabular-nums flex-shrink-0">
        {dateStr ? formatProjectDate(dateStr) : '—'}
      </span>
    </div>
  )

  const renderConflictGroup = (
    title: string,
    items: Array<{ key: string; label: string; date: string | null | undefined }>
  ) => {
    if (items.length === 0) return null
    const visible = items.slice(0, 5)
    const overflow = items.length - visible.length
    return (
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          {title} ({items.length})
        </p>
        <div className="rounded-lg bg-gray-50 border border-gray-100 divide-y divide-gray-100">
          {visible.map((it) => (
            <div key={it.key}>{renderConflictItemRow(it.label, it.date)}</div>
          ))}
          {overflow > 0 && (
            <div className="text-[11px] text-gray-400 px-2 py-1.5">+{overflow} more</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-5xl w-[95%] sm:w-11/12 max-h-[92vh] flex flex-col">
      {/* ═══ Header ═══ */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('generateInvoiceTitle')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('generateInvoiceSubtitle')}</p>
      </div>

      {/* ═══ Global Filters ═══ */}
      <div className="px-5 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/50">
        {/* Date presets */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { label: t('currentMonth'), getRange: () => {
              const now = new Date()
              return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
            }},
            { label: t('lastMonth'), getRange: () => {
              const now = new Date()
              return {
                start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                end: new Date(now.getFullYear(), now.getMonth(), 0),
              }
            }},
            { label: t('pastTwoWeeks'), getRange: () => {
              const now = new Date()
              const twoWeeksAgo = new Date(now)
              twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
              return { start: twoWeeksAgo, end: now }
            }},
          ].map((preset) => {
            const { start, end } = preset.getRange()
            const isActive = periodStart === formatDateInput(start) && periodEnd === formatDateInput(end)
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPeriodStart(formatDateInput(start))
                  setPeriodEnd(formatDateInput(end))
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* Date inputs + property filter + search */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="relative">
            <CalendarDaysIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              placeholder={t('periodStart')}
              className="w-full pl-8 pr-2 py-2 min-h-[40px] border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            />
          </div>
          <div className="relative">
            <CalendarDaysIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              placeholder={t('periodEnd')}
              className="w-full pl-8 pr-2 py-2 min-h-[40px] border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            />
          </div>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="w-full px-3 py-2 min-h-[40px] border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
          >
            <option value="">{t('allProperties')}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchItemsPlaceholder')}
              className="w-full pl-8 pr-3 py-2 min-h-[40px] border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            />
          </div>
        </div>
      </div>

      {/* ═══ Content (scrollable) ═══ */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-6">

        {/* ─── Projects Section ─── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BuildingOfficeIcon className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">{t('projectsTab')}</h3>
            {projectCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">{projectCount}</span>
            )}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-gray-400 mb-3">
            <InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
            Completed projects for this cleaner that are not yet on any invoice.
          </p>
          <div>
            {loadingProjects ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-7 h-7 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">{t('searchingCompletedProjects')}</span>
                </div>
              </div>
            ) : availableProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <ExclamationTriangleIcon className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">{t('noProjectsFound')}</h3>
                <p className="text-xs text-gray-500 max-w-xs">{t('noUninvoicedProjectsHint')}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  {t('completedProjectCount', { count: availableProjects.length })}
                </p>
                {/* Column Headers (desktop) */}
                <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-4 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  <div className="w-5" />
                  <div>{t('projectColumnHeader')}</div>
                  <div className="text-center w-20">{t('rateColumnHeader')}</div>
                  <div className="text-center w-32">{t('durationColumnHeader')}</div>
                  <div className="text-right w-28">{t('amountColumnHeader')}</div>
                </div>
                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[380px] overflow-y-auto">
                  {availableProjects.map((project) => {
                    const isSelected = selectedProjectIds.has(project.id)
                    const override = projectOverrides.get(project.id)
                    const hourly = isHourlyRate(project, cleaner.hourlyRate)
                    const rateLabel = getRateLabel(project, cleaner.hourlyRate, t)

                    return (
                      <div key={project.id} className={`transition-colors ${isSelected ? 'bg-emerald-50/50' : 'bg-white'}`}>
                        {/* Desktop */}
                        <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center p-3 sm:p-4">
                          <button
                            type="button"
                            onClick={() => toggleProject(project.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                              isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 hover:border-emerald-400'
                            }`}
                          >
                            {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <BuildingOfficeIcon className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {project.propertyAddress || project.propertyName || t('unknownProperty')}
                              </p>
                            </div>
                            <p className="text-xs text-gray-400 ml-5">{formatProjectDate(project.projectDate)}</p>
                          </div>
                          <div className="w-20 text-center">
                            <span className="text-xs text-gray-500">{rateLabel}</span>
                          </div>
                          <div className="w-32">
                            {hourly ? (
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={override ? Math.floor(override.durationMinutes / 60) : ''}
                                  onChange={(e) => handleHoursChange(project.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-12 px-1.5 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                                />
                                <span className="text-[10px] text-gray-400">{t('hrShort')}</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={override ? override.durationMinutes % 60 : ''}
                                  onChange={(e) => handleMinsChange(project.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-12 px-1.5 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                                />
                                <span className="text-[10px] text-gray-400">{t('minShort')}</span>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 text-center">—</p>
                            )}
                          </div>
                          <div className="w-28">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setProjectOverrides((prev) => {
                                    const next = new Map(prev)
                                    const cur = next.get(project.id)
                                    if (cur) next.set(project.id, { ...cur, isTaxable: !cur.isTaxable })
                                    return next
                                  })
                                }}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                                  override?.isTaxable
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200'
                                }`}
                                title={override?.isTaxable ? t('taxableClickRemove') : t('notTaxableClickAdd')}
                              >
                                {t('taxShort')}
                              </button>
                              <span className="text-xs text-gray-400">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={override?.amount != null ? (override.amount === 0 && !override.amountManuallySet ? '' : override.amount) : ''}
                                onChange={(e) => handleAmountChange(project.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="0.00"
                                className={`w-20 px-2 py-1 text-xs text-right border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white ${
                                  override?.amountManuallySet ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                        {/* Mobile */}
                        <div className="sm:hidden p-3">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleProject(project.id)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer ${
                                isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 hover:border-emerald-400'
                              }`}
                            >
                              {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <BuildingOfficeIcon className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {project.propertyAddress || project.propertyName || t('unknownProperty')}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-5 mb-2">
                                <span className="text-xs text-gray-400">{formatProjectDate(project.projectDate)}</span>
                                <span className="text-xs text-gray-500">{rateLabel}</span>
                              </div>
                              <div className="flex items-center gap-3 ml-5 flex-wrap">
                                {hourly && (
                                  <div className="flex items-center gap-1">
                                    <ClockIcon className="h-3 w-3 text-gray-400" />
                                    <input
                                      type="number" min="0"
                                      value={override ? Math.floor(override.durationMinutes / 60) : ''}
                                      onChange={(e) => handleHoursChange(project.id, e.target.value)}
                                      className="w-12 px-1.5 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <span className="text-[10px] text-gray-400">{t('hrShort')}</span>
                                    <input
                                      type="number" min="0" max="59"
                                      value={override ? override.durationMinutes % 60 : ''}
                                      onChange={(e) => handleMinsChange(project.id, e.target.value)}
                                      className="w-12 px-1.5 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <span className="text-[10px] text-gray-400">{t('minShort')}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <CurrencyDollarIcon className="h-3 w-3 text-gray-400" />
                                  <input
                                    type="number" step="0.01" min="0"
                                    value={override?.amount != null ? (override.amount === 0 && !override.amountManuallySet ? '' : override.amount) : ''}
                                    onChange={(e) => handleAmountChange(project.id, e.target.value)}
                                    placeholder="0.00"
                                    className={`w-20 px-1.5 py-1 text-xs text-right border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                      override?.amountManuallySet ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">{t('hoursAmountsPrefilledHint')}</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Expenses Section ─── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BanknotesIcon className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">{t('expensesTab')}</h3>
            {expenseCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{expenseCount}</span>
            )}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-gray-400 mb-3">
            <InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
            Expenses paid by this cleaner that are not yet on any invoice.
          </p>
          <div>
            {loadingExpenses ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">{t('searchingReimbursableExpenses')}</span>
                </div>
              </div>
            ) : availableExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <BanknotesIcon className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">{t('noAvailableExpensesForRange')}</h3>
                <p className="text-xs text-gray-500 max-w-xs">{t('noAvailableExpensesHint')}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  {t('availableExpenseCount', { count: availableExpenses.length })}
                </p>
                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[380px] overflow-y-auto">
                  {availableExpenses.map((expense) => {
                    const isSelected = selectedExpenseIds.has(expense.id)
                    return (
                      <div
                        key={expense.id}
                        onClick={() => {
                          setSelectedExpenseIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(expense.id)) next.delete(expense.id)
                            else next.add(expense.id)
                            return next
                          })
                        }}
                        className={`flex items-center gap-3 p-3 sm:p-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-50/50' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <button
                          type="button"
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? 'bg-amber-600 border-amber-600' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                        </button>
                        <BanknotesIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {expense.vendorName || t('unknownVendor')}
                            </p>
                            {expense.isReimbursable && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium flex-shrink-0">
                                {t('reimbursable')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {expense.propertyId && (
                              <span className="text-xs text-gray-400 truncate">{properties.find((p) => p.id === expense.propertyId)?.address || expense.propertyName}</span>
                            )}
                            {expense.propertyId && expense.expenseDate && (
                              <span className="text-xs text-gray-300">&middot;</span>
                            )}
                            {expense.expenseDate && (
                              <span className="text-xs text-gray-400">{formatProjectDate(expense.expenseDate)}</span>
                            )}
                            {expense.category && (
                              <>
                                <span className="text-xs text-gray-300">&middot;</span>
                                <span className="text-[10px] text-gray-400">{expense.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {expense.receiptId && (
                            <DocumentTextIcon className="h-4 w-4 text-blue-400" title={t('hasReceipt')} />
                          )}
                          <span className="text-sm font-semibold text-gray-900 tabular-nums">
                            ${expense.amount.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingExpenseId(expense.id) }}
                            className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit expense"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Receipts Section ─── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DocumentTextIcon className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">{t('receiptsTab')}</h3>
            {receiptCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">{receiptCount}</span>
            )}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-gray-400 mb-3">
            <InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
            Receipts uploaded by this cleaner that have been processed and are ready to attach.
          </p>
          <div className="space-y-4">
            {/* Upload section */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('uploadReceiptInline')}</h3>
              <div className="space-y-3">
                <select
                  value={uploadPropertyId}
                  onChange={(e) => setUploadPropertyId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                >
                  <option value="">{t('selectProperty')}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
                </select>

                {uploadFile ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    {uploadFilePreview ? (
                      <img src={uploadFilePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-green-200" />
                    ) : (
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DocumentTextIcon className="w-5 h-5 text-green-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{uploadFile.name}</p>
                      <p className="text-[11px] text-gray-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button type="button" onClick={removeUploadFile} className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer flex-shrink-0 rounded-lg hover:bg-red-50 transition-colors">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium cursor-pointer"
                    >
                      <CameraIcon className="w-3.5 h-3.5" />
                      {t('takePhoto')}
                    </button>
                    <div
                      className={`flex-1 border-2 border-dashed rounded-lg p-2.5 text-center transition-all cursor-pointer ${
                        isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <PhotoIcon className="mx-auto h-5 w-5 text-gray-300 mb-1" />
                      <p className="text-xs text-gray-500">{t('dragDropOrBrowse')}</p>
                    </div>
                  </div>
                )}

                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = '' }} className="hidden" />
                <input ref={fileInputRef} type="file" accept={ALLOWED_TYPES.join(',')} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = '' }} className="hidden" />

                {uploadFile && (
                  <button
                    type="button"
                    onClick={handleUploadReceipt}
                    disabled={!uploadPropertyId || isUploading}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                        {t('uploadingReceipt')}
                      </>
                    ) : (
                      t('uploadAndAdd')
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Matched receipts list */}
            <div>
              {loadingReceipts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : matchedReceipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-0.5">{t('noMatchedReceipts')}</p>
                  <p className="text-xs text-gray-500 max-w-xs">{t('noMatchedReceiptsHint')}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    {t('matchedReceiptsAvailable', { count: matchedReceipts.length })}
                  </p>
                  <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                    {matchedReceipts.map((receipt) => {
                      const isSelected = selectedReceiptIds.has(receipt.id)
                      const needsProperty = !receipt.propertyId
                      const isAssigning = assigningReceiptProperty === receipt.id
                      return (
                        <div key={receipt.id} className="transition-colors">
                          <div
                            onClick={() => {
                              if (needsProperty) return
                              setSelectedReceiptIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(receipt.id)) next.delete(receipt.id)
                                else next.add(receipt.id)
                                return next
                              })
                            }}
                            className={`flex items-center gap-3 p-3 ${
                              needsProperty
                                ? 'cursor-default bg-amber-50/40'
                                : isSelected
                                  ? 'cursor-pointer bg-blue-50/50'
                                  : 'cursor-pointer bg-white hover:bg-gray-50'
                            }`}
                          >
                            {/* Checkbox — disabled when no property */}
                            <button
                              type="button"
                              disabled={needsProperty}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                needsProperty
                                  ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'border-gray-300'
                              }`}
                            >
                              {isSelected && !needsProperty && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                            </button>
                            <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200 ${
                              needsProperty ? 'bg-amber-50' : isSelected ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <ReceiptThumbnail
                                signedUrl={receipt.signedUrl}
                                mimeType={receipt.mimeType}
                                originalName={receipt.originalName}
                                imgClassName="w-full h-full object-cover"
                                pdfRenderWidth={120}
                                fallback={<DocumentTextIcon className={`w-4 h-4 ${needsProperty ? 'text-amber-500' : isSelected ? 'text-blue-600' : 'text-gray-400'}`} />}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${needsProperty ? 'text-amber-900' : isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                {receipt.vendorName || receipt.originalName}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400">{formatProjectDate(receipt.createdAt)}</span>
                                {receipt.propertyId ? (
                                  <>
                                    <span className="text-[10px] text-gray-300">&middot;</span>
                                    <span className="text-[10px] text-gray-400 truncate">{properties.find((p) => p.id === receipt.propertyId)?.address || receipt.propertyName}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10px] text-gray-300">&middot;</span>
                                    <span className="text-[10px] font-medium text-amber-600">{t('assignPropertyToSelect')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 tabular-nums flex-shrink-0">
                              {formatAmount(receipt.total || receipt.subtotal)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingReceiptId(receipt.id) }}
                              title="Edit receipt"
                              className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleArchiveReceipt(receipt.id)
                              }}
                              aria-label={t('archiveReceipt')}
                              title={t('archiveReceipt')}
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Inline property assignment row */}
                          {needsProperty && (
                            <div className="flex items-center gap-2 px-3 pb-3 pt-0 bg-amber-50/40">
                              <div className="w-5 flex-shrink-0" /> {/* spacer to align with checkbox */}
                              <BuildingOfficeIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              <select
                                value=""
                                disabled={isAssigning}
                                onChange={(e) => {
                                  if (e.target.value) handleAssignReceiptProperty(receipt.id, e.target.value)
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-xs border border-amber-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                              >
                                <option value="">{isAssigning ? t('saving') : t('selectProperty')}</option>
                                {properties.map((p) => (
                                  <option key={p.id} value={p.id}>{p.address}</option>
                                ))}
                              </select>
                              {isAssigning && (
                                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Extra Charges Section ─── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CurrencyDollarIcon className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">Extra Charges</h3>
            {extraCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">{extraCount}</span>
            )}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-gray-400 mb-3">
            <InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
            Add manual line items like mileage, key pickups, or other charges.
          </p>
          <div className="space-y-4">
            {/* Add form */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('addExtraChargeTitle')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('extraItemDescription')} *</label>
                  <input
                    type="text"
                    value={extraDesc}
                    onChange={(e) => setExtraDesc(e.target.value)}
                    placeholder={t('extraItemDescriptionPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('extraItemAmount')} *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={extraAmount}
                        onChange={(e) => setExtraAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('extraItemProperty')} *</label>
                    <select
                      value={extraPropertyId}
                      onChange={(e) => setExtraPropertyId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                    >
                      <option value="">{t('selectProperty')}</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.address}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setExtraTaxable(!extraTaxable)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                      extraTaxable
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                      extraTaxable ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {extraTaxable && <CheckIcon className="h-2.5 w-2.5 text-white" />}
                    </div>
                    {t('taxable')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddExtraItem}
                    disabled={!extraDesc.trim() || !extraAmount || !extraPropertyId}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    {t('addExtraItem')}
                  </button>
                </div>
              </div>
            </div>

            {/* Added extra items list */}
            {extraItems.length > 0 && (
              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                {extraItems.map((item) => {
                  const prop = properties.find((p) => p.id === item.propertyId)
                  return (
                    <div key={item._id} className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <PlusIcon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                        <div className="flex items-center gap-1.5">
                          {prop && <span className="text-[10px] text-gray-400 truncate">{prop.address}</span>}
                          {item.isTaxable && (
                            <>
                              <span className="text-[10px] text-gray-300">&middot;</span>
                              <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">{t('taxShort')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                        ${item.amount.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExtraItem(item._id)}
                        className="p-1 text-gray-400 hover:text-red-500 cursor-pointer rounded hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Selected Items Cart (collapsible) ═══ */}
      {totalItemCount > 0 && (
        <div className="border-t border-gray-200">
          <button
            type="button"
            onClick={() => setCartExpanded(!cartExpanded)}
            className="w-full flex items-center justify-between px-5 sm:px-6 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingCartIcon className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">{t('selectedItemsCart')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                {totalItemCount}
              </span>
            </div>
            {cartExpanded ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
          </button>

          {cartExpanded && (
            <div className="px-5 sm:px-6 py-3 bg-gray-50/50 max-h-[200px] overflow-y-auto space-y-2">
              {/* Projects */}
              {projectCount > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('cartProjects')} ({projectCount})</p>
                  {Array.from(selectedProjectIds).map((id) => {
                    const p = availableProjects.find((proj) => proj.id === id)
                    const ov = projectOverrides.get(id)
                    if (!p) return null
                    return (
                      <div key={id} className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-600 truncate mr-2">{p.propertyAddress || p.propertyName} — {formatProjectDate(p.projectDate)}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-medium text-gray-900 tabular-nums">${ov?.amount.toFixed(2) || '0.00'}</span>
                          <button type="button" onClick={() => toggleProject(id)} className="text-gray-400 hover:text-red-500 cursor-pointer"><XMarkIcon className="h-3 w-3" /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Expenses */}
              {expenseCount > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('cartExpenses')} ({expenseCount})</p>
                  {Array.from(selectedExpenseIds).map((id) => {
                    const e = availableExpenses.find((exp) => exp.id === id)
                    if (!e) return null
                    return (
                      <div key={id} className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-600 truncate mr-2">{e.vendorName || t('unknownVendor')}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-medium text-gray-900 tabular-nums">${e.amount.toFixed(2)}</span>
                          <button type="button" onClick={() => setSelectedExpenseIds((prev) => { const n = new Set(prev); n.delete(id); return n })} className="text-gray-400 hover:text-red-500 cursor-pointer"><XMarkIcon className="h-3 w-3" /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Receipts */}
              {receiptCount > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('cartReceipts')} ({receiptCount})</p>
                  {Array.from(selectedReceiptIds).map((id) => {
                    const r = matchedReceipts.find((rec) => rec.id === id)
                    if (!r) return null
                    return (
                      <div key={id} className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-600 truncate mr-2">{r.vendorName || r.originalName}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-medium text-gray-900 tabular-nums">{formatAmount(r.total || r.subtotal)}</span>
                          <button type="button" onClick={() => setSelectedReceiptIds((prev) => { const n = new Set(prev); n.delete(id); return n })} className="text-gray-400 hover:text-red-500 cursor-pointer"><XMarkIcon className="h-3 w-3" /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Extra charges */}
              {extraCount > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('cartExtraCharges')} ({extraCount})</p>
                  {extraItems.map((item) => (
                    <div key={item._id} className="flex items-center justify-between py-1">
                      <span className="text-xs text-gray-600 truncate mr-2">{item.description}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-900 tabular-nums">${item.amount.toFixed(2)}</span>
                        <button type="button" onClick={() => removeExtraItem(item._id)} className="text-gray-400 hover:text-red-500 cursor-pointer"><XMarkIcon className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Footer ═══ */}
      <div className="border-t border-gray-200 px-5 sm:px-6 py-4">
        {/* Tax Toggles */}
        {totalItemCount > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('taxLabel')}:</span>
            {([
              { key: 'hst' as const, enabled: taxHstEnabled, setter: setTaxHstEnabled },
              { key: 'gst' as const, enabled: taxGstEnabled, setter: setTaxGstEnabled },
              { key: 'qst' as const, enabled: taxQstEnabled, setter: setTaxQstEnabled },
            ]).map(({ key, enabled, setter }) => (
              <button
                key={key}
                type="button"
                onClick={() => setter(!enabled)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                  enabled
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                  enabled ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                }`}>
                  {enabled && <CheckIcon className="h-2.5 w-2.5 text-white" />}
                </div>
                {TAX_RATES[key].label} ({TAX_RATES[key].pct})
              </button>
            ))}
          </div>
        )}

        {/* Summary + Generate */}
        {totalItemCount > 0 && (
          <div className="flex items-center justify-between mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {t('canContinueEditingAfter')}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              {hasTax ? (
                <>
                  <p className="text-xs text-emerald-600">{t('subtotal')}: ${selectedSubtotal.toFixed(2)}</p>
                  {taxHstEnabled && <p className="text-[10px] text-emerald-500">{TAX_RATES.hst.label}: ${taxPreview.hst.toFixed(2)}</p>}
                  {taxGstEnabled && <p className="text-[10px] text-emerald-500">{TAX_RATES.gst.label}: ${taxPreview.gst.toFixed(2)}</p>}
                  {taxQstEnabled && <p className="text-[10px] text-emerald-500">{TAX_RATES.qst.label}: ${taxPreview.qst.toFixed(2)}</p>}
                  <p className="text-lg font-bold text-emerald-800 mt-0.5">${selectedTotal.toFixed(2)}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-emerald-600">{t('total')}</p>
                  <p className="text-xl font-bold text-emerald-800">${selectedTotal.toFixed(2)}</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 min-h-[44px] text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm font-medium cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmation(true)}
            disabled={isSubmitting || totalItemCount === 0}
            className="px-6 py-2.5 min-h-[44px] text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 font-semibold text-sm shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            {`${t('generateInvoice')} — $${selectedTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </Modal>

    {/* ─── Period conflict confirmation overlay ─── */}
    {periodConflict && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="period-conflict-title"
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          <div className="px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              <h3 id="period-conflict-title" className="text-base font-semibold text-gray-900">
                Items outside this period
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {(() => {
                const total =
                  periodConflict.projects.length +
                  periodConflict.expenses.length +
                  periodConflict.receipts.length
                return `${total} selected ${total === 1 ? 'item is' : 'items are'} outside the chosen date range. Expand the period to keep them, or drop them from the invoice.`
              })()}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {renderConflictGroup(
              'Projects',
              periodConflict.projects.map((p) => ({
                key: p.id,
                label: p.propertyName || p.propertyAddress || 'Project',
                date: p.projectDate,
              }))
            )}
            {renderConflictGroup(
              'Expenses',
              periodConflict.expenses.map((e) => ({
                key: e.id,
                label: e.vendorName || e.description || 'Expense',
                date: e.expenseDate,
              }))
            )}
            {renderConflictGroup(
              'Receipts',
              periodConflict.receipts.map((r) => ({
                key: r.id,
                label: r.vendorName || r.originalName || 'Receipt',
                date: r.expenseDate,
              }))
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={handleDropOutOfRange}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Drop items
            </button>
            <button
              type="button"
              onClick={handleExpandPeriod}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Expand period
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ─── Invoice confirmation overlay ─── */}
    {showConfirmation && createPortal(
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-invoice-title"
          className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <ShoppingCartIcon className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 id="confirm-invoice-title" className="text-base font-semibold text-gray-900">
                  {t('reviewYourInvoice')}
                </h3>
                <p className="text-xs text-gray-500">{t('reviewInvoiceHint')}</p>
              </div>
            </div>
          </div>

          {/* Scrollable item list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Projects */}
            {projectCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <CalendarDaysIcon className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('cartProjects')}</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{projectCount}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 tabular-nums">${projectSubtotal.toFixed(2)}</span>
                </div>
                <div className="rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {Array.from(selectedProjectIds).map((id) => {
                    const p = availableProjects.find((proj) => proj.id === id)
                    const ov = projectOverrides.get(id)
                    if (!p) return null
                    return (
                      <div key={id} className="flex items-center gap-2 px-3 py-2 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{p.propertyAddress || p.propertyName}</p>
                          <p className="text-[10px] text-gray-400">{formatProjectDate(p.projectDate)}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900 tabular-nums flex-shrink-0">${ov?.amount.toFixed(2) || '0.00'}</span>
                        <button
                          type="button"
                          onClick={() => toggleProject(id)}
                          className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Expenses */}
            {expenseCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <BanknotesIcon className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('cartExpenses')}</span>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">{expenseCount}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 tabular-nums">${expenseSubtotal.toFixed(2)}</span>
                </div>
                <div className="rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {Array.from(selectedExpenseIds).map((id) => {
                    const e = availableExpenses.find((exp) => exp.id === id)
                    if (!e) return null
                    return (
                      <div key={id} className="flex items-center gap-2 px-3 py-2 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{e.vendorName || t('unknownVendor')}</p>
                          <p className="text-[10px] text-gray-400">{e.propertyName || ''}{e.expenseDate ? ` · ${formatProjectDate(e.expenseDate)}` : ''}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900 tabular-nums flex-shrink-0">${Number(e.amount).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedExpenseIds((prev) => { const n = new Set(prev); n.delete(id); return n })}
                          className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Receipts */}
            {receiptCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <DocumentTextIcon className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('cartReceipts')}</span>
                    <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">{receiptCount}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 tabular-nums">${receiptSubtotal.toFixed(2)}</span>
                </div>
                <div className="rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {Array.from(selectedReceiptIds).map((id) => {
                    const r = matchedReceipts.find((rec) => rec.id === id)
                    if (!r) return null
                    return (
                      <div key={id} className="flex items-center gap-2 px-3 py-2 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{r.vendorName || r.originalName}</p>
                          <p className="text-[10px] text-gray-400">{formatProjectDate(r.createdAt)}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900 tabular-nums flex-shrink-0">{formatAmount(r.total || r.subtotal)}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptIds((prev) => { const n = new Set(prev); n.delete(id); return n })}
                          className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Extra Charges */}
            {extraCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <CurrencyDollarIcon className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('cartExtraCharges')}</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{extraCount}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 tabular-nums">${extraSubtotal.toFixed(2)}</span>
                </div>
                <div className="rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {extraItems.map((item) => {
                    const prop = properties.find((p) => p.id === item.propertyId)
                    return (
                      <div key={item._id} className="flex items-center gap-2 px-3 py-2 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{item.description}</p>
                          <p className="text-[10px] text-gray-400">{prop?.address || ''}{item.isTaxable ? ` · ${t('taxable')}` : ''}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900 tabular-nums flex-shrink-0">${item.amount.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => removeExtraItem(item._id)}
                          className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Summary + Footer */}
          <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/80">
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('subtotal')}</span>
                <span className="font-medium text-gray-900 tabular-nums">${selectedSubtotal.toFixed(2)}</span>
              </div>
              {taxHstEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{TAX_RATES.hst.label} ({TAX_RATES.hst.pct})</span>
                  <span className="text-gray-600 tabular-nums">${taxPreview.hst.toFixed(2)}</span>
                </div>
              )}
              {taxGstEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{TAX_RATES.gst.label} ({TAX_RATES.gst.pct})</span>
                  <span className="text-gray-600 tabular-nums">${taxPreview.gst.toFixed(2)}</span>
                </div>
              )}
              {taxQstEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{TAX_RATES.qst.label} ({TAX_RATES.qst.pct})</span>
                  <span className="text-gray-600 tabular-nums">${taxPreview.qst.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base pt-1 border-t border-gray-200">
                <span className="font-semibold text-gray-900">{t('total')}</span>
                <span className="font-bold text-emerald-700 tabular-nums">${selectedTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t('goBack')}
              </button>
              <button
                type="button"
                onClick={() => { handleGenerate(); }}
                disabled={isSubmitting || totalItemCount === 0}
                className="px-6 py-2.5 text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 font-semibold text-sm shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                {isSubmitting ? t('generatingInvoice') : t('confirmAndGenerate')}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* ─── Per-row editor sub-modals (open on pencil-click) ─── */}
    {editingExpenseId && (
      <ExpenseViewerModal
        isOpen={true}
        onClose={() => setEditingExpenseId(null)}
        expenseId={editingExpenseId}
        zIndex={90}
        onExpenseUpdated={() => {
          // Refetch expenses so the row reflects the edit
          getAvailableExpenses(
            cleaner.id,
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
        onUpdated={() => {
          // Refetch receipts so the row reflects the edit
          searchReceipts({
            status: 'matched',
            linked: 'unlinked',
            propertyId: propertyFilter || undefined,
            search: searchQuery || undefined,
          }).then((res) => {
            if (res.status === 'success') {
              const ownReceipts = res.data.filter(r => r.uploadedBy === cleaner.authUserId)
              setMatchedReceipts(ownReceipts)
            }
          }).catch(console.error)
        }}
      />
    )}
    </>
  )
}

export default CreateInvoiceModal
