'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import {
  getCleanerInvoices,
  getInvoiceSummary,
  approveInvoice,
  rejectInvoice,
  markInvoicePaid,
  generateInvoicePDF,
  getInvoiceFiles,
  downloadInvoiceFile,
} from '@/services/cleanerInvoiceService'
import type {
  CleanerInvoice,
  InvoiceSummary,
  InvoiceStatus,
} from '@/services/types/cleanerInvoice'
import ViewInvoiceModal from '@/components/cleaner-invoice/view/ViewInvoiceModal'

const statusConfig: Record<InvoiceStatus, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
}

const STATUS_FILTERS: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
]

export default function PMInvoicesPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    }>
      <PMInvoicesContent />
    </Suspense>
  )
}

function PMInvoicesContent() {
  usePermissionGuard('cleaners')
  const { effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const searchParams = useSearchParams()

  const [invoices, setInvoices] = useState<CleanerInvoice[]>([])
  const [summary, setSummary] = useState<InvoiceSummary | null>(null)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  // Inline reject state (for table row reject action)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  // Track which invoices have current PDF files (keyed by invoice ID)
  const [invoicePDFs, setInvoicePDFs] = useState<Map<string, { fileId: string; filePath: string }>>(new Map())

  const fetchData = useCallback(async () => {
    if (!effectiveUserId) return

    setLoading(true)
    setError(null)
    try {
      const [invoicesRes, summaryRes] = await Promise.all([
        getCleanerInvoices(),
        getInvoiceSummary(),
      ])
      if (invoicesRes.status === 'success') setInvoices(invoicesRes.data)
      if (summaryRes.status === 'success') setSummary(summaryRes.data)
    } catch (err) {
      console.error('Error fetching invoices:', err)
      setError(err instanceof Error ? err.message : 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Deep-link support: ?invoiceId=xxx
  useEffect(() => {
    const invoiceId = searchParams.get('invoiceId')
    if (invoiceId && !loading && invoices.length > 0) {
      setSelectedInvoiceId(invoiceId)
      setShowViewModal(true)
    }
  }, [searchParams, loading, invoices])

  const filteredInvoices = invoices
    .filter((inv) => statusFilter === 'all' || inv.status === statusFilter)
    .filter((inv) => {
      if (!searchTerm) return true
      const s = searchTerm.toLowerCase()
      return (
        inv.invoiceNumber.toLowerCase().includes(s) ||
        inv.cleanerName?.toLowerCase().includes(s)
      )
    })

  const handleApprove = async (invoice: CleanerInvoice) => {
    try {
      const res = await approveInvoice(invoice.id)
      if (res.status === 'success') {
        showNotification(`Invoice ${invoice.invoiceNumber} approved`, 'success')
        fetchData()
      } else {
        showNotification(res.message || 'Failed to approve', 'error')
      }
    } catch (err) {
      showNotification('Error approving invoice', 'error')
    }
  }

  const handleReject = async (invoiceId: string) => {
    if (!rejectNotes.trim()) {
      showNotification('Please provide a reason for rejection', 'error')
      return
    }
    try {
      const res = await rejectInvoice(invoiceId, rejectNotes)
      if (res.status === 'success') {
        showNotification('Invoice rejected', 'success')
        setRejectingId(null)
        setRejectNotes('')
        fetchData()
      } else {
        showNotification(res.message || 'Failed to reject', 'error')
      }
    } catch (err) {
      showNotification('Error rejecting invoice', 'error')
    }
  }

  const handleMarkPaid = async (invoice: CleanerInvoice) => {
    try {
      const res = await markInvoicePaid(invoice.id)
      if (res.status === 'success') {
        showNotification(`Invoice ${invoice.invoiceNumber} marked as paid`, 'success')
        fetchData()
      } else {
        showNotification(res.message || 'Failed to mark as paid', 'error')
      }
    } catch (err) {
      showNotification('Error marking invoice as paid', 'error')
    }
  }

  // Fetch PDF file status for all loaded invoices
  useEffect(() => {
    if (invoices.length === 0) return
    const fetchPDFs = async () => {
      const pdfMap = new Map<string, { fileId: string; filePath: string }>()
      await Promise.all(invoices.map(async (inv) => {
        try {
          const res = await getInvoiceFiles(inv.id)
          if (res.status === 'success') {
            const current = res.data.find(f => f.isCurrent)
            if (current) pdfMap.set(inv.id, { fileId: current.id, filePath: current.filePath })
          }
        } catch {}
      }))
      setInvoicePDFs(pdfMap)
    }
    fetchPDFs()
  }, [invoices])

  const handleGeneratePDF = async (invoice: CleanerInvoice) => {
    try {
      const res = await generateInvoicePDF(invoice.id)
      if (res.status === 'success' && res.data?.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
        showNotification(`PDF generated for ${invoice.invoiceNumber}`, 'success')
        // Update local PDF map
        if (res.data.fileId) {
          setInvoicePDFs(prev => {
            const next = new Map(prev)
            next.set(invoice.id, { fileId: res.data!.fileId, filePath: '' })
            return next
          })
        }
      } else {
        showNotification(res.message || 'Failed to generate PDF', 'error')
      }
    } catch (err) {
      showNotification('Error generating PDF', 'error')
    }
  }

  const handlePreviewPDF = async (invoice: CleanerInvoice) => {
    const pdf = invoicePDFs.get(invoice.id)
    if (!pdf) return
    try {
      const res = await downloadInvoiceFile(invoice.id, pdf.fileId)
      if (res.status === 'success' && res.data?.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
      } else {
        showNotification('Failed to preview PDF', 'error')
      }
    } catch { showNotification('Error previewing PDF', 'error') }
  }

  const handleDownloadPDF = async (invoice: CleanerInvoice) => {
    const pdf = invoicePDFs.get(invoice.id)
    if (!pdf) return
    try {
      const res = await downloadInvoiceFile(invoice.id, pdf.fileId)
      if (res.status === 'success' && res.data?.signedUrl) {
        const response = await fetch(res.data.signedUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = res.data.fileName || `${invoice.invoiceNumber}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        showNotification('Failed to download PDF', 'error')
      }
    } catch { showNotification('Error downloading PDF', 'error') }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr.split('T')[0] + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start.split('T')[0] + 'T00:00:00')
    const e = new Date(end.split('T')[0] + 'T00:00:00')
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Cleaner Invoices</h1>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4">
          <ExclamationCircleIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Error loading invoices</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cleaner Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage invoices from your cleaners</p>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="Pending" count={summary.pending} amount={summary.pendingTotal} icon={ClockIcon} color="amber" />
          <SummaryCard label="Approved" count={summary.approved} amount={summary.approvedTotal} icon={CheckCircleIcon} color="blue" />
          <SummaryCard label="Paid" count={summary.paid} amount={summary.paidTotal} icon={CurrencyDollarIcon} color="green" />
          <SummaryCard label="Total" count={summary.total} amount={null} icon={BanknotesIcon} color="gray" />
        </div>
      )}

      {/* Pending Review Banner */}
      {invoices.filter(i => i.status === 'pending').length > 0 && (() => {
        const pendingInvs = invoices.filter(i => i.status === 'pending')
        const pendingTotal = pendingInvs.reduce((sum, inv) => sum + inv.total, 0)
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ClockIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {pendingInvs.length} invoice{pendingInvs.length !== 1 ? 's' : ''} awaiting your review
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  ${pendingTotal.toFixed(2)} total — review and approve or reject
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('pending')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              Review Now
            </button>
          </motion.div>
        )
      })()}

      {/* Approved Ready to Pay Banner */}
      {invoices.filter(i => i.status === 'approved').length > 0 && (() => {
        const approvedInvs = invoices.filter(i => i.status === 'approved')
        const approvedTotal = approvedInvs.reduce((sum, inv) => sum + inv.total, 0)
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  {approvedInvs.length} approved invoice{approvedInvs.length !== 1 ? 's' : ''} ready to be paid
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  ${approvedTotal.toFixed(2)} total — mark as paid when payment is sent
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('approved')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              View Approved
            </button>
          </motion.div>
        )
      })()}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
              {filter.value !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  {invoices.filter(i => i.status === filter.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice # or cleaner..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      {filteredInvoices.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cleaner</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">PDF</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status]
                  const hasPDF = invoicePDFs.has(invoice.id)
                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => { setSelectedInvoiceId(invoice.id); setShowViewModal(true) }}
                      className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedInvoiceId(invoice.id); setShowViewModal(true) }}
                          className="text-base font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {invoice.invoiceNumber}
                        </button>
                        <p className="text-sm text-gray-400 mt-0.5">{formatDate(invoice.createdAt)}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-base font-medium text-gray-900">{invoice.cleanerName || '—'}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-base text-gray-700">{formatPeriod(invoice.periodStart, invoice.periodEnd)}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-base text-gray-600">{invoice.itemCount ?? 0}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-lg font-bold text-gray-900">${invoice.total.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${status.bg} ${status.text}`}>
                          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      {/* PDF Column */}
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-center">
                          {hasPDF ? (
                            <>
                              <button
                                onClick={() => handlePreviewPDF(invoice)}
                                className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Preview PDF"
                              >
                                <EyeIcon className="h-5 w-5 text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(invoice)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                title="Download PDF"
                              >
                                <ArrowDownTrayIcon className="h-5 w-5 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleGeneratePDF(invoice)}
                                className="p-2 rounded-lg hover:bg-amber-100 transition-colors"
                                title="Regenerate PDF"
                              >
                                <ArrowPathIcon className="h-5 w-5 text-amber-600" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleGeneratePDF(invoice)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <DocumentArrowDownIcon className="h-5 w-5" />
                              Generate
                            </button>
                          )}
                        </div>
                      </td>
                      {/* Actions Column */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setSelectedInvoiceId(invoice.id); setShowViewModal(true) }}
                            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5 text-gray-500" />
                          </button>
                          {invoice.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(invoice)}
                                className="p-2.5 rounded-xl hover:bg-green-100 transition-colors"
                                title="Approve"
                              >
                                <CheckIcon className="h-5 w-5 text-green-600" />
                              </button>
                              <button
                                onClick={() => { setRejectingId(rejectingId === invoice.id ? null : invoice.id); setRejectNotes('') }}
                                className="p-2.5 rounded-xl hover:bg-red-100 transition-colors"
                                title="Reject"
                              >
                                <XMarkIcon className="h-5 w-5 text-red-500" />
                              </button>
                            </>
                          )}
                          {invoice.status === 'approved' && (
                            <button
                              onClick={() => handleMarkPaid(invoice)}
                              className="p-2.5 rounded-xl hover:bg-emerald-100 transition-colors"
                              title="Mark Paid"
                            >
                              <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
                            </button>
                          )}
                        </div>
                        {/* Inline reject notes */}
                        {rejectingId === invoice.id && (
                          <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={rejectNotes}
                              onChange={(e) => setRejectNotes(e.target.value)}
                              placeholder="Reason for rejection..."
                              className="flex-1 px-2 py-1 text-xs border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                              onKeyDown={(e) => e.key === 'Enter' && handleReject(invoice.id)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleReject(invoice.id)}
                              className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{filteredInvoices.length}</span> of{' '}
              <span className="font-medium">{invoices.length}</span> invoices
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <BanknotesIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">
            {invoices.length > 0 ? 'No invoices match your filters' : 'No invoices yet'}
          </h3>
          <p className="text-gray-500 text-sm">
            {invoices.length > 0 ? 'Try adjusting your search or status filter' : 'Invoices submitted by your cleaners will appear here'}
          </p>
        </div>
      )}

      {/* View Invoice Modal */}
      {selectedInvoiceId && (
        <ViewInvoiceModal
          isOpen={showViewModal}
          onClose={() => { setShowViewModal(false); setSelectedInvoiceId(null) }}
          invoiceId={selectedInvoiceId}
          onUpdated={fetchData}
          role="pm"
        />
      )}
    </div>
  )
}

function SummaryCard({
  label, count, amount, icon: Icon, color,
}: {
  label: string; count: number; amount: number | null
  icon: React.ComponentType<{ className?: string }>; color: 'amber' | 'blue' | 'green' | 'gray'
}) {
  const colors = {
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    green: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    gray: { bg: 'bg-gray-100', icon: 'text-gray-600' },
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${colors[color].bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${colors[color].icon}`} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{count}</p>
          {amount !== null && amount > 0 && (
            <p className="text-xs text-gray-400">${amount.toFixed(2)}</p>
          )}
        </div>
      </div>
    </div>
  )
}
