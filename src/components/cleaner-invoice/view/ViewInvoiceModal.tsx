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
  generateInvoicePDF,
  getInvoiceFiles,
  downloadInvoiceFile,
} from '@/services/cleanerInvoiceService'
// addInvoiceItem is now handled by AddExtraChargeModal
import AddExtraChargeModal from '../create/AddExtraChargeModal'
import type { InvoiceFile } from '@/services/types/cleanerInvoice'
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
} from '@heroicons/react/24/outline'

interface ViewInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  onUpdated: () => void
  role?: 'cleaner' | 'pm'
}

const statusConfig: Record<InvoiceStatus, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  pending: { label: 'Pending Review', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
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
  const [editForm, setEditForm] = useState({ description: '', rateType: '' as string, rateAmount: '', durationMinutes: '', amount: '', notes: '' })
  const [showAddExtraModal, setShowAddExtraModal] = useState(false)
  const [cleanerNotes, setCleanerNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // PM action state
  const [pmActionLoading, setPmActionLoading] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [pmRejectNotes, setPmRejectNotes] = useState('')
  // PDF state
  const [currentFile, setCurrentFile] = useState<InvoiceFile | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  const showNotification = useNotificationStore((state) => state.showNotification)

  const modalStyle = role === 'pm'
    ? 'p-6 max-w-5xl !w-11/12 !max-h-[85vh]'
    : 'p-6 max-w-3xl !w-11/12 !max-h-[85vh]'

  // Cleaner can edit draft/rejected, PM can also edit pending
  const isEditable = role === 'pm'
    ? invoice?.status === 'pending'
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
          setCleanerNotes(res.data.cleanerNotes || '')
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
    }
  }, [isOpen])

  const refreshInvoice = async () => {
    const res = await getInvoiceById(invoiceId)
    if (res.status === 'success') {
      setInvoice(res.data)
      setCleanerNotes(res.data.cleanerNotes || '')
    }
    // Refresh PDF files
    try {
      const filesRes = await getInvoiceFiles(invoiceId)
      if (filesRes.status === 'success') {
        setCurrentFile(filesRes.data.find(f => f.isCurrent) || null)
      }
    } catch {}
    onUpdated()
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
        showNotification('PDF generated', 'success')
        // Refresh file list
        const filesRes = await getInvoiceFiles(invoice.id)
        if (filesRes.status === 'success') {
          setCurrentFile(filesRes.data.find(f => f.isCurrent) || null)
        }
      } else {
        showNotification(res.message || 'Failed to generate PDF', 'error')
      }
    } catch (err) {
      console.error('Error generating PDF:', err)
      showNotification('Error generating PDF', 'error')
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
        showNotification('Failed to get preview URL', 'error')
      }
    } catch {
      showNotification('Error previewing PDF', 'error')
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
        showNotification('Failed to download', 'error')
      }
    } catch {
      showNotification('Error downloading PDF', 'error')
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

      if (Object.keys(payload).length === 0) {
        setEditingItemId(null)
        return
      }

      const res = await updateInvoiceItem(invoice.id, editingItemId, payload)
      if (res.status === 'success') {
        showNotification('Item updated', 'success')
        setEditingItemId(null)
        await refreshInvoice()
      } else {
        showNotification(res.message || 'Failed to update item', 'error')
      }
    } catch (err) {
      console.error('Error updating item:', err)
      showNotification('Error updating item', 'error')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!invoice) return

    try {
      const res = await deleteInvoiceItem(invoice.id, itemId)
      if (res.status === 'success') {
        showNotification('Item removed', 'success')
        await refreshInvoice()
      } else {
        showNotification(res.message || 'Failed to remove item', 'error')
      }
    } catch (err) {
      console.error('Error deleting item:', err)
      showNotification('Error removing item', 'error')
    }
  }

  const handleExtraChargeAdded = async () => {
    await refreshInvoice()
  }

  const handleSaveNotes = async () => {
    if (!invoice) return
    setSavingNotes(true)
    try {
      const res = await updateInvoice(invoice.id, { cleanerNotes })
      if (res.status === 'success') {
        showNotification('Notes saved', 'success')
        await refreshInvoice()
      } else {
        showNotification(res.message || 'Failed to save notes', 'error')
      }
    } catch (err) {
      console.error('Error saving notes:', err)
      showNotification('Error saving notes', 'error')
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
        showNotification('Invoice submitted to property manager', 'success')
        await refreshInvoice()
      } else {
        showNotification(res.message || 'Failed to submit invoice', 'error')
      }
    } catch (err) {
      console.error('Error submitting invoice:', err)
      showNotification('Error submitting invoice', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!invoice || !confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return
    try {
      const res = await deleteInvoice(invoice.id)
      if (res.status === 'success') {
        showNotification('Invoice deleted', 'success')
        onUpdated()
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete invoice', 'error')
      }
    } catch (err) {
      console.error('Error deleting invoice:', err)
      showNotification('Error deleting invoice', 'error')
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
    return `$${item.rateAmount.toFixed(2)}/${item.rateType === 'flat' ? 'flat' : 'hr'}`
  }

  if (loading || !invoice) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} style={modalStyle}>
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Modal>
    )
  }

  const status = statusConfig[invoice.status]
  const items = invoice.items || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} style={modalStyle}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 pr-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-gray-900">{invoice.invoiceNumber}</h2>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Period: {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Created {formatDate(invoice.createdAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">${invoice.total.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
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
              Preview PDF
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Download
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              {generatingPDF ? 'Regenerating...' : 'Regenerate'}
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
                Generating PDF...
              </>
            ) : 'Generate PDF'}
          </button>
        )}
      </div>

      {/* Rejection Notice */}
      {invoice.status === 'rejected' && invoice.pmNotes && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Rejected by property manager</p>
            <p className="text-sm text-red-600 mt-0.5">{invoice.pmNotes}</p>
          </div>
        </div>
      )}

      {/* Paid Notice */}
      {invoice.status === 'paid' && invoice.paidAt && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-800">Paid on {formatDate(invoice.paidAt)}</p>
        </div>
      )}

      {/* Pending Notice */}
      {invoice.status === 'pending' && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <ClockIcon className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-amber-800">Waiting for property manager review</p>
        </div>
      )}

      {/* Line Items */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Line Items</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {items.map((item, index) => (
            <div key={item.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.cleaningProjectId ? (
                      <BuildingOfficeIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    ) : (
                      <CurrencyDollarIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-6">
                    {item.projectDate && (
                      <span className="text-xs text-gray-400">{formatDate(item.projectDate)}</span>
                    )}
                    <span className="text-xs text-gray-400">{formatRate(item)}</span>
                    {item.rateType === 'hourly' && (
                      <span className="text-xs text-gray-400">{formatDuration(item.durationMinutes)}</span>
                    )}
                    {item.isManualOverride && item.originalAmount != null && item.originalAmount !== item.amount ? (
                      <span className="text-xs text-amber-500">
                        was ${item.originalAmount.toFixed(2)}
                      </span>
                    ) : item.isManualOverride ? (
                      <span className="text-xs text-amber-500">edited</span>
                    ) : null}
                    {item.originalDurationMinutes != null && item.durationMinutes != null && item.originalDurationMinutes !== item.durationMinutes && (
                      <span className="text-xs text-blue-500">
                        was {formatDuration(item.originalDurationMinutes)}
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
                      title={`Receipt: ${item.receiptOriginalName || 'View receipt'}`}
                    >
                      <DocumentTextIcon className="h-3 w-3" />
                      <span>{item.receiptOriginalName || 'View Receipt'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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
                </div>
              </div>

              {/* Inline Edit Row */}
              {editingItemId === item.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Description"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
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
                          {type === 'flat' ? 'Flat' : 'Hourly'}
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
                        placeholder="Rate"
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
                          placeholder="Minutes"
                          className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-gray-400">min</span>
                      </div>
                    )}
                    {/* Direct Amount Override */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Total $</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                        placeholder="Amount"
                        className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEditing} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                      <XMarkIcon className="h-4 w-4 text-gray-500" />
                    </button>
                    <button onClick={saveItemEdit} className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors">
                      <CheckIcon className="h-4 w-4 text-emerald-700" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

        </div>

        {/* Add Extra Charge Button */}
        {isEditable && (
          <button
            onClick={() => setShowAddExtraModal(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Extra Charge
          </button>
        )}

        {/* Add Extra Charge Modal */}
        <AddExtraChargeModal
          isOpen={showAddExtraModal}
          onClose={() => setShowAddExtraModal(false)}
          invoiceId={invoiceId}
          onAdded={handleExtraChargeAdded}
        />
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-3 mb-4">
        <div className="flex justify-end">
          <div className="text-right">
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-8 text-lg mt-1">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-gray-900">${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
        {isEditable ? (
          <div className="space-y-2">
            <textarea
              value={cleanerNotes}
              onChange={(e) => setCleanerNotes(e.target.value)}
              placeholder="Add notes for the property manager..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            {cleanerNotes !== (invoice.cleanerNotes || '') && (
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600">{invoice.cleanerNotes || 'No notes'}</p>
        )}

        {invoice.pmNotes && invoice.status !== 'rejected' && (
          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">PM Notes:</p>
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
            placeholder="Reason for rejection (required)..."
            className="flex-1 px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
            autoFocus
          />
          <button
            onClick={async () => {
              if (!pmRejectNotes.trim()) { showNotification('Please provide a reason', 'error'); return }
              setPmActionLoading(true)
              try {
                const res = await rejectInvoice(invoice.id, pmRejectNotes)
                if (res.status === 'success') {
                  showNotification('Invoice rejected', 'success')
                  setShowRejectInput(false)
                  setPmRejectNotes('')
                  await refreshInvoice()
                } else { showNotification(res.message || 'Failed', 'error') }
              } catch { showNotification('Error rejecting invoice', 'error') }
              finally { setPmActionLoading(false) }
            }}
            disabled={pmActionLoading}
            className="px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {pmActionLoading ? '...' : 'Reject'}
          </button>
          <button
            onClick={() => { setShowRejectInput(false); setPmRejectNotes('') }}
            className="p-2 rounded-lg hover:bg-red-100"
          >
            <XMarkIcon className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
        <div className="flex gap-2">
          {role === 'cleaner' && isEditable && (
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Delete Invoice
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>

          {/* Cleaner actions */}
          {role === 'cleaner' && isEditable && (
            <button
              onClick={handleSubmit}
              disabled={submitting || items.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              {submitting ? 'Submitting...' : invoice.status === 'rejected' ? 'Resubmit' : 'Submit to PM'}
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
                Reject
              </button>
              <button
                onClick={async () => {
                  setPmActionLoading(true)
                  try {
                    const res = await approveInvoice(invoice.id)
                    if (res.status === 'success') {
                      showNotification(`Invoice ${invoice.invoiceNumber} approved`, 'success')
                      await refreshInvoice()
                    } else { showNotification(res.message || 'Failed', 'error') }
                  } catch { showNotification('Error approving', 'error') }
                  finally { setPmActionLoading(false) }
                }}
                disabled={pmActionLoading}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
                {pmActionLoading ? 'Approving...' : 'Approve'}
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
                    showNotification(`Invoice ${invoice.invoiceNumber} marked as paid`, 'success')
                    await refreshInvoice()
                  } else { showNotification(res.message || 'Failed', 'error') }
                } catch { showNotification('Error marking paid', 'error') }
                finally { setPmActionLoading(false) }
              }}
              disabled={pmActionLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <CurrencyDollarIcon className="h-4 w-4" />
              {pmActionLoading ? 'Processing...' : 'Mark as Paid'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ViewInvoiceModal
