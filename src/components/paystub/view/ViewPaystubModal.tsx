'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/shared/modal'
import {
  getPaystubById,
  updatePaystub,
  updatePaystubItem,
  deletePaystubItem,
  submitPaystub,
  approvePaystub,
  rejectPaystub,
  markPaystubPaid,
  changePaystubStatus,
  generatePaystubPDF,
  getPaystubFiles,
  downloadPaystubFile,
} from '@/services/paystubService'
import type {
  Paystub,
  PaystubItem,
  PaystubStatus,
  PaystubFile,
} from '@/services/types/paystub'
import { PAYSTUB_STATUS_INFO } from '@/services/types/paystub'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  ClockIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { formatHours, formatMoney } from '@/lib/format'
import { getLogos } from '@/services/reportService'
import { useUserStore } from '@/store/useUserStore'
import AddExtraChargeModal from '@/components/paystub/create/AddExtraChargeModal'
import AddExistingExpenseModal from '@/components/paystub/create/AddExistingExpenseModal'
import AddReceiptToPaystubModal from '@/components/paystub/create/AddReceiptToPaystubModal'
import ConvertToExpenseModal from '@/components/paystub/view/ConvertToExpenseModal'
import DeletePaystubModal from '@/components/paystub/delete/DeletePaystubModal'
import SendPaystubModal from '@/components/paystub/send/SendPaystubModal'
import Image from 'next/image'

interface ViewPaystubModalProps {
  isOpen: boolean
  onClose: () => void
  paystubId: string | null
  role: 'tm' | 'pm'
  userId: string                                       // effectiveUserId
  onUpdated?: () => void                               // called on close if anything changed
  onDeleted?: () => void
}

const ITEM_ICON: Record<PaystubItem['itemType'], React.ReactNode> = {
  time_entry: <ClockIcon className="w-4 h-4 text-blue-600" />,
  expense:    <BanknotesIcon className="w-4 h-4 text-emerald-600" />,
  extra_charge: <CurrencyDollarIcon className="w-4 h-4 text-amber-600" />,
}

