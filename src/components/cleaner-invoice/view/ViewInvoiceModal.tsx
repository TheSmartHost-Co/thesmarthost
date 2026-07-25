'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import {
  getInvoiceById,
  updateInvoice,
  updateInvoiceItem,
  deleteInvoiceItem,
  submitInvoice,
  deleteInvoice,
  approveInvoice,
  rejectInvoice,
  markInvoicePaid,
  changeInvoiceStatus,
  generateInvoicePDF,
  getInvoiceFiles,
  downloadInvoiceFile,
} from '@/services/cleanerInvoiceService'
import AddExtraChargeModal from '../create/AddExtraChargeModal'
import ConvertToExpenseModal from './ConvertToExpenseModal'
import AddReceiptToInvoiceModal from '../create/AddReceiptToInvoiceModal'
import AddExistingExpenseModal from '../create/AddExistingExpenseModal'
import ExpenseViewerModal from '@/components/expenses/ExpenseViewerModal'
import { deleteExpense } from '@/services/expenseService'
import { usePermissions } from '@/hooks/usePermissions'
import DeleteInvoiceModal from '../delete/DeleteInvoiceModal'
import type { InvoiceFile } from '@/services/types/cleanerInvoice'
import { INVOICE_STATUS_INFO } from '@/services/types/cleanerInvoice'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import type {
  CleanerInvoice,
  CleanerInvoiceItem,
  InvoiceStatus,
} from '@/services/types/cleanerInvoice'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  PaperAirplaneIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  EyeIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { TAX_RATES, calcTax } from '@/constants/taxRates'

/** Recompute subtotal, taxes, and total from items + tax flags */
function computeInvoiceTotals(items: CleanerInvoiceItem[], inv: CleanerInvoice) {
  const taxableSubtotal = items.filter(i => i.isTaxable).reduce((sum, i) => sum + i.amount, 0)
  const nonTaxableSubtotal = items.filter(i => !i.isTaxable).reduce((sum, i) => sum + i.amount, 0)
  const subtotal = taxableSubtotal + nonTaxableSubtotal
  const taxHst = inv.taxHstEnabled ? calcTax(taxableSubtotal, 'hst') : 0
  const taxGst = inv.taxGstEnabled ? calcTax(taxableSubtotal, 'gst') : 0
  const taxQst = inv.taxQstEnabled ? calcTax(taxableSubtotal, 'qst') : 0
  const total = subtotal + taxHst + taxGst + taxQst
  return { subtotal, taxHst, taxGst, taxQst, total }
}

interface ViewInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  onUpdated: () => void
  role?: 'cleaner' | 'pm'
}

const statusStyles: Record<InvoiceStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  paid: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

