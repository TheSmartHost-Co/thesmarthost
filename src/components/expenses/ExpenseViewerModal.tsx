'use client'

import { useTranslation } from 'react-i18next'
import React, { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import { parseLocalDate } from '@/utils/dateUtils'
import {
  getExpenseById,
  updateExpense,
  deleteExpense,
  uploadReceipt,
  deleteReceipt,
  getReceiptPreviewUrl,
  downloadReceipt,
  formatCurrency,
  formatExpenseDate,
  getExpenseLineItems,
  createExpenseLineItem,
  updateExpenseLineItem,
  deleteExpenseLineItem,
} from '@/services/expenseService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import { getProperties } from '@/services/propertyService'
import { getBookings } from '@/services/bookingService'
import { getSupplyListById } from '@/services/supplyListService'
import type { SupplyList } from '@/services/types/supplyList'
import { getReceiptLineItems } from '@/services/receiptService'
import type { ReceiptLineItem } from '@/services/types/receipt'
import type {
  Expense,
  ExpenseLineItem,
  UpdateExpensePayload,
  CreateExpenseLineItemPayload,
  UpdateExpenseLineItemPayload,
  PaymentMethod,
  PaymentStatus
} from '@/services/types/expense'
import type { PaidByType } from '@/services/types/receipt'
import { getCleaners } from '@/services/cleanerService'
import { getTeamMembers } from '@/services/teamMemberService'
import { getUserProfile } from '@/services/profileService'
import SearchableSelect from '@/components/shared/SearchableSelect'
import type { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import type { ExpenseCategory } from '@/services/types/expenseCategories'
import { getCategoryByCode } from '@/services/types/expenseCategories'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
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
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  LinkIcon,
  UserIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import SendToQbModal from '@/components/quickbooks/SendToQbModal'
import { getConnection as getQbConnection } from '@/services/quickbooksService'
import type { QbConnection, QbEntityType } from '@/services/types/quickbooks'
import ViewSupplyListsModal from '@/components/turnover/supply-lists/ViewSupplyListsModal'
import ReceiptDetailModal from '@/components/receipt/detail/ReceiptDetailModal'
import TabBar from '@/components/shared/TabBar'
import RelatedEntityCard from '@/components/shared/RelatedEntityCard'
import LineItemSubForm from '@/components/shared/LineItemSubForm'

interface ExpenseViewerModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  onExpenseUpdated?: () => void
  onExpenseDeleted?: (expenseId: string) => void
  hideSupplyListLink?: boolean
  zIndex?: number
}

type ModalMode = 'view' | 'edit' | 'receipt' | 'line-items' | 'related'

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
  hideSupplyListLink = false,
  zIndex,
}) => {
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ModalMode>('view')
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [loadingReceipt, setLoadingReceipt] = useState(false)
  const [qbConnection, setQbConnection] = useState<QbConnection | null>(null)
  const [showSendToQbModal, setShowSendToQbModal] = useState(false)

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
  // QuickBooks per-expense type override; '' = inherit connection default.
  const [editQbEntityType, setEditQbEntityType] = useState<'' | 'purchase' | 'bill'>('')
  const [submitting, setSubmitting] = useState(false)

  // Tax breakdown state
  const [subtotal, setSubtotal] = useState('')
  const [taxGst, setTaxGst] = useState('')
  const [taxPst, setTaxPst] = useState('')
  const [taxHst, setTaxHst] = useState('')
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false)

  // Paid-by state
  const [editPaidById, setEditPaidById] = useState<string | null>(null)
  const [editPaidByType, setEditPaidByType] = useState<PaidByType>('PROPERTY-MANAGER')
  const [peopleOptions, setPeopleOptions] = useState<SearchableSelectOption<string>[]>([])
  const [peopleTypeMap, setPeopleTypeMap] = useState<Record<string, PaidByType>>({})

  // Receipt upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  // Supply list origin state
  const [supplyLineItems, setSupplyLineItems] = useState<ReceiptLineItem[]>([])
  const [supplyLineItemsLoading, setSupplyLineItemsLoading] = useState(false)
  const [lineItemsExpanded, setLineItemsExpanded] = useState(true)
  const [showSupplyListModal, setShowSupplyListModal] = useState(false)
  const [supplyListProjectId, setSupplyListProjectId] = useState('')
  const [supplyListProjectName, setSupplyListProjectName] = useState('')

  // Expense line items state
  const [expenseLineItems, setExpenseLineItems] = useState<ExpenseLineItem[]>([])
  const [lineItemsLoading, setLineItemsLoading] = useState(false)
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null)
  const [addingLineItem, setAddingLineItem] = useState(false)
  const [lineItemSaving, setLineItemSaving] = useState(false)

  // Stacked modal state for related entities
  const [stackedReceiptId, setStackedReceiptId] = useState<string | null>(null)
  const [stackedSupplyListId, setStackedSupplyListId] = useState<string | null>(null)

  // Reference data
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const { canWrite, effectiveUserId } = usePermissions()
  const hasWrite = canWrite('expenses')

  useEffect(() => {
    if (isOpen && expenseId && effectiveUserId) {
      setMode('view')
      setReceiptUrl(null)
      fetchExpense()
      loadReferenceData()
    }
  }, [isOpen, expenseId, effectiveUserId])

  // Pull QB connection state once when the modal opens; drives visibility of
  // the "Send to QuickBooks" header button.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    getQbConnection()
      .then((res) => {
        if (cancelled) return
        if (res.status === 'success') setQbConnection(res.data)
      })
      .catch(() => { /* hide the button on failure */ })
    return () => { cancelled = true }
  }, [isOpen])

  // Load bookings when property changes in edit mode
  useEffect(() => {
    if (mode === 'edit' && propertyId && effectiveUserId) {
      loadBookingsForProperty(propertyId)
    }
  }, [propertyId, mode, effectiveUserId])

  const fetchExpense = async () => {
    if (!effectiveUserId || !expenseId) return

    setLoading(true)
    try {
      const response = await getExpenseById(expenseId, effectiveUserId)
      if (response.status === 'success') {
        setExpense(response.data)
        initializeEditForm(response.data)
        // Use nested lineItems from API if available
        setExpenseLineItems(response.data.lineItems || [])
        // Fetch receipt line items if this expense came from a receipt
        if (response.data.receiptId) {
          setSupplyLineItemsLoading(true)
          try {
            const liRes = await getReceiptLineItems(response.data.receiptId)
            if (liRes.status === 'success') setSupplyLineItems(liRes.data || [])
          } catch {
            // Non-critical, silently fail
          } finally {
            setSupplyLineItemsLoading(false)
          }
        } else {
          setSupplyLineItems([])
        }
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
    if (!effectiveUserId || !profile?.id) return

    try {
      const [propertiesRes, categoriesRes, tmRes, clRes] = await Promise.all([
        getProperties(effectiveUserId),
        getCategoriesByUserId(effectiveUserId),
        getTeamMembers(effectiveUserId).catch(() => null),
        getCleaners(effectiveUserId).catch(() => null),
      ])

      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data || [])
      }

      if (categoriesRes.status === 'success') {
        setCategories(categoriesRes.data || [])
      }

      // Build people picker options
      const roleLabel = (r: string) => r === 'CLEANER' ? 'Cleaner' : r === 'TEAM_MEMBER' ? 'Team Member' : 'PM'
      const roleType = (r: string): PaidByType => r === 'CLEANER' ? 'CLEANER' : r === 'TEAM_MEMBER' ? 'TEAM_MEMBER' : 'PROPERTY-MANAGER'
      const opts: SearchableSelectOption<string>[] = []
      const typeMap: Record<string, PaidByType> = {}
      opts.push({ value: profile.id, label: `${profile.fullName} (You)`, secondaryLabel: roleLabel(profile.role) })
      typeMap[profile.id] = roleType(profile.role)
      // Add PM if current user is not the PM
      const pmUserId = effectiveUserId !== profile.id ? effectiveUserId : null
      if (pmUserId) {
        try {
          const pmRes = await getUserProfile(pmUserId)
          if (pmRes.status === 'success' && pmRes.data) {
            opts.push({ value: pmRes.data.id, label: pmRes.data.fullName, secondaryLabel: 'PM' })
            typeMap[pmRes.data.id] = 'PROPERTY-MANAGER'
          }
        } catch { /* non-critical */ }
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
      setPeopleOptions(opts)
      setPeopleTypeMap(typeMap)
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  const loadBookingsForProperty = async (propId: string) => {
    if (!effectiveUserId) return

    try {
      const res = await getBookings({ userId: effectiveUserId, propertyId: propId })
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
    setCategory(exp.category || '')
    setVendorName(exp.vendorName || '')
    setDescription(exp.description || '')
    setIsReimbursable(exp.isReimbursable)
    setIsTaxDeductible(exp.isTaxDeductible)
    setPaymentMethod(exp.paymentMethod || 'credit_card')
    setPaymentStatus(exp.paymentStatus)
    setEditQbEntityType(exp.qbEntityType || '')
    setEditPaidById(exp.paidById || profile?.id || null)
    setEditPaidByType(exp.paidByType || 'PROPERTY-MANAGER')

    // Tax breakdown fields
    setSubtotal(exp.subtotal?.toString() || '')
    setTaxGst(exp.taxGst?.toString() || '')
    setTaxPst(exp.taxPst?.toString() || '')
    setTaxHst(exp.taxHst?.toString() || '')
    // Show tax breakdown if any tax field has a value
    setShowTaxBreakdown(!!(exp.subtotal || exp.taxGst || exp.taxPst || exp.taxHst || exp.taxTotal))

    // Load bookings for property if exists
    if (exp.propertyId && effectiveUserId) {
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
    if (!effectiveUserId || !expenseId) return

    setLoadingReceipt(true)
    try {
      const url = await getReceiptPreviewUrl(expenseId, effectiveUserId)
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

    if (!effectiveUserId || !expense) return

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
        userId: effectiveUserId,
        propertyId: propertyId || null,
        bookingId: bookingId || null,
        expenseDate,
        amount: parsedAmount,
        currency,
        category: category || undefined,
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
        paidByType: editPaidByType,
        paidById: editPaidById,
        // null clears the override; '' is mapped to null so the connection default applies.
        qbEntityType: editQbEntityType === '' ? null : editQbEntityType,
      }

      const response = await updateExpense(expense.id, payload)
      if (response.status === 'success') {
        showNotification('Expense updated successfully', 'success')
        // Backend RETURNING * doesn't run the JOIN, so paidByName is null on update.
        // Patch it locally from the picker label so the displayed name doesn't disappear.
        const localName = peopleOptions.find(o => o.value === editPaidById)?.label?.replace(/\s*\(You\)\s*$/, '') ?? null
        setExpense({ ...response.data, paidByName: response.data.paidByName ?? localName })
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
    if (!effectiveUserId || !expense) return

    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return
    }

    try {
      const response = await deleteExpense(expense.id, effectiveUserId)
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
    if (!effectiveUserId || !expense) return

    try {
      await downloadReceipt(expense.id, effectiveUserId)
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
    if (!effectiveUserId || !expense || !selectedFile) return

    setUploadingReceipt(true)
    try {
      const response = await uploadReceipt(expense.id, effectiveUserId, selectedFile)
      if (response.status === 'success' && response.data) {
        showNotification('Receipt uploaded successfully', 'success')
        setExpense(response.data)
        setSelectedFile(null)
        // Reload preview
        const url = await getReceiptPreviewUrl(expense.id, effectiveUserId)
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
    if (!effectiveUserId || !expense) return

    if (!confirm('Remove the receipt from this expense?')) return

    try {
      const response = await deleteReceipt(expense.id, effectiveUserId)
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

  // --- Expense Line Item Handlers ---
  const handleCreateLineItem = async (data: CreateExpenseLineItemPayload) => {
    if (!expense || !effectiveUserId) return
    setLineItemSaving(true)
    try {
      const res = await createExpenseLineItem(expense.id, { ...data, userId: effectiveUserId })
      if (res.status === 'success') {
        setExpenseLineItems(prev => [...prev, res.data])
        setAddingLineItem(false)
        // Re-fetch expense to get recalculated amount/subtotal
        fetchExpense()
      } else {
        showNotification(res.message || 'Failed to add line item', 'error')
      }
    } catch (err) {
      showNotification('Error adding line item', 'error')
    } finally {
      setLineItemSaving(false)
    }
  }

  const handleUpdateLineItem = async (lineItemId: string, data: UpdateExpenseLineItemPayload) => {
    if (!expense || !effectiveUserId) return
    setLineItemSaving(true)
    try {
      const res = await updateExpenseLineItem(expense.id, lineItemId, { ...data, userId: effectiveUserId })
      if (res.status === 'success') {
        setExpenseLineItems(prev => prev.map(li => li.id === lineItemId ? res.data : li))
        setEditingLineItemId(null)
        fetchExpense()
      } else {
        showNotification(res.message || 'Failed to update line item', 'error')
      }
    } catch (err) {
      showNotification('Error updating line item', 'error')
    } finally {
      setLineItemSaving(false)
    }
  }

  const handleDeleteLineItem = async (lineItemId: string) => {
    if (!expense || !effectiveUserId) return
    setLineItemSaving(true)
    try {
      const res = await deleteExpenseLineItem(expense.id, lineItemId, effectiveUserId)
      if (res.status === 'success') {
        setExpenseLineItems(prev => prev.filter(li => li.id !== lineItemId))
        setEditingLineItemId(null)
        fetchExpense()
      } else {
        showNotification(res.message || 'Failed to delete line item', 'error')
      }
    } catch (err) {
      showNotification('Error deleting line item', 'error')
    } finally {
      setLineItemSaving(false)
    }
  }

  const getCategoryLabel = (code: string | undefined) => {
    if (!code) return null
    const catInfo = getCategoryByCode(code, categories)
    return catInfo?.label || code
  }

  const getCategoryColor = (code: string | undefined) => {
    if (!code) return '#6B7280'
    const catInfo = getCategoryByCode(code, categories)
    return catInfo?.colorHex || '#6B7280'
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

  // --- LINE ITEMS TAB ---
  const renderLineItemsMode = () => {
    if (!expense) return null
    const lineItemsTotal = expenseLineItems.reduce((sum, li) => sum + (li.totalCost || 0), 0)

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Line Items ({expenseLineItems.length})
          </h3>
          {lineItemsTotal > 0 && (
            <span className="text-sm font-semibold text-gray-700 tabular-nums">
              {formatCurrency(lineItemsTotal)}
            </span>
          )}
        </div>

        {lineItemsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Line items table */}
            {expenseLineItems.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-12">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Unit</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenseLineItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`cursor-pointer hover:bg-gray-50 transition-colors ${editingLineItemId === item.id ? 'bg-blue-50/30' : ''}`}
                          onClick={() => {
                            if (hasWrite && editingLineItemId !== item.id) {
                              setEditingLineItemId(item.id)
                              setAddingLineItem(false)
                            }
                          }}
                        >
                          <td className="px-3 py-2 text-gray-900">
                            <span className="flex items-center gap-1.5">
                              {item.supplyListItemId && (
                                <LinkIcon className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" title="Linked to supply list item" />
                              )}
                              {item.description}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{item.unitCost != null ? `$${item.unitCost.toFixed(2)}` : '—'}</td>
                          <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{item.totalCost != null ? `$${item.totalCost.toFixed(2)}` : '—'}</td>
                        </tr>
                        {editingLineItemId === item.id && hasWrite && (
                          <tr>
                            <td colSpan={4} className="px-2 py-0">
                              <LineItemSubForm
                                lineItem={item}
                                onSave={(data) => handleUpdateLineItem(item.id, data as UpdateExpenseLineItemPayload)}
                                onCancel={() => setEditingLineItemId(null)}
                                onDelete={() => handleDeleteLineItem(item.id)}
                                saving={lineItemSaving}
                                userId={effectiveUserId || ''}
                                hasSupplyLink={!!item.supplyListItemId}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Totals footer */}
                <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-600">Subtotal (line items)</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(lineItemsTotal)}</span>
                </div>
                {(expense.taxTotal || 0) > 0 && (
                  <div className="bg-gray-50 border-t border-gray-100 px-3 py-1.5 flex justify-between items-center text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span className="text-gray-700 tabular-nums">+ {formatCurrency(expense.taxTotal || 0)}</span>
                  </div>
                )}
                <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex justify-between items-center text-sm">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(expense.amount)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-300 rounded-xl">
                <CurrencyDollarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No line items yet</p>
              </div>
            )}

            {/* Add line item form */}
            {addingLineItem && hasWrite ? (
              <LineItemSubForm
                onSave={(data) => handleCreateLineItem(data as CreateExpenseLineItemPayload)}
                onCancel={() => setAddingLineItem(false)}
                saving={lineItemSaving}
                userId={effectiveUserId || ''}
              />
            ) : hasWrite && (
              <button
                onClick={() => { setAddingLineItem(true); setEditingLineItemId(null) }}
                className="w-full py-2.5 text-sm font-medium text-blue-600 border border-dashed border-blue-300 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusIcon className="w-4 h-4" />
                Add Line Item
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  // --- RELATED TAB ---
  const renderRelatedMode = () => {
    if (!expense) return null

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Related Entities</h3>

        {/* Linked Receipt */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Receipt</p>
          {expense.receipt ? (
            <RelatedEntityCard
              entityType="receipt"
              title={expense.receipt.vendorName || expense.receipt.originalName}
              subtitle={expense.receipt.expenseDate ? new Date(expense.receipt.expenseDate + 'T00:00:00').toLocaleDateString() : undefined}
              amount={expense.receipt.total}
              status={expense.receipt.status}
              onClick={() => setStackedReceiptId(expense.receipt!.id)}
            />
          ) : expense.receiptPath ? (
            <RelatedEntityCard
              entityType="receipt"
              title={expense.receiptOriginalName || 'Receipt attached'}
              subtitle="Legacy receipt (no detail view)"
              onClick={() => handleModeSwitch('receipt')}
            />
          ) : (
            <RelatedEntityCard
              entityType="receipt"
              title=""
              emptyText="No linked receipt"
              onClick={() => {}}
              onAction={hasWrite ? () => handleModeSwitch('receipt') : undefined}
              actionLabel="Add Receipt"
            />
          )}
        </div>

        {/* Linked Supply List */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Supply List</p>
          {expense.supplyList ? (
            <RelatedEntityCard
              entityType="supply-list"
              title={`Supply List (${expense.supplyList.itemCount} items)`}
              status={expense.supplyList.status}
              onClick={() => setStackedSupplyListId(expense.supplyList!.id)}
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
    )
  }

  const renderViewMode = () => {
    if (!expense) return null

    return (
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              {expense.category ? (
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: getCategoryColor(expense.category) + '20',
                    color: getCategoryColor(expense.category)
                  }}
                >
                  {getCategoryLabel(expense.category)}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                  Needs Category
                </span>
              )}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadge(expense.paymentStatus)}`}>
                {PAYMENT_STATUSES.find(s => s.value === expense.paymentStatus)?.label}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">
              {formatCurrency(expense.amount, expense.currency)}
            </h3>
          </div>
          {hasWrite && (
            <div className="flex gap-2">
              {qbConnection?.connected
                && qbConnection.status !== 'expired'
                && expense.qbSyncStatus !== 'synced' && (
                <button
                  onClick={() => setShowSendToQbModal(true)}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  title="Send this expense to QuickBooks"
                >
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  Send to QB
                </button>
              )}
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
          )}
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

          {expense.paidByName && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <UserIcon className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">Paid By</div>
                <div className="text-sm font-medium text-gray-900">
                  {expense.paidByName}
                  {expense.paidByType && (
                    <span className="ml-1.5 text-xs text-gray-400 font-normal">
                      ({expense.paidByType === 'PROPERTY-MANAGER' ? 'PM' : expense.paidByType === 'TEAM_MEMBER' ? 'Team Member' : 'Cleaner'})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
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
        {!!(expense.subtotal || expense.taxGst || expense.taxPst || expense.taxHst || expense.taxTotal) && (
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

        {/* Supply List Origin */}
        {expense.receiptId && !hideSupplyListLink && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-5 h-5 text-teal-500" />
                <span className="text-sm font-medium text-gray-900">Supply List Origin</span>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await getSupplyListById(expense.supplyListId!)
                    if (res.status === 'success') {
                      setSupplyListProjectId(res.data.projectId || '')
                      setSupplyListProjectName(res.data.propertyName || 'Unknown Property')
                      setShowSupplyListModal(true)
                    } else {
                      showNotification('Could not load supply list', 'error')
                    }
                  } catch {
                    showNotification('Error loading supply list', 'error')
                  }
                }}
                className="cursor-pointer inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-800"
              >
                View Supply List
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {supplyLineItemsLoading ? (
              <div className="flex items-center justify-center py-3">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
              </div>
            ) : supplyLineItems.length > 0 && (
              <div>
                <button
                  onClick={() => setLineItemsExpanded(!lineItemsExpanded)}
                  className="cursor-pointer flex items-center justify-between w-full text-sm"
                >
                  <div className="flex items-center gap-1 text-gray-700 font-medium">
                    {lineItemsExpanded ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                    Line Items ({supplyLineItems.length})
                  </div>
                  <span className="text-sm font-medium text-teal-600">
                    {formatCurrency(supplyLineItems.reduce((sum, li) => sum + li.totalPrice, 0), expense.currency)}
                  </span>
                </button>

                {lineItemsExpanded && (
                  <div className="mt-2 space-y-1.5">
                    {supplyLineItems.map((li) => (
                      <div key={li.id} className="flex items-center justify-between text-sm py-1 px-2 bg-gray-50 rounded">
                        <span className="text-gray-900">{li.name}</span>
                        <span className="text-gray-600 text-xs">
                          {li.quantity} × {formatCurrency(li.unitPrice, expense.currency)} = {formatCurrency(li.totalPrice, expense.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
            {hasWrite && (
              <button
                onClick={() => handleModeSwitch('receipt')}
                className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Add Receipt
              </button>
            )}
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
                  {b.guestName} - {parseLocalDate(b.checkInDate).toLocaleDateString()}
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
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No category (incomplete)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.code}>{cat.label}</option>
              ))}
            </select>
            {!category && (
              <p className="mt-1 text-xs text-amber-600">Expenses without a category will be flagged as incomplete</p>
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

          <div>
            <label className="block text-sm font-medium mb-1">
              QuickBooks Type
              <span className="ml-1 text-xs font-normal text-gray-500">(optional)</span>
            </label>
            <select
              value={editQbEntityType}
              onChange={(e) => setEditQbEntityType(e.target.value as '' | 'purchase' | 'bill')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Use account default</option>
              <option value="purchase">Purchase (paid)</option>
              <option value="bill">Bill (unpaid)</option>
            </select>
          </div>
        </div>

        {/* Paid By */}
        <div>
          <label className="block text-sm font-medium mb-1">Paid By</label>
          <SearchableSelect
            options={peopleOptions}
            value={editPaidById}
            onChange={(val) => {
              setEditPaidById(val)
              if (val && peopleTypeMap[val]) {
                setEditPaidByType(peopleTypeMap[val])
              }
            }}
            placeholder="Select who paid..."
            loading={peopleOptions.length === 0}
            loadingText="Loading people..."
            emptyText="No people found"
          />
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
                {hasWrite && (
                  <button
                    onClick={handleDeleteReceipt}
                    className="cursor-pointer flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Replace Receipt */}
            {hasWrite && (
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
            )}
          </div>
        ) : hasWrite ? (
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
        ) : (
          <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
            <DocumentTextIcon className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No receipt attached</p>
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
    <>
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-3xl w-11/12 !overflow-y-hidden flex flex-col" zIndex={zIndex}>
      {/* Tab Navigation */}
      <div className="px-6 pt-6">
        <TabBar
          tabs={[
            { key: 'view', label: 'Details' },
            { key: 'edit', label: 'Edit' },
            { key: 'receipt', label: expense?.receiptPath ? 'Receipt *' : 'Receipt' },
            { key: 'line-items', label: 'Line Items', badge: expenseLineItems.length || undefined, badgeColor: 'bg-teal-500' },
            {
              key: 'related',
              label: 'Related',
              badge: ((expense?.receipt ? 1 : 0) + (expense?.supplyList ? 1 : 0)) || undefined,
              badgeColor: 'bg-purple-500',
            },
          ]}
          activeTab={mode}
          onTabChange={(key) => handleModeSwitch(key as ModalMode)}
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-6">
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
            {mode === 'line-items' && renderLineItemsMode()}
            {mode === 'related' && renderRelatedMode()}
          </>
        )}
      </div>

      {/* Modal Footer */}
      <div className="flex-shrink-0 flex justify-end px-6 py-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>

      {expense && (
        <SendToQbModal
          isOpen={showSendToQbModal}
          onClose={() => setShowSendToQbModal(false)}
          expenseId={expense.id}
          vendorName={expense.vendorName || null}
          hasReceipt={!!expense.receiptPath || !!expense.receiptId}
          connectionDefaultEntityType={(qbConnection?.defaultQbEntityType as QbEntityType) || 'purchase'}
          categoryCode={expense.category}
          expenseAmount={Number(expense.amount)}
          onSynced={() => {
            // Refresh the expense so the badge flips to 'synced'.
            fetchExpense()
          }}
        />
      )}
    </Modal>

    {/* Stacked modals for related entities */}
    {stackedReceiptId && (
      <ReceiptDetailModal
        isOpen={!!stackedReceiptId}
        onClose={() => setStackedReceiptId(null)}
        receiptId={stackedReceiptId}
        properties={properties}
        onUpdated={() => fetchExpense()}
        onDeleted={() => { setStackedReceiptId(null); fetchExpense() }}
      />
    )}
    {stackedSupplyListId && (
      <ViewSupplyListsModal
        isOpen={!!stackedSupplyListId}
        onClose={() => setStackedSupplyListId(null)}
        initialSupplyList={{ id: stackedSupplyListId } as SupplyList}
        onSupplyListsChanged={() => fetchExpense()}
      />
    )}
    {showSupplyListModal && supplyListProjectId && (
      <ViewSupplyListsModal
        isOpen={showSupplyListModal}
        onClose={() => setShowSupplyListModal(false)}
        projectId={supplyListProjectId}
        projectName={supplyListProjectName}
      />
    )}
    </>
  )
}

export default ExpenseViewerModal
