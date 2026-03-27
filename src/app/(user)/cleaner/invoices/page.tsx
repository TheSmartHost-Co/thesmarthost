'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  BanknotesIcon,
  PlusIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PaperAirplaneIcon,
  EyeIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { ArrowRightIcon } from '@heroicons/react/24/solid'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getCleanerByAuthUserId } from '@/services/cleanerService'
import {
  getCleanerInvoices,
  getInvoiceSummary,
  getAvailableProjects,
  submitInvoice,
  deleteInvoice,
  generateInvoicePDF,
} from '@/services/cleanerInvoiceService'
import type { Cleaner } from '@/services/types/cleaner'
import type {
  CleanerInvoice,
  InvoiceSummary,
  InvoiceStatus,
  INVOICE_STATUS_INFO,
} from '@/services/types/cleanerInvoice'
import CreateInvoiceModal from '@/components/cleaner-invoice/create/CreateInvoiceModal'
import ViewInvoiceModal from '@/components/cleaner-invoice/view/ViewInvoiceModal'

const STATUS_FILTERS: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
]

const statusConfig: Record<InvoiceStatus, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  archived: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

export default function CleanerInvoicesPage() {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [invoices, setInvoices] = useState<CleanerInvoice[]>([])
  const [summary, setSummary] = useState<InvoiceSummary | null>(null)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [uninvoicedCount, setUninvoicedCount] = useState(0)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<CleanerInvoice | null>(null)

  const fetchData = useCallback(async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      const cleanerRes = await getCleanerByAuthUserId(profile.id)
      if (cleanerRes.status !== 'success' || !cleanerRes.data) {
        throw new Error(cleanerRes.message || 'Could not find your cleaner profile')
      }
      setCleaner(cleanerRes.data)

      const [invoicesRes, summaryRes, availableRes] = await Promise.all([
        getCleanerInvoices(cleanerRes.data.id),
        getInvoiceSummary(cleanerRes.data.id),
        getAvailableProjects(cleanerRes.data.id),
      ])

      if (invoicesRes.status === 'success') setInvoices(invoicesRes.data)
      if (summaryRes.status === 'success') setSummary(summaryRes.data)
      if (availableRes.status === 'success') setUninvoicedCount(availableRes.data.length)
    } catch (err) {
      console.error('Error fetching invoices:', err)
      setError(err instanceof Error ? err.message : 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredInvoices = statusFilter === 'all'
    ? invoices
    : invoices.filter((inv) => inv.status === statusFilter)

  const draftInvoices = invoices.filter((inv) => inv.status === 'draft')

  const handleViewInvoice = (invoice: CleanerInvoice) => {
    setSelectedInvoice(invoice)
    setShowViewModal(true)
  }

  const handleSubmitInvoice = async (invoice: CleanerInvoice) => {
    setSubmittingId(invoice.id)
    try {
      const res = await submitInvoice(invoice.id)
      if (res.status === 'success') {
        showNotification('Invoice submitted to property manager', 'success')
        fetchData()
      } else {
        showNotification(res.message || 'Failed to submit invoice', 'error')
      }
    } catch (err) {
      console.error('Error submitting invoice:', err)
      showNotification('Error submitting invoice', 'error')
    } finally {
      setSubmittingId(null)
    }
  }

  const handleDeleteInvoice = async (invoice: CleanerInvoice) => {
    if (!confirm(`Delete invoice ${invoice.invoiceNumber}?`)) return

    try {
      const res = await deleteInvoice(invoice.id)
      if (res.status === 'success') {
        showNotification('Invoice deleted', 'success')
        fetchData()
      } else {
        showNotification(res.message || 'Failed to delete invoice', 'error')
      }
    } catch (err) {
      console.error('Error deleting invoice:', err)
      showNotification('Error deleting invoice', 'error')
    }
  }

  const handleGeneratePDF = async (invoice: CleanerInvoice) => {
    try {
      const res = await generateInvoicePDF(invoice.id)
      if (res.status === 'success' && res.data?.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
        showNotification(`PDF generated for ${invoice.invoiceNumber}`, 'success')
      } else {
        showNotification(res.message || 'Failed to generate PDF', 'error')
      }
    } catch (err) {
      showNotification('Error generating PDF', 'error')
    }
  }

  const handleInvoiceCreated = () => {
    fetchData()
  }

  const handleInvoiceUpdated = () => {
    fetchData()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr.split('T')[0] + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start.split('T')[0] + 'T00:00:00')
    const e = new Date(end.split('T')[0] + 'T00:00:00')
    const sameYear = s.getFullYear() === e.getFullYear()
    const startStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
    const endStr = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startStr} – ${endStr}`
  }

  // Loading
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-48 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Invoices</h1>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading invoices</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5">Generate and manage your cleaning invoices</p>
        </div>
        <motion.button
          onClick={() => setShowCreateModal(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transition-colors cursor-pointer"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Generate Invoice</span>
          <span className="sm:hidden">New</span>
        </motion.button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 sm:mb-6">
          <SummaryCard
            label="Draft"
            count={summary.draft}
            amount={null}
            icon={DocumentTextIcon}
            color="gray"
            index={0}
          />
          <SummaryCard
            label="Pending"
            count={summary.pending}
            amount={summary.pendingTotal}
            icon={ClockIcon}
            color="amber"
            index={1}
          />
          <SummaryCard
            label="Approved"
            count={summary.approved}
            amount={summary.approvedTotal}
            icon={CheckCircleIcon}
            color="blue"
            index={2}
          />
          <SummaryCard
            label="Paid"
            count={summary.paid}
            amount={summary.paidTotal}
            icon={CurrencyDollarIcon}
            color="green"
            index={3}
          />
        </div>
      )}

      {/* Cash Out Button */}
      {(invoices.length > 0 || (summary && (summary.draft + summary.pending + summary.approved + summary.paid) > 0)) && (
        <div className="flex flex-col items-center gap-2 mb-5 sm:mb-6">
          <motion.button
            onClick={() => setShowCreateModal(true)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl text-lg font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all cursor-pointer active:shadow-md"
          >
            <CurrencyDollarIcon className="h-7 w-7" />
            Cash Out
            <ArrowRightIcon className="h-5 w-5 opacity-70" />
          </motion.button>
          {uninvoicedCount > 0 && (
            <p className="text-sm font-medium text-emerald-600">
              {uninvoicedCount} completed project{uninvoicedCount !== 1 ? 's' : ''} not yet invoiced
            </p>
          )}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
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

      {/* Draft Invoices Reminder */}
      {draftInvoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <PaperAirplaneIcon className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {draftInvoices.length} draft invoice{draftInvoices.length !== 1 ? 's' : ''} ready to send
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Submit to your property manager for approval</p>
            </div>
          </div>
          {draftInvoices.length === 1 && (
            <button
              onClick={() => handleSubmitInvoice(draftInvoices[0])}
              disabled={submittingId === draftInvoices[0].id}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              {submittingId === draftInvoices[0].id ? 'Sending...' : 'Send Now'}
            </button>
          )}
        </motion.div>
      )}

      {/* Invoice List */}
      {filteredInvoices.length > 0 ? (
        <div className="space-y-3">
          {filteredInvoices.map((invoice, index) => {
            const status = statusConfig[invoice.status]
            const isEditable = invoice.status === 'draft' || invoice.status === 'rejected'

            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewInvoice(invoice)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="text-sm font-bold text-gray-900">{invoice.invoiceNumber}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{formatPeriod(invoice.periodStart, invoice.periodEnd)}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400">
                        {invoice.itemCount ?? 0} items
                      </span>
                      <span className="text-xs text-gray-400">
                        Created {formatDate(invoice.createdAt)}
                      </span>
                      {invoice.status === 'rejected' && invoice.pmNotes && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">${invoice.total.toFixed(2)}</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="View"
                      >
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleGeneratePDF(invoice)}
                        className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Generate PDF"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4 text-blue-500" />
                      </button>
                      {isEditable && (
                        <>
                          <button
                            onClick={() => handleSubmitInvoice(invoice)}
                            className="p-2 rounded-lg hover:bg-emerald-100 transition-colors"
                            title="Submit to PM"
                          >
                            <PaperAirplaneIcon className="h-4 w-4 text-emerald-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(invoice)}
                            className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Send to PM CTA for draft invoices */}
                {invoice.status === 'draft' && (
                  <div className="mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleSubmitInvoice(invoice)}
                      disabled={submittingId === invoice.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-xl text-sm font-semibold hover:from-amber-500 hover:to-amber-600 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      {submittingId === invoice.id ? 'Sending...' : 'Send to Property Manager'}
                    </button>
                  </div>
                )}

                {/* Resubmit CTA for rejected invoices */}
                {invoice.status === 'rejected' && (
                  <div className="mt-3 pt-3 border-t border-red-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleSubmitInvoice(invoice)}
                      disabled={submittingId === invoice.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-xl text-sm font-semibold hover:from-amber-500 hover:to-amber-600 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      {submittingId === invoice.id ? 'Sending...' : 'Resubmit to Property Manager'}
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      ) : invoices.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center"
        >
          <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No invoices with this status</h3>
          <p className="text-gray-500 text-sm">Try a different filter</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BanknotesIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No invoices yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-4">
            Generate your first invoice from completed cleaning projects to get started.
          </p>
          {uninvoicedCount > 0 && (
            <p className="text-sm font-medium text-emerald-600 mb-4">
              {uninvoicedCount} completed project{uninvoicedCount !== 1 ? 's' : ''} ready to invoice
            </p>
          )}
          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Generate Your First Invoice
          </motion.button>
        </motion.div>
      )}

      {/* Modals */}
      {cleaner && (
        <CreateInvoiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          cleaner={cleaner}
          onCreated={(invoice) => {
            handleInvoiceCreated()
            setShowCreateModal(false)
            setSelectedInvoice(invoice)
            setShowViewModal(true)
          }}
        />
      )}

      {selectedInvoice && (
        <ViewInvoiceModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false)
            setSelectedInvoice(null)
          }}
          invoiceId={selectedInvoice.id}
          onUpdated={handleInvoiceUpdated}
        />
      )}
    </div>
  )
}

// Summary Card Component
function SummaryCard({
  label,
  count,
  amount,
  icon: Icon,
  color,
  index,
}: {
  label: string
  count: number
  amount: number | null
  icon: React.ComponentType<{ className?: string }>
  color: 'gray' | 'amber' | 'blue' | 'green'
  index: number
}) {
  const colorMap = {
    gray: { bg: 'bg-gray-100', icon: 'text-gray-600' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    green: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 ${colorMap[color].bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${colorMap[color].icon}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{count}</p>
          {amount !== null && amount > 0 && (
            <p className="text-xs text-gray-400">${amount.toFixed(2)}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