const ViewInvoiceModal: React.FC<ViewInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  onUpdated,
  role = 'cleaner',
}) => {
  const [invoice, setInvoice] = useState<CleanerInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ description: '', rateType: '' as string, rateAmount: '', durationMinutes: '', amount: '', notes: '', isTaxable: false, projectDate: '' })
  const [showAddExtraModal, setShowAddExtraModal] = useState(false)
  const [convertingItem, setConvertingItem] = useState<CleanerInvoiceItem | null>(null)
  const [showAddReceiptModal, setShowAddReceiptModal] = useState(false)
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [deletingExpenseItemId, setDeletingExpenseItemId] = useState<string | null>(null)
  const [viewingExpenseId, setViewingExpenseId] = useState<string | null>(null)
  const [cleanerNotes, setCleanerNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // PM action state
  const [pmActionLoading, setPmActionLoading] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [pmRejectNotes, setPmRejectNotes] = useState('')
  // Delete confirm state (PM)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // PDF state
  const [currentFile, setCurrentFile] = useState<InvoiceFile | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  // Invoice number editing
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState(false)
  const [invoiceNumberDraft, setInvoiceNumberDraft] = useState('')
  // Bill From editing
  const [editingBillFrom, setEditingBillFrom] = useState(false)
  const [billFromDraft, setBillFromDraft] = useState('')
  // Tax toggle saving
  const [savingTax, setSavingTax] = useState(false)
  // Optimistic: dirty flag + snapshot for rollback
  const [isDirty, setIsDirty] = useState(false)
  const [snapshotInvoice, setSnapshotInvoice] = useState<CleanerInvoice | null>(null)

  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)
  const { effectiveUserId } = usePermissions()

  const statusLabels: Record<InvoiceStatus, string> = {
    draft: t('statusDraft'),
    pending: t('statusPendingReview'),
    approved: t('statusApproved'),
    rejected: t('statusRejected'),
    paid: t('statusPaid'),
    archived: t('statusArchived'),
  }
  const statusConfig = Object.fromEntries(
    (Object.keys(statusStyles) as InvoiceStatus[]).map(k => [k, { label: statusLabels[k], ...statusStyles[k] }])
  ) as Record<InvoiceStatus, { label: string; bg: string; text: string; dot: string }>

  // Flex column layout caps the modal at 85vh and lets the middle section scroll
  // internally — header/PDF actions and footer actions stay pinned regardless of
  // how many line items the invoice has.
  const modalStyle = role === 'pm'
    ? 'p-0 max-w-5xl !w-11/12 !max-h-[85vh] !overflow-y-hidden flex flex-col'
    : 'p-0 max-w-3xl !w-11/12 !max-h-[85vh] !overflow-y-hidden flex flex-col'

  // Cleaner can edit draft/rejected. PM has full admin edit access at any status.
  const isEditable = role === 'pm'
    ? !!invoice
    : (invoice?.status === 'draft' || invoice?.status === 'rejected')

  // Fetch invoice data
  useEffect(() => {
    if (!isOpen || !invoiceId) return

    const fetchInvoice = async () => {
      setLoading(true)
      try {
        const res = await getInvoiceById(invoiceId)
        if (res.status === 'success') {
          setInvoice(res.data)
          setSnapshotInvoice(res.data)
          setCleanerNotes(res.data.cleanerNotes || '')
          setIsDirty(false)
        }
      } catch (err) {
        console.error('Error fetching invoice:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [isOpen, invoiceId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingItemId(null)
      setShowAddExtraModal(false)
      setShowAddReceiptModal(false)
    }
  }, [isOpen])

  /** Re-fetch invoice from server — used only for error recovery / rollback */
  const refreshInvoice = async () => {
    const res = await getInvoiceById(invoiceId)
    if (res.status === 'success') {
      setInvoice(res.data)
      setSnapshotInvoice(res.data)
      setCleanerNotes(res.data.cleanerNotes || '')
    }
    try {
      const filesRes = await getInvoiceFiles(invoiceId)
      if (filesRes.status === 'success') {
        setCurrentFile(filesRes.data.find(f => f.isCurrent) || null)
      }
    } catch {}
  }

  /** Helper: apply optimistic item changes + recompute totals */
  const updateInvoiceOptimistic = (updatedItems: CleanerInvoiceItem[], extraFields?: Partial<CleanerInvoice>) => {
    if (!invoice) return
    const totals = computeInvoiceTotals(updatedItems, { ...invoice, ...extraFields })
    setInvoice({ ...invoice, ...extraFields, items: updatedItems, ...totals })
    setIsDirty(true)
  }

  /** Wrap onClose to refetch parent data when dirty */
  const handleModalClose = () => {
    if (isDirty) {
      onUpdated()
    }
    onClose()
  }

  // Save invoice number edit
  const handleSaveInvoiceNumber = async () => {
    if (!invoice || !invoiceNumberDraft.trim()) return
    try {
      const res = await updateInvoice(invoice.id, { invoiceNumber: invoiceNumberDraft.trim() })
      if (res.status === 'success') {
        showNotification(t('invoiceNumberUpdated'), 'success')
        setEditingInvoiceNumber(false)
        setInvoice({ ...invoice, invoiceNumber: invoiceNumberDraft.trim() })
        setIsDirty(true)
      } else {
        showNotification(res.message || t('failedToUpdate'), 'error')
      }
    } catch { showNotification(t('errorUpdatingInvoiceNumber'), 'error') }
  }

  // Save bill-from name edit
  const handleSaveBillFrom = async () => {
    if (!invoice) return
    try {
      const res = await updateInvoice(invoice.id, { billFromName: billFromDraft.trim() || null })
      if (res.status === 'success') {
        showNotification(t('billFromUpdated'), 'success')
        setEditingBillFrom(false)
        setInvoice({ ...invoice, billFromName: billFromDraft.trim() || null })
        setIsDirty(true)
      } else {
        showNotification(res.message || t('failedToUpdate'), 'error')
      }
    } catch { showNotification(t('errorUpdatingBillFrom'), 'error') }
  }

  // Toggle a tax flag
  const handleTaxToggle = async (taxType: 'hst' | 'gst' | 'qst') => {
    if (!invoice) return
    // Optimistic toggle
    const flagKey = taxType === 'hst' ? 'taxHstEnabled' : taxType === 'gst' ? 'taxGstEnabled' : 'taxQstEnabled'
    const prevValue = invoice[flagKey]
    const updatedInvoice = { ...invoice, [flagKey]: !prevValue }
    const totals = computeInvoiceTotals(invoice.items || [], updatedInvoice)
    setInvoice({ ...updatedInvoice, ...totals })
    setIsDirty(true)

    setSavingTax(true)
    try {
      const res = await updateInvoice(invoice.id, { [flagKey]: !prevValue })
      if (res.status !== 'success') {
        showNotification(res.message || t('failedToUpdateTax'), 'error')
        // Revert
        const reverted = { ...invoice, [flagKey]: prevValue }
        const revertTotals = computeInvoiceTotals(invoice.items || [], reverted)
        setInvoice({ ...reverted, ...revertTotals })
      }
    } catch {
      showNotification(t('errorUpdatingTax'), 'error')
      const reverted = { ...invoice, [flagKey]: prevValue }
      const revertTotals = computeInvoiceTotals(invoice.items || [], reverted)
      setInvoice({ ...reverted, ...revertTotals })
    } finally { setSavingTax(false) }
  }

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return
    const prevStatus = invoice.status
    setInvoice({ ...invoice, status: newStatus })
    setIsDirty(true)
    setPmActionLoading(true)
    try {
      const res = await changeInvoiceStatus(invoice.id, newStatus)
      if (res.status === 'success') {
        showNotification(t('statusChangedTo', { status: INVOICE_STATUS_INFO[newStatus].label }), 'success')
      } else {
        showNotification(res.message || t('failedToChangeStatus'), 'error')
        setInvoice({ ...invoice, status: prevStatus })
      }
    } catch {
      showNotification(t('errorChangingStatus'), 'error')
      setInvoice({ ...invoice, status: prevStatus })
    } finally {
      setPmActionLoading(false)
    }
  }

  // Fetch PDF files on load
  useEffect(() => {
    if (!isOpen || !invoiceId) return
    getInvoiceFiles(invoiceId).then(res => {
      if (res.status === 'success') {
        setCurrentFile(res.data.find(f => f.isCurrent) || null)
      }
    }).catch(() => {})
  }, [isOpen, invoiceId])

  const handleGeneratePDF = async () => {
    if (!invoice) return
    setGeneratingPDF(true)
    try {
      const res = await generateInvoicePDF(invoice.id)
      if (res.status === 'success' && res.data?.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
        showNotification(t('pdfGeneratedSuccess'), 'success')
        // Refresh file list
        const filesRes = await getInvoiceFiles(invoice.id)
        if (filesRes.status === 'success') {
          setCurrentFile(filesRes.data.find(f => f.isCurrent) || null)
        }
      } else {
        showNotification(res.message || t('failedToGeneratePdfInvoice'), 'error')
      }
    } catch (err) {
      console.error('Error generating PDF:', err)
      showNotification(t('errorGeneratingPdf'), 'error')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const handlePreviewPDF = async () => {
    if (!invoice || !currentFile) return
    try {
      const res = await downloadInvoiceFile(invoice.id, currentFile.id)
      if (res.status === 'success' && res.data?.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
      } else {
        showNotification(t('failedToGetPreviewUrl'), 'error')
      }
    } catch {
      showNotification(t('errorPreviewingPdf'), 'error')
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoice || !currentFile) return
    try {
      const res = await downloadInvoiceFile(invoice.id, currentFile.id)
      if (res.status === 'success' && res.data?.signedUrl) {
        const response = await fetch(res.data.signedUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = currentFile.fileName
        a.click()
        URL.revokeObjectURL(url)
      } else {
        showNotification(t('failedToDownload'), 'error')
      }
    } catch {
      showNotification(t('errorDownloadingPdf'), 'error')
    }
  }

  // Start editing an item
  const startEditing = (item: CleanerInvoiceItem) => {
    setEditingItemId(item.id)
    setEditForm({
      description: item.description,
      rateType: item.rateType || '',
      rateAmount: item.rateAmount != null ? String(item.rateAmount) : '',
      durationMinutes: item.durationMinutes != null ? String(item.durationMinutes) : '',
      amount: String(item.amount),
      notes: item.notes || '',
      isTaxable: item.isTaxable || false,
      projectDate: item.projectDate ? item.projectDate.split('T')[0] : '',
    })
  }

  const cancelEditing = () => {
    setEditingItemId(null)
  }

  const saveItemEdit = async () => {
    if (!invoice || !editingItemId) return

    try {
      const payload: Record<string, unknown> = {}
      const currentItem = invoice.items?.find(i => i.id === editingItemId)
      if (!currentItem) return

      if (editForm.description !== currentItem.description) payload.description = editForm.description
      if (editForm.rateType !== (currentItem.rateType || '')) payload.rateType = editForm.rateType || null
      if (editForm.rateAmount !== (currentItem.rateAmount != null ? String(currentItem.rateAmount) : '')) {
        payload.rateAmount = editForm.rateAmount ? parseFloat(editForm.rateAmount) : null
      }
      if (editForm.durationMinutes !== (currentItem.durationMinutes != null ? String(currentItem.durationMinutes) : '')) {
        payload.durationMinutes = editForm.durationMinutes ? parseInt(editForm.durationMinutes) : null
      }
      if (editForm.amount !== String(currentItem.amount)) {
        payload.amount = parseFloat(editForm.amount)
      }
      if (editForm.notes !== (currentItem.notes || '')) payload.notes = editForm.notes || null
      if (editForm.isTaxable !== (currentItem.isTaxable || false)) payload.isTaxable = editForm.isTaxable
      // Dates are required data — only send a change, never a clear
      if (editForm.projectDate && editForm.projectDate !== (currentItem.projectDate ? currentItem.projectDate.split('T')[0] : '')) {
        payload.projectDate = editForm.projectDate
      }

      if (Object.keys(payload).length === 0) {
        setEditingItemId(null)
        return
      }

      const res = await updateInvoiceItem(invoice.id, editingItemId, payload)
      if (res.status === 'success') {
        showNotification(t('itemUpdated'), 'success')
        setEditingItemId(null)
        const updatedItems = (invoice.items || []).map(i => i.id === editingItemId ? res.data : i)
        updateInvoiceOptimistic(updatedItems)
      } else {
        showNotification(res.message || t('failedToUpdateItem'), 'error')
      }
    } catch (err) {
      console.error('Error updating item:', err)
      showNotification(t('errorUpdatingItem'), 'error')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!invoice) return

    const prevItems = invoice.items || []
    const updatedItems = prevItems.filter(i => i.id !== itemId)
    updateInvoiceOptimistic(updatedItems)

    try {
      const res = await deleteInvoiceItem(invoice.id, itemId)
      if (res.status === 'success') {
        showNotification(t('itemRemoved'), 'success')
      } else {
        showNotification(res.message || t('failedToRemoveItem'), 'error')
        updateInvoiceOptimistic(prevItems)
      }
    } catch (err) {
      console.error('Error deleting item:', err)
      showNotification(t('errorRemovingItem'), 'error')
      updateInvoiceOptimistic(prevItems)
    }
  }

  const handleItemAdded = (newItem: CleanerInvoiceItem) => {
    if (invoice) {
      updateInvoiceOptimistic([...(invoice.items || []), newItem])
    }
  }

  const isConvertibleToExpense = (item: CleanerInvoiceItem): boolean =>
    item.type === 'extra_charge'

  const handleItemConverted = (updatedItem: CleanerInvoiceItem) => {
    if (invoice) {
      const updatedItems = (invoice.items || []).map(i =>
        i.id === updatedItem.id ? { ...i, expenseId: updatedItem.expenseId } : i
      )
      updateInvoiceOptimistic(updatedItems)
    }
    setConvertingItem(null)
  }

  const handleDeleteRelatedExpense = async (item: CleanerInvoiceItem) => {
    if (!invoice || !item.expenseId || !effectiveUserId) return
    const prevItems = invoice.items || []
    const updatedItems = prevItems.map(i =>
      i.id === item.id ? { ...i, expenseId: null, type: 'extra_charge' as const } : i
    )
    updateInvoiceOptimistic(updatedItems)
    setDeletingExpenseItemId(null)
    try {
      const res = await deleteExpense(item.expenseId, effectiveUserId)
      if (res.status === 'success') {
        showNotification(t('relatedExpenseDeleted'), 'success')
      } else {
        showNotification(res.message || t('failedToDeleteExpense'), 'error')
        updateInvoiceOptimistic(prevItems)
      }
    } catch {
      showNotification(t('errorDeletingExpense'), 'error')
      updateInvoiceOptimistic(prevItems)
    }
  }

  const handleSaveNotes = async () => {
    if (!invoice) return
    setSavingNotes(true)
    try {
      const res = await updateInvoice(invoice.id, { cleanerNotes })
      if (res.status === 'success') {
        showNotification(t('notesSaved'), 'success')
        setInvoice({ ...invoice, cleanerNotes })
        setIsDirty(true)
      } else {
        showNotification(res.message || t('failedToSaveNotes'), 'error')
      }
    } catch (err) {
      console.error('Error saving notes:', err)
      showNotification(t('errorSavingNotes'), 'error')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSubmit = async () => {
    if (!invoice) return
    setSubmitting(true)
    try {
      const res = await submitInvoice(invoice.id)
      if (res.status === 'success') {
        showNotification(t('invoiceSubmittedToPm'), 'success')
        setInvoice({ ...invoice, status: 'pending' as InvoiceStatus })
        setIsDirty(true)
      } else {
        showNotification(res.message || t('failedToSubmitInvoice'), 'error')
      }
    } catch (err) {
      console.error('Error submitting invoice:', err)
      showNotification(t('errorSubmittingInvoice'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!invoice || !confirm(t('confirmDeleteInvoicePrompt', { number: invoice.invoiceNumber }))) return
    try {
      const res = await deleteInvoice(invoice.id)
      if (res.status === 'success') {
        showNotification(t('invoiceDeletedSuccess'), 'success')
        onUpdated()
        onClose()
      } else {
        showNotification(res.message || t('failedToDeleteInvoice'), 'error')
      }
    } catch (err) {
      console.error('Error deleting invoice:', err)
      showNotification(t('errorDeletingInvoice'), 'error')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr.split('T')[0] + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return '—'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const formatRate = (item: CleanerInvoiceItem) => {
    if (!item.rateType || item.rateAmount == null) return '—'
    return `$${item.rateAmount.toFixed(2)}/${item.rateType === 'flat' ? t('flatRateShort') : t('hourlyRateShort')}`
  }

  if (loading || !invoice) {
    return (
      <Modal isOpen={isOpen} onClose={handleModalClose} style={modalStyle}>
        <div className="flex justify-center items-center py-12 p-6">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Modal>
    )
  }

  const status = statusConfig[invoice.status]
  const items = invoice.items || []

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} style={modalStyle}>
      {/* Fixed top: header + PDF actions + status notices */}
      <div className="flex-shrink-0 px-6 pt-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 pr-8">
        <div>
          <div className="flex items-center gap-2.5">
            {editingInvoiceNumber ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={invoiceNumberDraft}
                  onChange={(e) => setInvoiceNumberDraft(e.target.value)}
                  className="text-lg font-bold text-gray-900 border border-emerald-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveInvoiceNumber()
                    if (e.key === 'Escape') setEditingInvoiceNumber(false)
                  }}
                />
                <button onClick={handleSaveInvoiceNumber} className="p-1 rounded hover:bg-emerald-100">
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                </button>
                <button onClick={() => setEditingInvoiceNumber(false)} className="p-1 rounded hover:bg-gray-100">
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group">
                <h2 className="text-xl font-bold text-gray-900">{invoice.invoiceNumber}</h2>
                {isEditable && (
                  <button
                    onClick={() => { setInvoiceNumberDraft(invoice.invoiceNumber); setEditingInvoiceNumber(true) }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                    title={t('editInvoiceNumber')}
                  >
                    <PencilIcon className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            )}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {role === 'pm' && (
              <select
                value={invoice.status}
                onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
                disabled={pmActionLoading}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
              >
                {(['draft', 'pending', 'approved', 'rejected', 'paid', 'archived'] as InvoiceStatus[]).map((s) => (
                  <option key={s} value={s}>{INVOICE_STATUS_INFO[s].label}</option>
                ))}
              </select>
            )}
          </div>
          {/* Bill From */}
          <div className="flex items-center gap-1.5 mt-1.5 group">
            <span className="text-xs text-gray-400 uppercase tracking-wider">{t('fromLabel')}:</span>
            {editingBillFrom ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={billFromDraft}
                  onChange={(e) => setBillFromDraft(e.target.value)}
                  placeholder={invoice.cleanerBusinessName || invoice.cleanerName || t('businessNamePlaceholder')}
                  className="text-sm text-gray-700 border border-emerald-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-56"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveBillFrom()
                    if (e.key === 'Escape') setEditingBillFrom(false)
                  }}
                />
                <button onClick={handleSaveBillFrom} className="p-0.5 rounded hover:bg-emerald-100">
                  <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                </button>
                <button onClick={() => setEditingBillFrom(false)} className="p-0.5 rounded hover:bg-gray-100">
                  <XMarkIcon className="h-3.5 w-3.5 text-gray-400" />
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700">
                  {invoice.billFromName || invoice.cleanerBusinessName || invoice.cleanerName}
                </span>
                {isEditable && (
                  <button
                    onClick={() => { setBillFromDraft(invoice.billFromName || invoice.cleanerBusinessName || invoice.cleanerName || ''); setEditingBillFrom(true) }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                    title={t('editBillFromName')}
                  >
                    <PencilIcon className="h-3 w-3 text-gray-400" />
                  </button>
                )}
              </>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {t('periodLabel')}: {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{t('createdLabel')} {formatDate(invoice.createdAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">${invoice.total.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{t('itemCount', { count: items.length })}</p>
        </div>
      </div>

      {/* PDF Actions */}
      <div className="flex items-center gap-2 mb-4">
        {currentFile ? (
          <>
            <button
              onClick={handlePreviewPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <EyeIcon className="h-3.5 w-3.5" />
              {t('previewPdf')}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {t('downloadPdf')}
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              {generatingPDF ? t('regenerating') : t('regenerate')}
            </button>
            <span className="text-[10px] text-gray-400">v{currentFile.fileVersion}</span>
          </>
        ) : (
          <button
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {generatingPDF ? (
              <>
                <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                {t('generatingPdf')}
              </>
            ) : t('generatePdf')}
          </button>
        )}
      </div>

      {/* Rejection Notice */}
      {invoice.status === 'rejected' && invoice.pmNotes && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{t('rejectedByPm')}</p>
            <p className="text-sm text-red-600 mt-0.5">{invoice.pmNotes}</p>
          </div>
        </div>
      )}

      {/* Paid Notice */}
      {invoice.status === 'paid' && invoice.paidAt && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-800">{t('paidOn', { date: formatDate(invoice.paidAt) })}</p>
        </div>
      )}

      {/* Pending Notice */}
      {invoice.status === 'pending' && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <ClockIcon className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-amber-800">{t('waitingForPmReview')}</p>
        </div>
      )}

      {/* Archived Notice */}
      {invoice.status === 'archived' && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
          <ArchiveBoxIcon className="h-5 w-5 text-slate-500" />
          <p className="text-sm text-slate-700">{t('invoiceIsArchived')}</p>
        </div>
      )}
      </div>

      {/* Scrollable middle: line items + tax + totals + notes + reject input */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6">

      {/* Line Items */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('lineItems')}</h3>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.expenseId ? (
                      <BanknotesIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    ) : item.cleaningProjectId ? (
                      <BuildingOfficeIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    ) : (
                      <CurrencyDollarIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                    {item.expenseId && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewingExpenseId(item.expenseId!) }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                        title={t('viewExpenseDetails')}
                      >
                        <EyeIcon className="h-2.5 w-2.5" />
                        {t('viewExpenseDetails')}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-6">
                    {item.projectDate && (
                      <span className="text-xs text-gray-400">{formatDate(item.projectDate)}</span>
                    )}
                    {!item.expenseId && <span className="text-xs text-gray-400">{formatRate(item)}</span>}
                    {!item.expenseId && item.rateType === 'hourly' && (
                      <span className="text-xs text-gray-400">{formatDuration(item.durationMinutes)}</span>
                    )}
                    {item.isManualOverride && item.originalAmount != null && item.originalAmount !== item.amount ? (
                      <span className="text-xs text-amber-500">
                        {t('wasAmount', { amount: item.originalAmount.toFixed(2) })}
                      </span>
                    ) : item.isManualOverride ? (
                      <span className="text-xs text-amber-500">{t('edited')}</span>
                    ) : null}
                    {item.originalDurationMinutes != null && item.durationMinutes != null && item.originalDurationMinutes !== item.durationMinutes && (
                      <span className="text-xs text-blue-500">
                        {t('wasDuration', { duration: formatDuration(item.originalDurationMinutes) })}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-gray-400 mt-1 ml-6">{item.notes}</p>
                  )}
                  {item.receiptSignedUrl && (
                    <button
                      onClick={() => window.open(item.receiptSignedUrl!, '_blank')}
                      className="inline-flex items-center gap-1 mt-1 ml-6 text-[10px] text-blue-600 hover:text-blue-800 transition-colors"
                      title={`${t('receiptLabel')}: ${item.receiptOriginalName || t('viewReceipt')}`}
                    >
                      <DocumentTextIcon className="h-3 w-3" />
                      <span>{item.receiptOriginalName || t('viewReceipt')}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(invoice.taxHstEnabled || invoice.taxGstEnabled || invoice.taxQstEnabled) && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!isEditable) return
                        try {
                          const updatedItems = (invoice.items || []).map(i => i.id === item.id ? { ...i, isTaxable: !i.isTaxable } : i)
                          updateInvoiceOptimistic(updatedItems)
                          const res = await updateInvoiceItem(invoice.id, item.id, { isTaxable: !item.isTaxable })
                          if (res.status !== 'success') {
                            showNotification(res.message || t('failedToUpdate'), 'error')
                            const revertedItems = (invoice.items || []).map(i => i.id === item.id ? { ...i, isTaxable: item.isTaxable } : i)
                            updateInvoiceOptimistic(revertedItems)
                          }
                        } catch { showNotification(t('errorUpdatingTax'), 'error') }
                      }}
                      disabled={!isEditable}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                        item.isTaxable
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400 line-through'
                      } ${isEditable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                      title={isEditable ? (item.isTaxable ? t('clickToRemoveTax') : t('clickToAddTax')) : (item.isTaxable ? t('taxable') : t('nonTaxable'))}
                    >
                      {t('taxShort')}
                    </button>
                  )}
                  <span className="text-sm font-semibold text-gray-900">${item.amount.toFixed(2)}</span>
                  {isEditable && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => editingItemId === item.id ? cancelEditing() : startEditing(item)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                      >
                        <PencilIcon className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 rounded hover:bg-red-100 transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </div>
                  )}
                  {isEditable && isConvertibleToExpense(item) && (
                    <button
                      onClick={() => setConvertingItem(item)}
                      className="p-1 rounded hover:bg-emerald-100 transition-colors"
                      title={t('convertToExpense')}
                    >
                      <BanknotesIcon className="h-3.5 w-3.5 text-emerald-500" />
                    </button>
                  )}
                  {role === 'pm' && item.type === 'expense' && item.expenseId && (
                    deletingExpenseItemId === item.id ? (
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-red-600">{t('deleteRelatedExpense')}?</span>
                        <button
                          onClick={() => handleDeleteRelatedExpense(item)}
                          className="text-red-600 font-semibold hover:underline cursor-pointer"
                        >
                          {t('yes')}
                        </button>
                        <button
                          onClick={() => setDeletingExpenseItemId(null)}
                          className="text-gray-500 hover:underline cursor-pointer"
                        >
                          {t('no')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingExpenseItemId(item.id)}
                        className="p-1 rounded hover:bg-red-100 transition-colors"
                        title={t('deleteRelatedExpense')}
                      >
                        <TrashIcon className="h-3.5 w-3.5 text-amber-500" />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Inline Edit Row */}
              {editingItemId === item.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder={t('description')}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {!item.expenseId && (
                      <>
                        {/* Rate Type */}
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                          {['flat', 'hourly'].map((type) => (
                            <button
                              key={type}
                              onClick={() => setEditForm({ ...editForm, rateType: type })}
                              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                                editForm.rateType === type
                                  ? type === 'flat' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-500 hover:bg-gray-50'
                              } ${type === 'hourly' ? 'border-l border-gray-200' : ''}`}
                            >
                              {type === 'flat' ? t('flat') : t('hourly')}
                            </button>
                          ))}
                        </div>
                        {/* Rate Amount */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editForm.rateAmount}
                            onChange={(e) => setEditForm({ ...editForm, rateAmount: e.target.value })}
                            placeholder={t('ratePlaceholder')}
                            className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        {/* Duration */}
                        {editForm.rateType === 'hourly' && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={editForm.durationMinutes}
                              onChange={(e) => setEditForm({ ...editForm, durationMinutes: e.target.value })}
                              placeholder={t('minutesPlaceholder')}
                              className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-xs text-gray-400">min</span>
                          </div>
                        )}
                      </>
                    )}
                    {/* Direct Amount Override / Total */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">{t('total')} $</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                        placeholder={t('amountPlaceholder')}
                        className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {/* Date — project items derive theirs from the cleaning project */}
                    {!item.cleaningProjectId && (
                      <input
                        type="date"
                        value={editForm.projectDate}
                        onChange={(e) => setEditForm({ ...editForm, projectDate: e.target.value })}
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder={t('notesOptionalPlaceholder')}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, isTaxable: !editForm.isTaxable })}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                        editForm.isTaxable
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                        editForm.isTaxable ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {editForm.isTaxable && <CheckIcon className="h-2 w-2 text-white" />}
                      </div>
                      {t('taxable')}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={cancelEditing} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                        <XMarkIcon className="h-4 w-4 text-gray-500" />
                      </button>
                      <button onClick={saveItemEdit} className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors">
                        <CheckIcon className="h-4 w-4 text-emerald-700" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

        </div>

        {/* Add Extra Charge / Add Receipt Buttons */}
        {isEditable && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setShowAddExtraModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {t('addExtraCharge')}
            </button>
            <button
              onClick={() => setShowAddReceiptModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <DocumentTextIcon className="h-3.5 w-3.5" />
              {t('addReceiptToInvoice')}
            </button>
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <BanknotesIcon className="h-3.5 w-3.5" />
              {t('addExistingExpense')}
            </button>
          </div>
        )}

        {/* Add Extra Charge Modal */}
        <AddExtraChargeModal
          isOpen={showAddExtraModal}
          onClose={() => setShowAddExtraModal(false)}
          invoiceId={invoiceId}
          onAdded={handleItemAdded}
          defaultTaxable={invoice.taxHstEnabled || invoice.taxGstEnabled || invoice.taxQstEnabled}
        />

        {/* Add Receipt to Invoice Modal */}
        <AddReceiptToInvoiceModal
          isOpen={showAddReceiptModal}
          onClose={() => setShowAddReceiptModal(false)}
          invoiceId={invoiceId}
          cleanerId={invoice.cleanerId}
          onAdded={handleItemAdded}
        />

        {showAddExpenseModal && (
          <AddExistingExpenseModal
            isOpen={showAddExpenseModal}
            onClose={() => setShowAddExpenseModal(false)}
            invoiceId={invoiceId}
            cleanerId={invoice.cleanerId}
            onAdded={handleItemAdded}
          />
        )}
      </div>

      {/* Tax Toggles */}
      {isEditable && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tax:</span>
          {([
            { key: 'hst' as const, enabled: invoice.taxHstEnabled },
            { key: 'gst' as const, enabled: invoice.taxGstEnabled },
            { key: 'qst' as const, enabled: invoice.taxQstEnabled },
          ]).map(({ key, enabled }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTaxToggle(key)}
              disabled={savingTax}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border disabled:opacity-50 ${
                enabled
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                enabled ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
              }`}>
                {enabled && <CheckIcon className="h-2 w-2 text-white" />}
              </div>
              {TAX_RATES[key].label} ({TAX_RATES[key].pct})
            </button>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="border-t border-gray-200 pt-3 mb-4">
        <div className="flex justify-end">
          <div className="text-right">
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-gray-500">{t('subtotal')}</span>
              <span className="font-medium text-gray-900">${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.taxHstEnabled && invoice.taxHst > 0 && (
              <div className="flex justify-between gap-8 text-sm mt-0.5">
                <span className="text-gray-400">{TAX_RATES.hst.label} ({TAX_RATES.hst.pct})</span>
                <span className="text-gray-700">${invoice.taxHst.toFixed(2)}</span>
              </div>
            )}
            {invoice.taxGstEnabled && invoice.taxGst > 0 && (
              <div className="flex justify-between gap-8 text-sm mt-0.5">
                <span className="text-gray-400">{TAX_RATES.gst.label} ({TAX_RATES.gst.pct})</span>
                <span className="text-gray-700">${invoice.taxGst.toFixed(2)}</span>
              </div>
            )}
            {invoice.taxQstEnabled && invoice.taxQst > 0 && (
              <div className="flex justify-between gap-8 text-sm mt-0.5">
                <span className="text-gray-400">{TAX_RATES.qst.label} ({TAX_RATES.qst.pct})</span>
                <span className="text-gray-700">${invoice.taxQst.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between gap-8 text-lg mt-1">
              <span className="font-semibold text-gray-700">{t('total')}</span>
              <span className="font-bold text-gray-900">${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('notes')}</h3>
        {isEditable ? (
          <div className="space-y-2">
            <textarea
              value={cleanerNotes}
              onChange={(e) => setCleanerNotes(e.target.value)}
              placeholder={t('addNotesForPm')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            {cleanerNotes !== (invoice.cleanerNotes || '') && (
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
              >
                {savingNotes ? t('saving') : t('saveNotes')}
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600">{invoice.cleanerNotes || t('noNotes')}</p>
        )}

        {invoice.pmNotes && invoice.status !== 'rejected' && (
          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">{t('pmNotes')}:</p>
            <p className="text-sm text-blue-800">{invoice.pmNotes}</p>
          </div>
        )}
      </div>

      {/* PM Reject Notes Input */}
      {role === 'pm' && showRejectInput && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <input
            type="text"
            value={pmRejectNotes}
            onChange={(e) => setPmRejectNotes(e.target.value)}
            placeholder={t('rejectionReasonPlaceholder')}
            className="flex-1 px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
            autoFocus
          />
          <button
            onClick={async () => {
              if (!pmRejectNotes.trim()) { showNotification(t('pleaseProvideReason'), 'error'); return }
              setPmActionLoading(true)
              try {
                const res = await rejectInvoice(invoice.id, pmRejectNotes)
                if (res.status === 'success') {
                  showNotification(t('invoiceRejected'), 'success')
                  setShowRejectInput(false)
                  setPmRejectNotes('')
                  setInvoice({ ...invoice, status: 'rejected' as InvoiceStatus, pmNotes: pmRejectNotes })
                  setIsDirty(true)
                } else { showNotification(res.message || t('failedToUpdate'), 'error') }
              } catch { showNotification(t('errorRejectingInvoice'), 'error') }
              finally { setPmActionLoading(false) }
            }}
            disabled={pmActionLoading}
            className="px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {pmActionLoading ? '...' : t('reject')}
          </button>
          <button
            onClick={() => { setShowRejectInput(false); setPmRejectNotes('') }}
            className="p-2 rounded-lg hover:bg-red-100"
          >
            <XMarkIcon className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}
      </div>

      {/* Fixed bottom: footer actions (always visible) */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200">

      {/* Footer Actions */}
      <div className="flex justify-between gap-3">
        <div className="flex gap-2">
          {role === 'cleaner' && isEditable && (
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              {t('deleteInvoice')}
            </button>
          )}
          {role === 'pm' && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              {t('deleteInvoice')}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleModalClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t('close')}
          </button>

          {/* Cleaner actions */}
          {role === 'cleaner' && isEditable && (
            <button
              onClick={handleSubmit}
              disabled={submitting || items.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              {submitting ? t('submitting') : invoice.status === 'rejected' ? t('resubmit') : t('submitToPm')}
            </button>
          )}

          {/* PM actions */}
          {role === 'pm' && invoice.status === 'pending' && (
            <>
              <button
                onClick={() => setShowRejectInput(true)}
                disabled={pmActionLoading}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {t('reject')}
              </button>
              <button
                onClick={async () => {
                  setPmActionLoading(true)
                  try {
                    const res = await approveInvoice(invoice.id)
                    if (res.status === 'success') {
                      showNotification(t('invoiceApproved', { number: invoice.invoiceNumber }), 'success')
                      setInvoice({ ...invoice, status: 'approved' as InvoiceStatus })
                      setIsDirty(true)
                    } else { showNotification(res.message || t('failedToUpdate'), 'error') }
                  } catch { showNotification(t('errorApproving'), 'error') }
                  finally { setPmActionLoading(false) }
                }}
                disabled={pmActionLoading}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
                {pmActionLoading ? t('approving') : t('approve')}
              </button>
            </>
          )}
          {role === 'pm' && invoice.status === 'approved' && (
            <button
              onClick={async () => {
                setPmActionLoading(true)
                try {
                  const res = await markInvoicePaid(invoice.id)
                  if (res.status === 'success') {
                    showNotification(t('invoiceMarkedPaid', { number: invoice.invoiceNumber }), 'success')
                    setInvoice({ ...invoice, status: 'paid' as InvoiceStatus })
                    setIsDirty(true)
                  } else { showNotification(res.message || t('failedToUpdate'), 'error') }
                } catch { showNotification(t('errorMarkingPaid'), 'error') }
                finally { setPmActionLoading(false) }
              }}
              disabled={pmActionLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <CurrencyDollarIcon className="h-4 w-4" />
              {pmActionLoading ? t('processing') : t('markAsPaid')}
            </button>
          )}
        </div>
      </div>
      </div>

      {/* PM Delete Confirmation Modal */}
      {role === 'pm' && invoice && showDeleteConfirm && (
        <DeleteInvoiceModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          invoice={invoice}
          onDeleted={() => { onUpdated(); onClose() }}
        />
      )}
      {convertingItem && invoice && (
        <ConvertToExpenseModal
          isOpen={!!convertingItem}
          onClose={() => setConvertingItem(null)}
          invoiceId={invoice.id}
          item={convertingItem}
          onConverted={handleItemConverted}
          role={role}
        />
      )}
      {viewingExpenseId && (
        <ExpenseViewerModal
          isOpen={!!viewingExpenseId}
          onClose={() => setViewingExpenseId(null)}
          expenseId={viewingExpenseId}
          zIndex={70}
          onExpenseUpdated={() => { setIsDirty(true) }}
          onExpenseDeleted={(deletedId) => {
            setViewingExpenseId(null)
            if (invoice) {
              const updatedItems = (invoice.items || []).map(i =>
                i.expenseId === deletedId ? { ...i, expenseId: null, type: 'extra_charge' as const } : i
              )
              updateInvoiceOptimistic(updatedItems)
            }
          }}
        />
      )}
    </Modal>
  )
}

export default ViewInvoiceModal
