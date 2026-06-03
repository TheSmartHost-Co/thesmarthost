'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import {
  getReceiptById,
  updateReceipt,
  applyReceipt,
  archiveReceipt,
  unarchiveReceipt,
  createReceiptLineItem,
  updateReceiptLineItem,
  deleteReceipt,
  deleteReceiptLineItem,
  uploadReceipt,
} from '@/services/receiptService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import { getAllSupplyLists } from '@/services/supplyListService'
import { getCleaningProjects } from '@/services/cleaningProjectService'
import { getCleaners, getCleanerByAuthUserId } from '@/services/cleanerService'
import { getTeamMembers } from '@/services/teamMemberService'
import { getUserProfile } from '@/services/profileService'
import type { ReceiptDetail, ReceiptLineItem, ReceiptStatus, ApplyReceiptPayload, UpdateReceiptPayload, PaidByType, ConfirmedMapping } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'
import type { SupplyList } from '@/services/types/supplyList'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { ExpenseCategory } from '@/services/types/expenseCategories'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { usePermissions } from '@/hooks/usePermissions'
import SearchableSelect from '@/components/shared/SearchableSelect'
import type { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import {
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import TabBar from '@/components/shared/TabBar'
import RelatedEntityCard from '@/components/shared/RelatedEntityCard'
import PropertyChip from '@/components/receipt/PropertyChip'
import PropertyEditPill from '@/components/receipt/PropertyEditPill'
import ExpenseViewerModal from '@/components/expenses/ExpenseViewerModal'
import ViewSupplyListsModal from '@/components/turnover/supply-lists/ViewSupplyListsModal'
import ReceiptMatchReviewModal from '@/components/receipt/match-review/ReceiptMatchReviewModal'

interface ReceiptDetailModalProps {
  isOpen: boolean
  onClose: () => void
  receiptId: string
  properties: Property[]
  onUpdated: () => void
  onDeleted?: () => void
  // Context hints for pre-filling the apply tab
  defaultPropertyId?: string
  defaultSupplyListId?: string
  defaultProjectId?: string
  defaultPaidByType?: PaidByType
  defaultPaidById?: string | null
  readOnly?: boolean
  zIndex?: number
}

type Tab = 'view' | 'edit' | 'apply' | 'related'

interface EditLineItem {
  id?: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  manualTotal: boolean
}

interface EditFormState {
  vendorName: string
  description: string
  expenseDate: string
  paymentMethod: string
  subtotal: string
  taxGst: string
  taxPst: string
  taxHst: string
  taxQst: string
  taxSales: string
  taxTotal: string
  total: string
  // mig 036: currency override on the receipt. Empty string = "leave NULL,
  // backend falls back to profile.home_currency at apply time".
  currency: string
  manualSubtotal: boolean
  manualTaxTotal: boolean
  manualTotal: boolean
}

const CURRENCY_OPTIONS: Array<{ value: '' | 'CAD' | 'USD'; label: string }> = [
  { value: '', label: 'Auto (use my default)' },
  { value: 'CAD', label: 'CAD' },
  { value: 'USD', label: 'USD' },
]

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'etransfer', label: 'E-Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
]

const statusConfig: Record<ReceiptStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  matched: { label: 'Ready', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  applied: { label: 'Applied', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  archived: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

const p = (v: string | number | null | undefined) => parseFloat(String(v)) || 0
const fmt = (v: number | string | null | undefined) => v != null ? `$${p(v).toFixed(2)}` : '—'

const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  isOpen,
  onClose,
  receiptId: initialReceiptId,
  properties,
  onUpdated,
  onDeleted,
  defaultPropertyId,
  defaultSupplyListId,
  defaultProjectId,
  defaultPaidByType,
  defaultPaidById,
  readOnly,
  zIndex,
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)
  const { profile } = useUserStore()
  const { effectiveUserId } = usePermissions()

  const [receiptId, setReceiptId] = useState(initialReceiptId)
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null)
  const [lineItems, setLineItems] = useState<ReceiptLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('view')
  const [imageZoom, setImageZoom] = useState(1)

  // Edit form state
  const [editForm, setEditForm] = useState<EditFormState>({
    vendorName: '', description: '', expenseDate: '', paymentMethod: 'credit_card',
    subtotal: '', taxGst: '', taxPst: '', taxHst: '', taxQst: '', taxSales: '', taxTotal: '', total: '',
    currency: '',
    manualSubtotal: false, manualTaxTotal: false, manualTotal: false,
  })
  const [editLineItems, setEditLineItems] = useState<EditLineItem[]>([])
  const [deletedLineItemIds, setDeletedLineItemIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [showTaxes, setShowTaxes] = useState(false)

  // Inline property editor (View tab) — quick-assign without going to Edit

  // Apply form state
  const [applyPropertyId, setApplyPropertyId] = useState('')
  const [applyCategory, setApplyCategory] = useState('')
  const [applyPaidByType, setApplyPaidByType] = useState<PaidByType>('PROPERTY-MANAGER')
  const [applyPaidById, setApplyPaidById] = useState<string | null>(null)
  const [applySupplyMode, setApplySupplyMode] = useState<'none' | 'new' | 'existing'>('none')
  const [applyProjectId, setApplyProjectId] = useState('')
  const [applySupplyListId, setApplySupplyListId] = useState('')
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [applySubmitting, setApplySubmitting] = useState(false)
  const [availableSupplyLists, setAvailableSupplyLists] = useState<SupplyList[]>([])
  const [availableProjects, setAvailableProjects] = useState<CleaningProject[]>([])
  const [peopleOptions, setPeopleOptions] = useState<SearchableSelectOption<string>[]>([])
  const [peopleTypeMap, setPeopleTypeMap] = useState<Record<string, PaidByType>>({})

  // Match review modal state
  const [showMatchReview, setShowMatchReview] = useState(false)

  // Stacked modal state for related entities
  const [stackedExpenseId, setStackedExpenseId] = useState<string | null>(null)
  const [stackedSupplyListId, setStackedSupplyListId] = useState<string | null>(null)

  const reuploadRef = useRef<HTMLInputElement>(null)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setReceiptId(initialReceiptId)
      setTab('view')
      setImageZoom(1)
    }
  }, [isOpen, initialReceiptId])

  // Fetch receipt
  const fetchReceipt = useCallback(async () => {
    if (!receiptId) return
    setLoading(true)
    try {
      const res = await getReceiptById(receiptId)
      if (res.status === 'success') {
        setReceipt(res.data)
        setLineItems(res.data.lineItems || [])
      } else {
        showNotification(res.message || 'Failed to load receipt', 'error')
      }
    } catch (err) {
      console.error('Fetch receipt error:', err)
      showNotification('Failed to load receipt', 'error')
    } finally {
      setLoading(false)
    }
  }, [receiptId])

  useEffect(() => {
    if (isOpen && receiptId) fetchReceipt()
  }, [isOpen, receiptId, fetchReceipt])

  // Initialize edit form from receipt when switching to edit tab
  const initEditForm = () => {
    if (!receipt) return
    setEditForm({
      vendorName: receipt.vendorName || '',
      description: receipt.description || '',
      expenseDate: receipt.expenseDate || '',
      paymentMethod: receipt.paymentMethod || 'credit_card',
      subtotal: receipt.subtotal != null ? String(receipt.subtotal) : '',
      taxGst: receipt.taxGst != null ? String(receipt.taxGst) : '',
      taxPst: receipt.taxPst != null ? String(receipt.taxPst) : '',
      taxHst: receipt.taxHst != null ? String(receipt.taxHst) : '',
      taxQst: receipt.taxQst != null ? String(receipt.taxQst) : '',
      taxSales: receipt.taxSales != null ? String(receipt.taxSales) : '',
      taxTotal: receipt.taxTotal != null ? String(receipt.taxTotal) : '',
      total: receipt.total != null ? String(receipt.total) : '',
      // Pre-fill from the OCR-detected/user-set currency. Empty means "use my
      // profile's home currency as the source currency" (no override).
      currency: receipt.currency || '',
      manualSubtotal: false, manualTaxTotal: false, manualTotal: false,
    })
    setEditLineItems(lineItems.map((li) => ({
      id: li.id,
      name: li.name,
      quantity: Math.round(p(li.quantity)),
      unitPrice: p(li.unitPrice),
      totalPrice: p(li.totalPrice),
      manualTotal: false,
    })))
    setDeletedLineItemIds([])
    if (receipt.taxGst || receipt.taxPst || receipt.taxHst || receipt.taxQst) setShowTaxes(true)
  }

  const handleTabSwitch = async (newTab: Tab) => {
    if (newTab === 'edit') initEditForm()
    if (newTab === 'apply') {
      // Pre-fill from context defaults, falling back to receipt data
      setApplyPropertyId(defaultPropertyId || receipt?.propertyId || '')
      setApplyCategory('')
      setApplyPaidByType(defaultPaidByType || 'PROPERTY-MANAGER')
      setApplyPaidById(defaultPaidById || profile?.id || null)
      // Pre-select supply list mode based on context
      if (defaultSupplyListId) {
        setApplySupplyMode('existing')
        setApplySupplyListId(defaultSupplyListId)
        setApplyProjectId('')
      } else if (defaultProjectId) {
        setApplySupplyMode('new')
        setApplyProjectId(defaultProjectId)
        setApplySupplyListId('')
      } else {
        setApplySupplyMode('none')
        setApplyProjectId('')
        setApplySupplyListId('')
      }
      if (effectiveUserId && categories.length === 0) {
        getCategoriesByUserId(effectiveUserId).then((res) => {
          if (res.status === 'success') setCategories(res.data)
        }).catch(() => {})
      }
      // Fetch supply lists for "existing" mode
      if (availableSupplyLists.length === 0) {
        getAllSupplyLists().then((res) => {
          if (res.status === 'success') setAvailableSupplyLists(res.data)
        }).catch(() => {})
      }
      // Fetch projects for "new" mode
      if (effectiveUserId && availableProjects.length === 0) {
        const today = new Date()
        const start = new Date(today); start.setDate(start.getDate() - 7)
        const end = new Date(today); end.setDate(end.getDate() + 30)
        const fmt = (d: Date) => d.toISOString().split('T')[0]
        getCleaningProjects({ userId: effectiveUserId, startDate: fmt(start), endDate: fmt(end) }).then((res) => {
          if (res.status === 'success') setAvailableProjects(res.data.filter(p => ['assigned', 'confirmed', 'in_progress'].includes(p.status)))
        }).catch(() => {})
      }
      // Fetch people for "Paid By" picker
      if (effectiveUserId && profile?.id && peopleOptions.length === 0) {
        const roleLabel = (r: string) => r === 'CLEANER' ? 'Cleaner' : r === 'TEAM_MEMBER' ? 'Team Member' : 'PM'
        const roleType = (r: string): PaidByType => r === 'CLEANER' ? 'CLEANER' : r === 'TEAM_MEMBER' ? 'TEAM_MEMBER' : 'PROPERTY-MANAGER'

        const pmUserId = profile.pmUserId || null

        const opts: SearchableSelectOption<string>[] = []
        const typeMap: Record<string, PaidByType> = {}
        // Add current user with correct role label
        opts.push({ value: profile.id, label: `${profile.fullName} (You)`, secondaryLabel: roleLabel(profile.role) })
        typeMap[profile.id] = roleType(profile.role)
        // Fetch PM profile (if current user is not the PM), team members, and cleaners
        Promise.all([
          pmUserId ? getUserProfile(pmUserId).catch(() => null) : null,
          getTeamMembers(effectiveUserId).catch(() => null),
          getCleaners(effectiveUserId).catch(() => null),
        ]).then(([pmRes, tmRes, clRes]) => {
          // Add PM if current user is not the PM
          if (pmRes && pmRes.status === 'success' && pmRes.data) {
            const pm = pmRes.data
            opts.push({ value: pm.id, label: pm.fullName, secondaryLabel: 'PM' })
            typeMap[pm.id] = 'PROPERTY-MANAGER'
          }
          if (tmRes?.status === 'success') {
            tmRes.data.filter(tm => tm.status === 'active' && tm.authUserId && tm.authUserId !== profile.id).forEach(tm => {
              opts.push({ value: tm.authUserId!, label: tm.name, secondaryLabel: 'Team Member' })
              typeMap[tm.authUserId!] = 'TEAM_MEMBER'
            })
          }
          if (clRes?.status === 'success') {
            clRes.data.filter(cl => cl.status === 'active' && cl.authUserId && cl.authUserId !== profile.id).forEach(cl => {
              opts.push({ value: cl.authUserId!, label: cl.name, secondaryLabel: 'Cleaner' })
              typeMap[cl.authUserId!] = 'CLEANER'
            })
          }
          setPeopleOptions([...opts])
          setPeopleTypeMap({ ...typeMap })
        })
      }
    }
    setTab(newTab)
  }

  // --- Edit form field change with cascade ---
  const updateEditField = (field: keyof EditFormState, value: string) => {
    setEditForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'subtotal') {
        next.manualSubtotal = true
        if (!prev.manualTotal) {
          next.total = String(Math.round((p(value) + p(prev.taxTotal)) * 100) / 100)
        }
      } else if (field === 'taxGst' || field === 'taxPst' || field === 'taxHst' || field === 'taxQst') {
        next.manualTaxTotal = false
        const gst = field === 'taxGst' ? p(value) : p(prev.taxGst)
        const pst = field === 'taxPst' ? p(value) : p(prev.taxPst)
        const hst = field === 'taxHst' ? p(value) : p(prev.taxHst)
        const qst = field === 'taxQst' ? p(value) : p(prev.taxQst)
        const newTaxTotal = Math.round((gst + pst + hst + qst) * 100) / 100
        next.taxTotal = String(newTaxTotal)
        if (!prev.manualTotal) {
          next.total = String(Math.round((p(next.subtotal) + newTaxTotal) * 100) / 100)
        }
      } else if (field === 'taxTotal') {
        next.manualTaxTotal = true
        if (!prev.manualTotal) {
          next.total = String(Math.round((p(prev.subtotal) + p(value)) * 100) / 100)
        }
      } else if (field === 'total') {
        next.manualTotal = true
      }

      return next
    })
  }

  // --- Edit line item changes with cascade ---
  const updateEditLineItem = (index: number, field: keyof EditLineItem, value: string | number) => {
    setEditLineItems((prev) => {
      const next = [...prev]
      const item = { ...next[index] }

      if (field === 'name') {
        item.name = value as string
      } else if (field === 'quantity') {
        item.quantity = Math.round(Number(value)) || 0
        if (!item.manualTotal) {
          item.totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100
        }
      } else if (field === 'unitPrice') {
        item.unitPrice = Number(value) || 0
        if (!item.manualTotal) {
          item.totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100
        }
      } else if (field === 'totalPrice') {
        item.totalPrice = Number(value) || 0
        item.manualTotal = true
      }

      next[index] = item

      // Cascade line items → subtotal → total
      if (field !== 'name') {
        const newSubtotal = next.reduce((sum, li) => sum + li.totalPrice, 0)
        const roundedSubtotal = Math.round(newSubtotal * 100) / 100
        setEditForm((prevForm) => {
          const f = { ...prevForm, manualSubtotal: false }
          f.subtotal = String(roundedSubtotal)
          if (!prevForm.manualTotal) {
            f.total = String(Math.round((roundedSubtotal + p(prevForm.taxTotal)) * 100) / 100)
          }
          return f
        })
      }

      return next
    })
  }

  const addEditLineItem = () => {
    setEditLineItems((prev) => [...prev, {
      name: '', quantity: 1, unitPrice: 0, totalPrice: 0, manualTotal: false,
    }])
  }

  const removeEditLineItem = (index: number) => {
    const item = editLineItems[index]
    if (item.id) setDeletedLineItemIds((prev) => [...prev, item.id!])

    setEditLineItems((prev) => {
      const next = prev.filter((_, i) => i !== index)
      // Recalc subtotal
      const newSubtotal = next.reduce((sum, li) => sum + li.totalPrice, 0)
      const roundedSubtotal = Math.round(newSubtotal * 100) / 100
      setEditForm((prevForm) => {
        const f = { ...prevForm, manualSubtotal: false }
        f.subtotal = String(roundedSubtotal)
        if (!prevForm.manualTotal) {
          f.total = String(Math.round((roundedSubtotal + p(prevForm.taxTotal)) * 100) / 100)
        }
        return f
      })
      return next
    })
  }

  // --- Save edits ---
  const handleSave = async () => {
    if (!receipt) return
    setSaving(true)

    try {
      const promises: Promise<unknown>[] = []

      // 1. Header diff
      const headerPayload: UpdateReceiptPayload = {}
      if (editForm.vendorName !== (receipt.vendorName || '')) headerPayload.vendorName = editForm.vendorName
      if (editForm.description !== (receipt.description || '')) headerPayload.description = editForm.description
      if (editForm.expenseDate !== (receipt.expenseDate || '')) headerPayload.expenseDate = editForm.expenseDate
      if (editForm.paymentMethod !== (receipt.paymentMethod || 'credit_card')) headerPayload.paymentMethod = editForm.paymentMethod
      if (String(p(editForm.subtotal)) !== String(p(receipt.subtotal))) headerPayload.subtotal = p(editForm.subtotal)
      if (String(p(editForm.taxGst)) !== String(p(receipt.taxGst))) headerPayload.taxGst = editForm.taxGst ? p(editForm.taxGst) : null
      if (String(p(editForm.taxPst)) !== String(p(receipt.taxPst))) headerPayload.taxPst = editForm.taxPst ? p(editForm.taxPst) : null
      if (String(p(editForm.taxHst)) !== String(p(receipt.taxHst))) headerPayload.taxHst = editForm.taxHst ? p(editForm.taxHst) : null
      if (String(p(editForm.taxQst)) !== String(p(receipt.taxQst))) headerPayload.taxQst = editForm.taxQst ? p(editForm.taxQst) : null
      if (String(p(editForm.taxSales)) !== String(p(receipt.taxSales))) headerPayload.taxSales = editForm.taxSales ? p(editForm.taxSales) : null
      if (String(p(editForm.taxTotal)) !== String(p(receipt.taxTotal))) headerPayload.taxTotal = p(editForm.taxTotal)
      if (String(p(editForm.total)) !== String(p(receipt.total))) headerPayload.total = p(editForm.total)
      // Currency: '' (Auto) maps to null, which clears the override on the receipt.
      // Backend then falls back to the user's profile.home_currency at apply time.
      const editedCurrency = editForm.currency === '' ? null : editForm.currency as 'CAD' | 'USD'
      if ((receipt.currency || null) !== editedCurrency) {
        headerPayload.currency = editedCurrency
      }

      if (Object.keys(headerPayload).length > 0) {
        promises.push(updateReceipt(receipt.id, headerPayload))
      }

      // 2. Deleted line items
      for (const id of deletedLineItemIds) {
        promises.push(deleteReceiptLineItem(receipt.id, id))
      }

      // 3. New and modified line items
      const originalMap = new Map(lineItems.map((li) => [li.id, li]))
      for (const item of editLineItems) {
        if (!item.id) {
          // New
          promises.push(createReceiptLineItem(receipt.id, {
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          }))
        } else {
          // Check if modified
          const orig = originalMap.get(item.id)
          if (orig) {
            const changed: Record<string, string | number> = {}
            if (item.name !== orig.name) changed.name = item.name
            if (item.quantity !== Math.round(p(orig.quantity))) changed.quantity = item.quantity
            if (Math.abs(item.unitPrice - p(orig.unitPrice)) > 0.001) changed.unitPrice = item.unitPrice
            if (Math.abs(item.totalPrice - p(orig.totalPrice)) > 0.001) changed.totalPrice = item.totalPrice
            if (Object.keys(changed).length > 0) {
              promises.push(updateReceiptLineItem(receipt.id, item.id, changed))
            }
          }
        }
      }

      await Promise.all(promises)
      showNotification('Changes saved', 'success')
      await fetchReceipt()
      setTab('view')
    } catch (err) {
      console.error('Save error:', err)
      showNotification('Failed to save some changes', 'error')
    } finally {
      setSaving(false)
    }
  }


  // --- Archive ---
  const handleDelete = async () => {
    if (!receipt) return
    const msg = receipt.status === 'applied'
      ? 'This receipt has been applied. Deleting it will also remove the linked expense and any associated supply list. Continue?'
      : 'Are you sure you want to delete this receipt?'
    if (!window.confirm(msg)) return
    try {
      const res = await deleteReceipt(receipt.id)
      if (res.status === 'success') {
        showNotification('Receipt deleted', 'success')
        if (onDeleted) onDeleted()
        else onUpdated()
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete', 'error')
      }
    } catch {
      showNotification('Failed to delete receipt', 'error')
    }
  }

  const handleArchive = async () => {
    if (!receipt) return
    try {
      const fn = receipt.status === 'archived' ? unarchiveReceipt : archiveReceipt
      const res = await fn(receipt.id)
      if (res.status === 'success') {
        showNotification(receipt.status === 'archived' ? 'Receipt unarchived' : 'Receipt archived', 'success')
        onUpdated()
        onClose()
      } else {
        showNotification(res.message || 'Failed', 'error')
      }
    } catch {
      showNotification('Failed to update receipt', 'error')
    }
  }

  // --- Quick property reassignment from the View tab ---
  // The backend (updateReceipt controller) also syncs the linked expense's
  // property_id when the receipt has been applied, so this works for any
  // non-archived status.
  const handleSavePropertyFromView = async (newPropertyId: string) => {
    if (!receipt) return
    try {
      const res = await updateReceipt(receipt.id, { propertyId: newPropertyId })
      if (res.status === 'success') {
        showNotification('Property updated', 'success')
        await fetchReceipt()
        onUpdated()
      } else {
        showNotification(res.message || 'Failed to update property', 'error')
      }
    } catch (err) {
      console.error('Update property error:', err)
      showNotification('Failed to update property', 'error')
    }
  }

  // --- Apply ---
  const buildApplyPayload = (): ApplyReceiptPayload => ({
    propertyId: applyPropertyId,
    expenseDate: receipt?.expenseDate || new Date().toISOString().split('T')[0],
    vendorName: receipt?.vendorName || 'Unknown',
    category: applyCategory || 'SUPPLIES',
    paymentMethod: receipt?.paymentMethod || 'credit_card',
    paidByType: applyPaidByType,
    paidById: applyPaidById || null,
    subtotal: p(receipt?.subtotal),
    taxGst: receipt?.taxGst ? p(receipt.taxGst) : null,
    taxPst: receipt?.taxPst ? p(receipt.taxPst) : null,
    taxHst: receipt?.taxHst ? p(receipt.taxHst) : null,
    taxQst: receipt?.taxQst ? p(receipt.taxQst) : null,
    taxTotal: p(receipt?.taxTotal),
    supplyList: {
      mode: applySupplyMode,
      ...(applySupplyMode === 'new' && applyProjectId ? { projectId: applyProjectId } : {}),
      ...(applySupplyMode === 'existing' && applySupplyListId ? { supplyListId: applySupplyListId } : {}),
    },
  })

  const handleApplySubmit = async () => {
    if (!receipt || !applyPropertyId) return
    // For "existing" mode, open match review modal instead
    if (applySupplyMode === 'existing' && applySupplyListId) {
      setShowMatchReview(true)
      return
    }
    setApplySubmitting(true)
    try {
      const payload = buildApplyPayload()
      const res = await applyReceipt(receipt.id, payload)
      if (res.status === 'success') {
        showNotification('Receipt applied! Expense created.', 'success')
        onUpdated()
        onClose()
      } else {
        showNotification(res.message || 'Failed to apply receipt', 'error')
      }
    } catch (err) {
      console.error('Apply error:', err)
      showNotification('Failed to apply receipt', 'error')
    } finally {
      setApplySubmitting(false)
    }
  }

  const handleMatchConfirm = async (mapping: ConfirmedMapping[], deletedIds: string[]) => {
    if (!receipt) return
    // Delete removed line items first
    await Promise.all(deletedIds.map((id) => deleteReceiptLineItem(receipt.id, id)))
    // Build payload with mapping
    const payload = buildApplyPayload()
    payload.supplyList.mapping = mapping
    const res = await applyReceipt(receipt.id, payload)
    if (res.status === 'success') {
      showNotification('Receipt applied! Expense created.', 'success')
      setShowMatchReview(false)
      onUpdated()
      onClose()
    } else {
      showNotification(res.message || 'Failed to apply receipt', 'error')
      throw new Error(res.message || 'Failed to apply')
    }
  }

  // --- Re-upload ---
  const handleReupload = async (file: File) => {
    if (!receipt) return
    try {
      const res = await uploadReceipt(file, receipt.propertyId || undefined)
      if (res.status === 'success') {
        showNotification('New receipt uploaded', 'success')
        setReceiptId(res.data.receipt.id)
        onUpdated()
      } else {
        showNotification(res.message || 'Upload failed', 'error')
      }
    } catch {
      showNotification('Upload failed', 'error')
    }
  }

  const isEditable = receipt?.status !== 'applied' && receipt?.status !== 'archived'
  const isImage = receipt?.mimeType?.startsWith('image/')
  const status = receipt ? statusConfig[receipt.status] : null
  const allCategories = categories

  if (!isOpen) return null

  // --- Image Panel (shared across all tabs) ---
  const renderImagePanel = () => (
    <div className="w-full md:w-2/5 bg-gray-50 border-r border-gray-100 flex flex-col min-h-0">
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        {receipt?.status === 'failed' ? (
          <div className="text-center p-6">
            <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">OCR Processing Failed</p>
            <p className="text-xs text-gray-500 mb-4">{receipt.errorMessage || 'Unable to extract data'}</p>
            <button
              onClick={() => reuploadRef.current?.click()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Re-upload Image
            </button>
            <input ref={reuploadRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReupload(f); e.target.value = '' }} />
          </div>
        ) : isImage && receipt?.signedUrl ? (
          <img src={receipt.signedUrl} alt={receipt.originalName} className="max-w-full max-h-full object-contain transition-transform" style={{ transform: `scale(${imageZoom})` }} />
        ) : receipt?.signedUrl ? (
          <iframe src={receipt.signedUrl} className="w-full h-full border-0" title="Receipt PDF" />
        ) : (
          <DocumentTextIcon className="w-16 h-16 text-gray-300" />
        )}
      </div>
      {receipt?.status !== 'failed' && receipt?.signedUrl && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-gray-100 bg-white">
          <button onClick={() => setImageZoom((z) => Math.max(0.5, z - 0.25))} className="p-1.5 rounded-lg hover:bg-gray-100">
            <MagnifyingGlassMinusIcon className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-xs text-gray-400 w-10 text-center">{Math.round(imageZoom * 100)}%</span>
          <button onClick={() => setImageZoom((z) => Math.min(3, z + 0.25))} className="p-1.5 rounded-lg hover:bg-gray-100">
            <MagnifyingGlassPlusIcon className="w-4 h-4 text-gray-500" />
          </button>
          <a href={receipt.signedUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 ml-2" title="Open in new tab">
            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-500" />
          </a>
        </div>
      )}
    </div>
  )

  // --- VIEW TAB ---
  const renderViewTab = () => (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        {status && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${status.bg} ${status.text}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        )}
        <span className="text-xs text-gray-400">{receipt?.originalName}</span>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div>
          <span className="text-xs font-medium text-gray-500">Vendor</span>
          <p className="text-sm text-gray-900 mt-0.5">{receipt?.vendorName || '—'}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Description</span>
          <p className="text-sm text-gray-900 mt-0.5">{receipt?.description || '—'}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs font-medium text-gray-500">Date</span>
            <p className="text-sm text-gray-900 mt-0.5">{receipt?.expenseDate || '—'}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Payment Method</span>
            <p className="text-sm text-gray-900 mt-0.5">{PAYMENT_METHODS.find((m) => m.value === receipt?.paymentMethod)?.label || receipt?.paymentMethod || '—'}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Property</span>
            <div className="mt-0.5">
              {!receipt ? (
                <p className="text-sm text-gray-900">—</p>
              ) : (
                <PropertyEditPill
                  receipt={receipt}
                  linkedExpense={receipt.expense}
                  properties={properties}
                  size="md"
                  onSave={readOnly || receipt.status === 'archived' ? undefined : handleSavePropertyFromView}
                />
              )}
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Uploaded By</span>
            <p className="text-sm text-gray-900 mt-0.5">{receipt?.uploaderName || '—'}</p>
          </div>
        </div>
      </div>

      {/* Reconciliation warning — set by the backend when
          |subtotal + fees + tax - total| > $0.05 (typical: Costco surcharge dropped). */}
      {receipt?.reconciliationWarning ? (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">{receipt.reconciliationWarning}</p>
        </div>
      ) : null}

      {/* Totals */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
        <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="text-gray-900 tabular-nums">{fmt(receipt?.subtotal)}</span></div>
        {Array.isArray(receipt?.extraCharges) && receipt.extraCharges.length > 0 ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fees & Surcharges</span>
              <span className="text-gray-900 tabular-nums">
                {fmt(receipt.extraCharges.reduce((s, c) => s + p(c.amount), 0))}
              </span>
            </div>
            {receipt.extraCharges.map((c, i) => (
              <div key={`${c.label}-${i}`} className="flex justify-between text-xs">
                <span className="text-gray-400 pl-2">{c.label}</span>
                <span className="text-gray-600 tabular-nums">{fmt(c.amount)}</span>
              </div>
            ))}
          </>
        ) : null}
        {(receipt?.taxGst || receipt?.taxPst || receipt?.taxHst || receipt?.taxQst || receipt?.taxSales) && (
          <>
            {receipt?.taxGst ? <div className="flex justify-between text-xs"><span className="text-gray-400 pl-2">GST</span><span className="text-gray-600 tabular-nums">{fmt(receipt.taxGst)}</span></div> : null}
            {receipt?.taxPst ? <div className="flex justify-between text-xs"><span className="text-gray-400 pl-2">PST</span><span className="text-gray-600 tabular-nums">{fmt(receipt.taxPst)}</span></div> : null}
            {receipt?.taxHst ? <div className="flex justify-between text-xs"><span className="text-gray-400 pl-2">HST</span><span className="text-gray-600 tabular-nums">{fmt(receipt.taxHst)}</span></div> : null}
            {receipt?.taxQst ? <div className="flex justify-between text-xs"><span className="text-gray-400 pl-2">QST</span><span className="text-gray-600 tabular-nums">{fmt(receipt.taxQst)}</span></div> : null}
            {receipt?.taxSales ? <div className="flex justify-between text-xs"><span className="text-gray-400 pl-2">Sales Tax</span><span className="text-gray-600 tabular-nums">{fmt(receipt.taxSales)}</span></div> : null}
          </>
        )}
        <div className="flex justify-between text-sm"><span className="text-gray-500">Tax Total</span><span className="text-gray-900 tabular-nums">{fmt(receipt?.taxTotal)}</span></div>
        <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-1.5">
          <span className="text-gray-900 inline-flex items-center gap-2">
            Total
            {receipt?.currency ? (
              <span className="text-[10px] font-medium tracking-wide text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                {receipt.currency}
              </span>
            ) : null}
          </span>
          <span className="text-gray-900 tabular-nums">{fmt(receipt?.total)}</span>
        </div>
      </div>

      {/* Line Items */}
      {lineItems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Line Items ({lineItems.length})</h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-12">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Unit $</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-900">{item.name}</td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{Math.round(p(item.quantity))}</td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">${p(item.unitPrice).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">${p(item.totalPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {!readOnly && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {isEditable && (
            <button onClick={() => handleTabSwitch('edit')} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              <PencilIcon className="w-4 h-4" /> Edit
            </button>
          )}
          {receipt?.status === 'matched' && (
            <button onClick={() => handleTabSwitch('apply')} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
              <CheckCircleIcon className="w-4 h-4" /> Apply as Expense
            </button>
          )}
          <button onClick={handleArchive} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            {receipt?.status === 'archived' ? 'Unarchive' : 'Archive'}
          </button>
          <button onClick={handleDelete} className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )

  // --- EDIT TAB ---
  const renderEditTab = () => (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Edit Receipt</h3>
        <button onClick={() => setTab('view')} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      {/* Header fields */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
        <input type="text" value={editForm.vendorName} onChange={(e) => updateEditField('vendorName', e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
        <input type="text" value={editForm.description} onChange={(e) => updateEditField('description', e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input type="date" value={editForm.expenseDate} onChange={(e) => updateEditField('expenseDate', e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
          <select value={editForm.paymentMethod} onChange={(e) => updateEditField('paymentMethod', e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            {PAYMENT_METHODS.map((pm) => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
          </select>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">Subtotal</label>
          <input type="number" step="0.01" value={editForm.subtotal} onChange={(e) => updateEditField('subtotal', e.target.value)}
            className="w-28 px-2 py-1 text-sm text-right bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <button onClick={() => setShowTaxes(!showTaxes)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          {showTaxes ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />} Tax Breakdown
        </button>
        {showTaxes && (
          <div className="space-y-2 pl-2 border-l-2 border-gray-200">
            {[
              { label: 'GST', key: 'taxGst' as const },
              { label: 'PST', key: 'taxPst' as const },
              { label: 'HST', key: 'taxHst' as const },
              { label: 'QST', key: 'taxQst' as const },
              { label: 'Sales Tax', key: 'taxSales' as const },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-xs text-gray-400">{label}</label>
                <input type="number" step="0.01" value={editForm[key]} onChange={(e) => updateEditField(key, e.target.value)}
                  className="w-28 px-2 py-1 text-sm text-right bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">Tax Total</label>
          <input type="number" step="0.01" value={editForm.taxTotal} onChange={(e) => updateEditField('taxTotal', e.target.value)}
            className="w-28 px-2 py-1 text-sm text-right bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
          <label className="text-sm font-semibold text-gray-900">Total</label>
          <input type="number" step="0.01" value={editForm.total} onChange={(e) => updateEditField('total', e.target.value)}
            className="w-28 px-2 py-1 text-sm font-bold text-right bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        {/* Currency override (mig 036). Blank = "use my profile default at apply time".
            When set to a non-home currency, applying the receipt will run FX conversion. */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">Currency</label>
          <select value={editForm.currency} onChange={(e) => updateEditField('currency', e.target.value)}
            className="w-28 px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Line Item Cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900">Line Items</h4>
          <button onClick={addEditLineItem} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
            <PlusIcon className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
        <div className="space-y-3">
          {editLineItems.map((item, idx) => (
            <div key={item.id || `new-${idx}`} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <input type="text" value={item.name} onChange={(e) => updateEditLineItem(idx, 'name', e.target.value)} placeholder="Item name"
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <button onClick={() => removeEditLineItem(idx)} className="ml-2 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Qty</label>
                  <input type="number" step="1" min="1" value={item.quantity} onChange={(e) => updateEditLineItem(idx, 'quantity', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Unit Price</label>
                  <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateEditLineItem(idx, 'unitPrice', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Total</label>
                  <input type="number" step="0.01" value={item.totalPrice} onChange={(e) => updateEditLineItem(idx, 'totalPrice', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums" />
                </div>
              </div>
            </div>
          ))}
          {editLineItems.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No line items</p>
          )}
        </div>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button onClick={() => setTab('view')} disabled={saving}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )

  // --- APPLY TAB ---
  const renderApplyTab = () => (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => setTab('view')} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeftIcon className="w-4 h-4 text-gray-500" />
        </button>
        <h3 className="text-base font-semibold text-gray-900">Apply as Expense</h3>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
        <p className="text-xs text-blue-600 font-medium mb-1">Receipt Summary</p>
        <p className="text-sm text-gray-900">{receipt?.vendorName || 'Unknown vendor'} &mdash; {fmt(receipt?.total)}</p>
        <p className="text-xs text-gray-500">{receipt?.expenseDate} &bull; {lineItems.length} line items</p>
      </div>

      {/* Property (required) */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Property *</label>
        <select value={applyPropertyId} onChange={(e) => setApplyPropertyId(e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Select a property...</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.address || p.id}</option>)}
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
        <select value={applyCategory} onChange={(e) => setApplyCategory(e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Select category...</option>
          {allCategories.map((cat) => <option key={cat.code} value={cat.code}>{cat.label}</option>)}
        </select>
      </div>

      {/* Paid By */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Paid By</label>
        <SearchableSelect
          options={peopleOptions}
          value={applyPaidById}
          onChange={(val) => {
            setApplyPaidById(val)
            if (val && peopleTypeMap[val]) {
              setApplyPaidByType(peopleTypeMap[val])
            }
          }}
          placeholder="Select who paid..."
          loading={peopleOptions.length === 0}
          loadingText="Loading people..."
          emptyText="No people found"
        />
      </div>

      {/* Supply List Mode */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Supply List</label>
        <div className="space-y-2">
          {([
            { value: 'none' as const, label: 'No supply list', desc: 'Only create an expense' },
            { value: 'new' as const, label: 'Create new supply list', desc: 'From receipt line items' },
            { value: 'existing' as const, label: 'Update existing supply list', desc: 'Match items by name' },
          ]).map((opt) => (
            <label key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${applySupplyMode === opt.value ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="supplyMode" value={opt.value} checked={applySupplyMode === opt.value} onChange={() => { setApplySupplyMode(opt.value); setApplyProjectId(''); setApplySupplyListId('') }} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Project picker for "new" mode */}
        {applySupplyMode === 'new' && applyPropertyId && (() => {
          const filtered = availableProjects.filter(p => p.propertyId === applyPropertyId)
          if (filtered.length === 0) return null
          return (
            <div className="mt-2 ml-7">
              <label className="block text-xs text-gray-500 mb-1">Link to cleaning project</label>
              <select
                value={applyProjectId}
                onChange={(e) => setApplyProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">No project (standalone)</option>
                {filtered.map(p => {
                  const d = new Date(p.projectDate.split('T')[0] + 'T12:00:00')
                  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  return (
                    <option key={p.id} value={p.id}>
                      {label} — {p.status.replace('_', ' ')}
                    </option>
                  )
                })}
              </select>
            </div>
          )
        })()}

        {/* Supply list picker for "existing" mode */}
        {applySupplyMode === 'existing' && applyPropertyId && (
          <div className="mt-2 ml-7">
            <label className="block text-xs text-gray-500 mb-1">Select supply list</label>
            <select
              value={applySupplyListId}
              onChange={(e) => setApplySupplyListId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select a supply list...</option>
              {availableSupplyLists
                .filter(sl => sl.propertyId === applyPropertyId)
                .map(sl => {
                  const d = new Date(sl.createdAt)
                  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  return (
                    <option key={sl.id} value={sl.id}>
                      {label} — {sl.items.length} items — {sl.status}
                    </option>
                  )
                })}
            </select>
          </div>
        )}
      </div>

      {/* Apply actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={() => setTab('view')} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
          Back
        </button>
        <button onClick={handleApplySubmit} disabled={!applyPropertyId || (applySupplyMode === 'existing' && !applySupplyListId) || applySubmitting}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {applySubmitting ? 'Applying...' : applySupplyMode === 'existing' && applySupplyListId ? 'Review Matches' : 'Confirm & Apply'}
        </button>
      </div>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-5xl w-11/12 max-h-[85vh] overflow-hidden" zIndex={zIndex}>
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : !receipt ? (
        <div className="flex items-center justify-center h-96 text-gray-500">Receipt not found</div>
      ) : (
        <div className="relative h-[80vh] flex flex-col md:flex-row">
          {renderImagePanel()}
          <div className="w-full md:w-3/5 flex flex-col min-h-0">
            {/* Tab Bar */}
            <TabBar
              tabs={[
                { key: 'view', label: 'View' },
                { key: 'edit', label: 'Edit' },
                ...(receipt?.status === 'matched' || receipt?.status === 'pending' ? [{ key: 'apply', label: 'Apply' }] : []),
                {
                  key: 'related',
                  label: 'Related',
                  badge: (receipt?.supplyList ? 1 : 0) + (receipt?.expense ? 1 : 0) || undefined,
                  badgeColor: 'bg-purple-500',
                },
              ]}
              activeTab={tab}
              onTabChange={(key) => handleTabSwitch(key as Tab)}
            />
            <div className="flex-1 overflow-y-auto min-h-0">
              {tab === 'view' && renderViewTab()}
              {tab === 'edit' && renderEditTab()}
              {tab === 'apply' && renderApplyTab()}
              {tab === 'related' && (
                <div className="p-5 space-y-4">
                  <h3 className="text-base font-semibold text-gray-900">Related Entities</h3>

                  {/* Property */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Property</p>
                    {receipt ? (
                      <PropertyChip receipt={receipt} linkedExpense={receipt.expense} properties={properties} size="md" />
                    ) : (
                      <p className="text-sm text-gray-400">—</p>
                    )}
                  </div>

                  {/* Linked Expense */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Expense</p>
                    {receipt?.expense ? (
                      <RelatedEntityCard
                        entityType="expense"
                        title={receipt.expense.category || 'Expense'}
                        subtitle={receipt.expense.expenseDate ? new Date(receipt.expense.expenseDate + 'T00:00:00').toLocaleDateString() : undefined}
                        amount={receipt.expense.amount}
                        status={receipt.expense.paymentStatus}
                        onClick={() => setStackedExpenseId(receipt.expense!.id)}
                      />
                    ) : (
                      <RelatedEntityCard
                        entityType="expense"
                        title=""
                        emptyText="No linked expense"
                        onClick={() => {}}
                      />
                    )}
                  </div>

                  {/* Linked Supply List */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Supply List</p>
                    {receipt?.supplyList ? (
                      <RelatedEntityCard
                        entityType="supply-list"
                        title={`Supply List (${receipt.supplyList.itemCount} items)`}
                        status={receipt.supplyList.status}
                        onClick={() => setStackedSupplyListId(receipt.supplyList!.id)}
                      />
                    ) : (
                      <RelatedEntityCard
                        entityType="supply-list"
                        title=""
                        emptyText="No linked supply list"
                        onClick={() => {}}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stacked modals for related entities — bump z-index above this modal. */}
      {stackedExpenseId && (
        <ExpenseViewerModal
          isOpen={!!stackedExpenseId}
          onClose={() => setStackedExpenseId(null)}
          expenseId={stackedExpenseId}
          onExpenseUpdated={() => fetchReceipt()}
          hideSupplyListLink
          zIndex={(zIndex ?? 60) + 10}
        />
      )}
      {stackedSupplyListId && (
        <ViewSupplyListsModal
          isOpen={!!stackedSupplyListId}
          onClose={() => setStackedSupplyListId(null)}
          initialSupplyList={{ id: stackedSupplyListId } as SupplyList}
          onSupplyListsChanged={() => fetchReceipt()}
          zIndex={(zIndex ?? 60) + 10}
        />
      )}
      {showMatchReview && receipt && applySupplyListId && (
        <ReceiptMatchReviewModal
          isOpen={showMatchReview}
          onClose={() => setShowMatchReview(false)}
          receiptId={receipt.id}
          supplyListId={applySupplyListId}
          receiptLineItems={lineItems}
          supplyListItems={availableSupplyLists.find((sl) => sl.id === applySupplyListId)?.items ?? []}
          onApply={handleMatchConfirm}
        />
      )}
    </Modal>
  )
}

export default ReceiptDetailModal