const ViewPaystubModal: React.FC<ViewPaystubModalProps> = ({
  isOpen, onClose, paystubId, role, userId, onUpdated, onDeleted,
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)
  const pmEmail = useUserStore((s) => s.profile?.email)

  const [paystub, setPaystub] = useState<Paystub | null>(null)
  const [files, setFiles] = useState<PaystubFile[]>([])
  const [loading, setLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showSend, setShowSend] = useState(false)
  const [pmLogoUrl, setPmLogoUrl] = useState<string | null>(null)

  // Inline edit states
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [tmNotes, setTmNotes] = useState('')
  const [pmNotes, setPmNotes] = useState('')
  const [notesDirty, setNotesDirty] = useState(false)

  // Reject reason
  const [rejectInputOpen, setRejectInputOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Sub-modal state
  const [showAddExtra, setShowAddExtra] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddReceipt, setShowAddReceipt] = useState(false)
  const [convertingItem, setConvertingItem] = useState<PaystubItem | null>(null)
  const [showDelete, setShowDelete] = useState(false)

  const isEditable = useMemo(() => {
    if (!paystub) return false
    if (role === 'pm') return true
    return paystub.status === 'draft' || paystub.status === 'rejected'
  }, [paystub, role])

  const loadPaystub = async () => {
    if (!paystubId) return
    setLoading(true)
    try {
      const [res, filesRes] = await Promise.all([
        getPaystubById(paystubId),
        getPaystubFiles(paystubId),
      ])
      if (res.status === 'success') {
        setPaystub(res.data)
        setTmNotes(res.data.tmNotes ?? '')
        setPmNotes(res.data.pmNotes ?? '')
      } else {
        showNotification(res.message || 'Failed to load paystub.', 'error')
      }
      if (filesRes.status === 'success') setFiles(filesRes.data)
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen || !paystubId) return
    setIsDirty(false)
    setRejectInputOpen(false)
    setRejectReason('')
    setEditingItemId(null)
    setNotesDirty(false)
    setShowSend(false)
    loadPaystub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, paystubId])

  // Resolve the PM branding logo image for the "From" block. Logos are one-per-user
  // and getLogos() returns the caller's own — so this is only meaningful for a PM
  // viewing the paystub (a TM would get their own logo, not the PM's). TMs see the
  // text-only From block; the generated PDF stays branded for everyone.
  useEffect(() => {
    if (!isOpen || role !== 'pm') {
      setPmLogoUrl(null)
      return
    }
    let cancelled = false
    getLogos()
      .then((res) => {
        if (cancelled) return
        setPmLogoUrl(res.status === 'success' ? (res.data[0]?.logoUrl ?? null) : null)
      })
      .catch(() => { if (!cancelled) setPmLogoUrl(null) })
    return () => { cancelled = true }
  }, [isOpen, role])

  const refreshFiles = async () => {
    if (!paystub) return
    const filesRes = await getPaystubFiles(paystub.id)
    if (filesRes.status === 'success') setFiles(filesRes.data)
  }

  // After a send, refetch so the PM view reflects the new status (draft → sent) and mark
  // dirty so the list/summary/filters refresh on close (PAYSTUB-002 follow-up).
  const handleSent = async () => {
    await refreshFiles()
    await loadPaystub()
    setIsDirty(true)
  }

  const handleClose = () => {
    if (isDirty && onUpdated) onUpdated()
    onClose()
  }

  // Optimistic helpers ------------------------------------------------------
  const optimisticReplaceItems = (items: PaystubItem[]) => {
    setPaystub(p => {
      if (!p) return p
      const subtotal = items.reduce((s, it) => s + it.amount, 0)
      // Editing a finalized paystub reverts it to 'draft' on the backend (sent/rejected
      // → draft; see PAYSTUB-002). Mirror that here so action buttons (Approve/Send)
      // reflect the real status instead of erroring on a stale one.
      const status = (p.status === 'sent' || p.status === 'rejected') ? 'draft' : p.status
      return { ...p, items, subtotal, total: subtotal, status }
    })
    setIsDirty(true)
  }

  // Item handlers -----------------------------------------------------------
  const handleStartEditItem = (it: PaystubItem) => {
    setEditingItemId(it.id)
    setEditDescription(it.description)
    setEditAmount(String(it.amount))
  }
  const handleSaveEditItem = async () => {
    if (!paystub || !editingItemId) return
    const original = paystub.items?.find(i => i.id === editingItemId)
    if (!original) return
    const amt = parseFloat(editAmount)
    if (!editDescription.trim() || !Number.isFinite(amt)) {
      showNotification('Description and amount required.', 'error')
      return
    }
    const items = paystub.items!.map(i => i.id === editingItemId
      ? { ...i, description: editDescription.trim(), amount: amt, isManualOverride: true }
      : i)
    optimisticReplaceItems(items)
    setEditingItemId(null)
    try {
      const res = await updatePaystubItem(paystub.id, editingItemId, {
        description: editDescription.trim(),
        amount: amt,
      })
      if (res.status !== 'success') {
        showNotification(res.message || 'Failed to save.', 'error')
        loadPaystub()
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error.', 'error')
      loadPaystub()
    }
  }
  const handleDeleteItem = async (itemId: string) => {
    if (!paystub) return
    const items = paystub.items!.filter(i => i.id !== itemId)
    optimisticReplaceItems(items)
    try {
      const res = await deletePaystubItem(paystub.id, itemId)
      if (res.status !== 'success') {
        showNotification(res.message || 'Failed to delete item.', 'error')
        loadPaystub()
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error.', 'error')
      loadPaystub()
    }
  }
  const handleItemAdded = (item: PaystubItem) => {
    if (!paystub) return
    optimisticReplaceItems([...(paystub.items ?? []), item])
  }
  const handleItemConverted = (item: PaystubItem) => {
    if (!paystub) return
    optimisticReplaceItems(paystub.items!.map(i => i.id === item.id ? item : i))
    setConvertingItem(null)
  }

  // Notes ------------------------------------------------------------------
  const handleSaveNotes = async () => {
    if (!paystub) return
    try {
      const res = await updatePaystub(paystub.id, {
        tmNotes: role === 'tm' ? tmNotes : undefined,
        pmNotes: role === 'pm' ? pmNotes : undefined,
      })
      if (res.status === 'success') {
        setPaystub(res.data)
        setIsDirty(true)
        setNotesDirty(false)
        showNotification('Notes saved.', 'success')
      } else {
        showNotification(res.message || 'Failed to save notes.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error.', 'error')
    }
  }

  // Status actions ---------------------------------------------------------
  const doStatusAction = async (label: string, fn: () => Promise<{ status: 'success' | 'failed'; data?: Paystub; message?: string }>) => {
    setActionLoading(label)
    try {
      const res = await fn()
      if (res.status === 'success' && res.data) {
        setPaystub(res.data)
        setIsDirty(true)
        showNotification(`${label} succeeded.`, 'success')
      } else {
        showNotification(res.message || `${label} failed.`, 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error.', 'error')
    } finally {
      setActionLoading(null)
    }
  }
  const handleSubmit = () => paystub && doStatusAction('Submit', () => submitPaystub(paystub.id))
  const handleApprove = () => paystub && doStatusAction('Approve', () => approvePaystub(paystub.id))
  const handleMarkPaid = () => paystub && doStatusAction('Mark as paid', () => markPaystubPaid(paystub.id))
  const handleReject = async () => {
    if (!paystub) return
    if (!rejectReason.trim()) {
      showNotification('Reason is required to reject.', 'error')
      return
    }
    await doStatusAction('Reject', () => rejectPaystub(paystub.id, rejectReason.trim()))
    setRejectInputOpen(false)
    setRejectReason('')
  }
  const handleChangeStatus = (status: PaystubStatus) => paystub && doStatusAction('Status change',
    () => changePaystubStatus(paystub.id, status))

  // PDF --------------------------------------------------------------------
  const currentFile = files.find(f => f.isCurrent)
  const handleGeneratePDF = async () => {
    if (!paystub) return
    setActionLoading('Generate PDF')
    try {
      const res = await generatePaystubPDF(paystub.id)
      if (res.status === 'success' && res.data?.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
        // Refresh files list
        const filesRes = await getPaystubFiles(paystub.id)
        if (filesRes.status === 'success') setFiles(filesRes.data)
      } else {
        showNotification(res.message || 'Failed to generate PDF.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error.', 'error')
    } finally {
      setActionLoading(null)
    }
  }
  const handlePreviewPDF = async () => {
    if (!paystub || !currentFile) return
    try {
      const res = await downloadPaystubFile(paystub.id, currentFile.id)
      if (res.status === 'success' && res.data?.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to open PDF.', 'error')
    }
  }
  const handleDownloadPDF = async () => {
    if (!paystub || !currentFile) return
    try {
      const res = await downloadPaystubFile(paystub.id, currentFile.id)
      if (res.status === 'success' && res.data?.signedUrl) {
        const a = document.createElement('a')
        a.href = res.data.signedUrl
        a.download = res.data.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to download PDF.', 'error')
    }
  }

  if (!isOpen || !paystubId) return null

  if (loading || !paystub) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} style="p-6 max-w-3xl w-11/12">
        <div className="py-16 text-center text-gray-400">Loading paystub…</div>
      </Modal>
    )
  }

  const statusInfo = PAYSTUB_STATUS_INFO[paystub.status]
  const displayTotal = paystub.totalAmountSnapshot ?? paystub.total
  const displayCurrency = paystub.currencyAtPayment ?? paystub.currency
  const billFromName = paystub.billFromName || paystub.teamMemberBusinessName || paystub.teamMemberName || '—'

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} style="p-0 max-w-3xl w-11/12 !max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 pr-12">
          {/* PM branding "From" block — what the PDF shows */}
          {(paystub.pmCompanyName || pmLogoUrl || paystub.pmCompanyAddress) && (
            <div className="flex items-start gap-3 pb-3 mb-3 border-b border-gray-100">
              {pmLogoUrl && (
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image
                    src={pmLogoUrl}
                    alt={paystub.pmCompanyName || 'Company logo'}
                    fill
                    sizes="48px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              <div className="min-w-0 text-xs text-gray-500 leading-relaxed">
                {paystub.pmCompanyName && (
                  <div className="text-sm font-semibold text-gray-900">{paystub.pmCompanyName}</div>
                )}
                {paystub.pmCompanyAddress && (
                  <div className="whitespace-pre-line">{paystub.pmCompanyAddress}</div>
                )}
                <div className="flex flex-wrap gap-x-3">
                  {paystub.pmCompanyPhone && <span>{paystub.pmCompanyPhone}</span>}
                  {paystub.pmCompanyEmail && <span>{paystub.pmCompanyEmail}</span>}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Paystub</div>
              <div className="text-lg font-semibold text-gray-900">{paystub.paystubNumber}</div>
              <div className="text-xs text-gray-500 mt-0.5">From: {billFromName}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.pill}`}>
                {statusInfo.label}
              </span>
              {role === 'pm' && (
                <select
                  value={paystub.status}
                  onChange={(e) => handleChangeStatus(e.target.value as PaystubStatus)}
                  className="text-xs px-2 py-1 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {(Object.keys(PAYSTUB_STATUS_INFO) as PaystubStatus[]).map(s => (
                    <option key={s} value={s}>Set: {PAYSTUB_STATUS_INFO[s].label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs mt-3">
            <div>
              <div className="text-gray-500">Period</div>
              <div className="text-gray-900 font-medium">
                {paystub.periodStart ?? '—'} → {paystub.periodEnd ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-gray-500">{paystub.status === 'paid' ? 'Paid on' : 'Pay date'}</div>
              <div className="text-gray-900 font-medium">
                {paystub.paidAt ? new Date(paystub.paidAt).toLocaleDateString() : (paystub.payDate ?? '—')}
              </div>
            </div>
          </div>

          {/* Status banners */}
          {paystub.status === 'rejected' && paystub.pmNotes && (
            <div className={`mt-3 px-3 py-2 rounded-lg border text-xs ${statusInfo.banner}`}>
              <span className="font-semibold">Rejection reason:</span> {paystub.pmNotes}
            </div>
          )}
          {paystub.status === 'pending' && role === 'tm' && (
            <div className={`mt-3 px-3 py-2 rounded-lg border text-xs ${statusInfo.banner}`}>
              Waiting for your manager to review.
            </div>
          )}

          {/* PDF actions */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {currentFile ? (
              <>
                <button
                  type="button"
                  onClick={handlePreviewPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                >
                  <EyeIcon className="w-4 h-4" /> Preview PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" /> Download
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePDF}
                  disabled={actionLoading === 'Generate PDF'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  <ArrowPathIcon className="w-4 h-4" /> Regenerate
                </button>
                <span className="text-[10px] text-gray-400">v{currentFile.fileVersion}</span>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGeneratePDF}
                disabled={actionLoading === 'Generate PDF'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                <DocumentTextIcon className="w-4 h-4" />
                {actionLoading === 'Generate PDF' ? 'Generating…' : 'Generate PDF'}
              </button>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Line items</div>
          {(paystub.items ?? []).length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
              No items yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {(paystub.items ?? []).map(it => (
                <li key={it.id} className="px-3 py-2.5">
                  {editingItemId === it.id ? (
                    <div className="flex items-center gap-2">
                      {ITEM_ICON[it.itemType]}
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full pl-5 pr-1 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button onClick={handleSaveEditItem} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingItemId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">{ITEM_ICON[it.itemType]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 font-medium truncate">{it.description}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {it.projectDate && <span>{it.projectDate}</span>}
                          {it.propertyName && <span>· {it.propertyName}</span>}
                          {it.hoursWorked != null && <span>· {formatHours(it.hoursWorked)}</span>}
                          {it.hourlyRateAtEntry != null && <span>· @ {formatMoney(it.hourlyRateAtEntry, it.currencyAtEntry ?? 'CAD')}/hr</span>}
                          {it.isManualOverride && it.originalAmount != null && (
                            <span className="italic">· was {formatMoney(it.originalAmount, 'CAD')}</span>
                          )}
                        </div>
                        {it.receiptSignedUrl && (
                          <a
                            href={it.receiptSignedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:underline"
                          >
                            View receipt ({it.receiptOriginalName})
                          </a>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 tabular-nums">
                        {formatMoney(it.amount, 'CAD')}
                      </div>
                      {isEditable && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleStartEditItem(it)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {it.itemType === 'extra_charge' && (
                            <button
                              onClick={() => setConvertingItem(it)}
                              className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Convert to expense"
                            >
                              <BanknotesIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteItem(it.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Remove"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add buttons */}
          {isEditable && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAddExtra(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Extra charge
              </button>
              <button
                type="button"
                onClick={() => setShowAddExpense(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Existing expense
              </button>
              <button
                type="button"
                onClick={() => setShowAddReceipt(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Receipt
              </button>
            </div>
          )}

          {/* Totals */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-gray-900 tabular-nums">
              {formatMoney(displayTotal, displayCurrency)}
            </span>
          </div>
          {paystub.totalHoursSnapshot != null && (
            <div className="text-xs text-gray-500 text-right">
              {formatHours(paystub.totalHoursSnapshot)} (snapshot at payment)
            </div>
          )}

          {/* Notes */}
          <div className="mt-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {role === 'tm' ? 'My notes' : 'PM notes'}
            </div>
            <textarea
              value={role === 'tm' ? tmNotes : pmNotes}
              onChange={(e) => {
                if (role === 'tm') setTmNotes(e.target.value)
                else setPmNotes(e.target.value)
                setNotesDirty(true)
              }}
              disabled={!isEditable}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed"
              placeholder="Optional notes…"
            />
            {notesDirty && isEditable && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Save notes
                </button>
              </div>
            )}
          </div>

          {/* Reject reason input (PM only) */}
          {rejectInputOpen && (
            <div className="mt-4 px-3 py-3 rounded-lg border border-red-200 bg-red-50">
              <label className="block text-xs font-semibold text-red-700 mb-1">Reason for rejection *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white border border-red-200 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="What needs to be fixed?"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => { setRejectInputOpen(false); setRejectReason('') }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || actionLoading === 'Reject'}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === 'Reject' ? 'Rejecting…' : 'Confirm reject'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 sticky bottom-0 bg-white flex items-center justify-between gap-3">
          <div>
            {(role === 'pm' || isEditable) && (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100"
              >
                <TrashIcon className="w-4 h-4 inline -mt-0.5 mr-1" /> Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
            {role === 'pm' && (
              <button
                type="button"
                onClick={() => setShowSend(true)}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-4 h-4" /> Send to team member
              </button>
            )}
            {role === 'tm' && isEditable && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={actionLoading !== null || (paystub.items ?? []).length === 0}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 shadow-sm"
              >
                {paystub.status === 'rejected' ? 'Resubmit' : 'Submit'}
              </button>
            )}
            {role === 'pm' && paystub.status === 'pending' && (
              <button
                type="button"
                onClick={() => setRejectInputOpen(true)}
                disabled={actionLoading !== null}
                className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                Reject
              </button>
            )}
            {/* Approve from 'pending' (TM-submitted) or 'sent' (PM-finalized) — see PAYSTUB-002 */}
            {role === 'pm' && (paystub.status === 'pending' || paystub.status === 'sent') && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading !== null}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === 'Approve' ? 'Approving…' : 'Approve'}
              </button>
            )}
            {role === 'pm' && paystub.status === 'approved' && (
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={actionLoading !== null}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === 'Mark as paid' ? 'Marking paid…' : 'Mark as paid'}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Sub-modals — siblings inside the view modal */}
      <AddExtraChargeModal
        isOpen={showAddExtra}
        onClose={() => setShowAddExtra(false)}
        paystubId={paystub.id}
        userId={userId}
        onAdded={handleItemAdded}
      />
      <AddExistingExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        paystubId={paystub.id}
        teamMemberId={paystub.teamMemberId}
        onAdded={handleItemAdded}
      />
      <AddReceiptToPaystubModal
        isOpen={showAddReceipt}
        onClose={() => setShowAddReceipt(false)}
        paystubId={paystub.id}
        userId={userId}
        onAdded={handleItemAdded}
      />
      <ConvertToExpenseModal
        isOpen={!!convertingItem}
        onClose={() => setConvertingItem(null)}
        paystubId={paystub.id}
        item={convertingItem}
        userId={userId}
        onConverted={handleItemConverted}
      />
      <DeletePaystubModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        paystub={paystub}
        onDeleted={() => {
          if (onDeleted) onDeleted()
          onClose()
        }}
      />
      <SendPaystubModal
        isOpen={showSend}
        onClose={() => setShowSend(false)}
        paystub={paystub}
        pmEmail={pmEmail}
        onSent={handleSent}
      />
    </>
  )
}

export default ViewPaystubModal
