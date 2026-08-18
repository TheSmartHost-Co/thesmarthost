'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  TrashIcon,
  PlusIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getCleanerInvoices,
  getInvoiceSummary,
  changeInvoiceStatus,
  generateInvoicePDF,
  getInvoiceFiles,
  downloadInvoiceFile,
} from '@/services/cleanerInvoiceService'
import type {
  CleanerInvoice,
  InvoiceSummary,
  InvoiceStatus,
} from '@/services/types/cleanerInvoice'
import { INVOICE_STATUS_INFO } from '@/services/types/cleanerInvoice'
import ViewInvoiceModal from '@/components/cleaner-invoice/view/ViewInvoiceModal'
import DeleteInvoiceModal from '@/components/cleaner-invoice/delete/DeleteInvoiceModal'
import CreateInvoiceModal from '@/components/cleaner-invoice/create/CreateInvoiceModal'
import Modal from '@/components/shared/modal'
import TableActionsDropdown from '@/components/shared/TableActionsDropdown'
import type { ActionItem } from '@/components/shared/TableActionsDropdown'
import { getCleaners } from '@/services/cleanerService'
import type { Cleaner } from '@/services/types/cleaner'
import * as contractorInvoiceService from '@/services/contractorInvoiceService'
import type {
  ContractorInvoice,
  ContractorInvoiceSummary,
  ContractorInvoiceStatus,
} from '@/services/types/contractorInvoice'
import { CONTRACTOR_INVOICE_STATUS_INFO } from '@/services/types/contractorInvoice'
import ViewContractorInvoiceModal from '@/components/contractor-invoice/view/ViewContractorInvoiceModal'
import DeleteContractorInvoiceModal from '@/components/contractor-invoice/delete/DeleteContractorInvoiceModal'
import CreateContractorInvoiceModal from '@/components/contractor-invoice/create/CreateContractorInvoiceModal'
import { getContractors } from '@/services/contractorService'
import type { Contractor } from '@/services/types/contractor'

type PayeeType = 'cleaner' | 'contractor'

const statusConfig: Record<InvoiceStatus, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  archived: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

const STATUS_FILTERS: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
  { value: 'archived', label: 'Archived' },
]

// Map statuses to icons for the dropdown
const STATUS_ICONS: Record<InvoiceStatus, React.ComponentType<{ className?: string }>> = {
  draft: ClockIcon,
  pending: ClockIcon,
  approved: CheckCircleIcon,
  rejected: ExclamationCircleIcon,
  paid: CurrencyDollarIcon,
  archived: ArchiveBoxIcon,
}

// Avatar color palette for cleaner picker rows — keyed by cleaner.id hash for stable hues
const AVATAR_PALETTE = [
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-blue-100',    text: 'text-blue-700' },
  { bg: 'bg-amber-100',   text: 'text-amber-700' },
  { bg: 'bg-rose-100',    text: 'text-rose-700' },
  { bg: 'bg-purple-100',  text: 'text-purple-700' },
  { bg: 'bg-cyan-100',    text: 'text-cyan-700' },
] as const

function getAvatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function getInitial(person: { name?: string | null; email?: string | null }) {
  const source = (person.name || person.email || '?').trim()
  return source.charAt(0).toUpperCase() || '?'
}

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
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // URL-synced payee tab: ?payee=contractor (defaults to cleaner)
  const payeeType: PayeeType = searchParams.get('payee') === 'contractor' ? 'contractor' : 'cleaner'

  const setPayeeType = (payee: PayeeType) => {
    if (payee === payeeType) return
    const params = new URLSearchParams(searchParams.toString())
    if (payee === 'contractor') params.set('payee', 'contractor')
    else params.delete('payee')
    // Drop any invoice deep-link when switching payee — ids are payee-specific
    params.delete('invoiceId')
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  return (
    <>
      {/* Payee segmented control */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl">
          {([
            { value: 'cleaner' as const, label: 'Cleaners' },
            { value: 'contractor' as const, label: 'Contractors' },
          ]).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPayeeType(tab.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                payeeType === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {payeeType === 'cleaner' ? <CleanerInvoicesTab /> : <ContractorInvoicesTab />}
    </>
  )
}

function CleanerInvoicesTab() {
  const { t } = useTranslation('turnover')
  usePermissionGuard('invoices')
  const { effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const searchParams = useSearchParams()

  const [invoices, setInvoices] = useState<CleanerInvoice[]>([])
  const [summary, setSummary] = useState<InvoiceSummary | null>(null)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [includeArchived, setIncludeArchived] = useState(false)

  // Modal state
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CleanerInvoice | null>(null)

  // Create-on-behalf flow state
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [showCleanerPicker, setShowCleanerPicker] = useState(false)
  const [pickedCleanerId, setPickedCleanerId] = useState<string | null>(null)
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [cleanerSearch, setCleanerSearch] = useState('')

  const visibleCleaners = useMemo(() => {
    const q = cleanerSearch.trim().toLowerCase()
    if (!q) return cleaners
    return cleaners.filter((c) =>
      (c.name?.toLowerCase().includes(q)) ||
      (c.email?.toLowerCase().includes(q))
    )
  }, [cleaners, cleanerSearch])

  const closeCleanerPicker = useCallback(() => {
    setShowCleanerPicker(false)
    setPickedCleanerId(null)
    setCleanerSearch('')
  }, [])

  const confirmCleanerPick = useCallback((cleanerId: string | null) => {
    const id = cleanerId || pickedCleanerId
    if (!id) return
    const c = cleaners.find((x) => x.id === id)
    if (!c) return
    setSelectedCleaner(c)
    setShowCleanerPicker(false)
    setShowCreateInvoiceModal(true)
    setCleanerSearch('')
  }, [cleaners, pickedCleanerId])

  // Track which invoices have current PDF files (keyed by invoice ID)
  const [invoicePDFs, setInvoicePDFs] = useState<Map<string, { fileId: string; filePath: string }>>(new Map())

  const fetchData = useCallback(async () => {
    if (!effectiveUserId) return

    setLoading(true)
    setError(null)
    try {
      const [invoicesRes, summaryRes] = await Promise.all([
        getCleanerInvoices(undefined, undefined, includeArchived),
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
  }, [effectiveUserId, includeArchived])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch cleaners for the create-on-behalf picker
  useEffect(() => {
    if (!effectiveUserId) return
    getCleaners(effectiveUserId).then((res) => {
      if (res.status === 'success') setCleaners(res.data)
    }).catch(() => { /* non-fatal: picker just won't have options */ })
  }, [effectiveUserId])

  // Auto-enable includeArchived when filtering by archived
  useEffect(() => {
    if (statusFilter === 'archived' && !includeArchived) {
      setIncludeArchived(true)
    }
  }, [statusFilter, includeArchived])

  // Deep-link support: ?invoiceId=xxx
  useEffect(() => {
    const invoiceId = searchParams.get('invoiceId')
    if (invoiceId && !loading && invoices.length > 0) {
      setSelectedInvoiceId(invoiceId)
      setShowViewModal(true)
    }
  }, [searchParams, loading, invoices])

  const filteredInvoices = invoices
    .filter((inv) => {
      if (statusFilter === 'all') {
        // When showing "all" without archived toggle, hide archived
        return includeArchived || inv.status !== 'archived'
      }
      return inv.status === statusFilter
    })
    .filter((inv) => {
      if (!searchTerm) return true
      const s = searchTerm.toLowerCase()
      return (
        inv.invoiceNumber.toLowerCase().includes(s) ||
        inv.cleanerName?.toLowerCase().includes(s)
      )
    })

  const handleChangeStatus = async (invoice: CleanerInvoice, newStatus: InvoiceStatus) => {
    try {
      const res = await changeInvoiceStatus(invoice.id, newStatus)
      if (res.status === 'success') {
        showNotification(`Invoice ${invoice.invoiceNumber} set to ${INVOICE_STATUS_INFO[newStatus].label}`, 'success')
        fetchData()
      } else {
        showNotification(res.message || 'Failed to change status', 'error')
      }
    } catch {
      showNotification('Error changing invoice status', 'error')
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
    } catch {
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

  const buildActions = (invoice: CleanerInvoice): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: 'View',
        icon: EyeIcon,
        onClick: () => { setSelectedInvoiceId(invoice.id); setShowViewModal(true) },
      },
    ]

    // Status change options: all statuses except current
    const allStatuses: InvoiceStatus[] = ['draft', 'pending', 'approved', 'rejected', 'paid', 'archived']
    for (const s of allStatuses) {
      if (s === invoice.status) continue
      actions.push({
        label: `Set ${INVOICE_STATUS_INFO[s].label}`,
        icon: STATUS_ICONS[s],
        onClick: () => handleChangeStatus(invoice, s),
      })
    }

    actions.push({
      label: 'Delete',
      icon: TrashIcon,
      onClick: () => { setDeleteTarget(invoice); setShowDeleteModal(true) },
      variant: 'danger',
    })

    return actions
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('invoicesTitle')}</h1>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4">
          <ExclamationCircleIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">{t('errorLoadingInvoices')}</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('invoicesTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('invoicesSubtitle')}</p>
        </div>
        <button
          onClick={() => setShowCleanerPicker(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transition-colors cursor-pointer whitespace-nowrap"
        >
          <PlusIcon className="h-5 w-5" />
          New Invoice
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <SummaryCard label="Pending" count={summary.pending} amount={summary.pendingTotal} icon={ClockIcon} color="amber" />
          <SummaryCard label="Approved" count={summary.approved} amount={summary.approvedTotal} icon={CheckCircleIcon} color="blue" />
          <SummaryCard label="Paid" count={summary.paid} amount={summary.paidTotal} icon={CurrencyDollarIcon} color="green" />
          <SummaryCard label="Archived" count={summary.archived ?? 0} amount={null} icon={ArchiveBoxIcon} color="slate" />
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
        <div className="flex gap-2 overflow-x-auto items-center">
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
          {/* Show Archived toggle */}
          {statusFilter !== 'archived' && (
            <label className="flex items-center gap-1.5 ml-2 text-xs text-gray-500 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded border-gray-300 text-gray-600 focus:ring-gray-500 h-3.5 w-3.5"
              />
              Show Archived
            </label>
          )}
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
                  const isArchived = invoice.status === 'archived'
                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => { setSelectedInvoiceId(invoice.id); setShowViewModal(true) }}
                      className={`hover:bg-blue-50/50 transition-colors group cursor-pointer ${isArchived ? 'opacity-60' : ''}`}
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
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end">
                          <TableActionsDropdown
                            actions={buildActions(invoice)}
                            itemId={invoice.id}
                          />
                        </div>
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

      {/* Delete Invoice Modal */}
      {deleteTarget && (
        <DeleteInvoiceModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setDeleteTarget(null) }}
          invoice={deleteTarget}
          onDeleted={fetchData}
        />
      )}

      {/* Cleaner Picker — Step 1 of create-on-behalf */}
      <Modal
        isOpen={showCleanerPicker}
        onClose={closeCleanerPicker}
        style="max-w-2xl !w-11/12"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-6 pb-4 border-b border-gray-100 pr-12">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BanknotesIcon className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">Create Invoice for Cleaner</h2>
            <p className="text-sm text-gray-500 mt-0.5">Pick which cleaner this invoice is for.</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={cleanerSearch}
              onChange={(e) => setCleanerSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              autoFocus
            />
            {cleanerSearch && (
              <button
                onClick={() => setCleanerSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                title="Clear search"
              >
                <XMarkIcon className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="px-6 pb-4 overflow-y-auto" style={{ maxHeight: '24rem' }}>
          {visibleCleaners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BanknotesIcon className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-700">
                {cleaners.length === 0 ? 'No cleaners yet' : 'No matches'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {cleaners.length === 0
                  ? 'Add a cleaner to your account first.'
                  : 'Try a different name or email.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleCleaners.map((c) => {
                const selected = pickedCleanerId === c.id
                const colors = getAvatarColor(c.id)
                const hasEmail = !!c.email && c.email !== c.name
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPickedCleanerId(c.id)}
                    onDoubleClick={() => confirmCleanerPick(c.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      selected
                        ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center font-semibold text-sm flex-shrink-0`}>
                      {getInitial(c)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.name || c.email || 'Unnamed cleaner'}
                      </p>
                      {hasEmail && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{c.email}</p>
                      )}
                    </div>
                    {selected && (
                      <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {cleanerSearch.trim()
              ? `${visibleCleaners.length} of ${cleaners.length} cleaners`
              : `${cleaners.length} ${cleaners.length === 1 ? 'cleaner' : 'cleaners'}`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={closeCleanerPicker}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={!pickedCleanerId}
              onClick={() => confirmCleanerPick(null)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Continue
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Invoice Modal — Step 2 of create-on-behalf */}
      {selectedCleaner && (
        <CreateInvoiceModal
          isOpen={showCreateInvoiceModal}
          onClose={() => {
            setShowCreateInvoiceModal(false)
            setSelectedCleaner(null)
            setPickedCleanerId(null)
          }}
          cleaner={selectedCleaner}
          onCreated={(invoice) => {
            setShowCreateInvoiceModal(false)
            setSelectedCleaner(null)
            setPickedCleanerId(null)
            fetchData()
            setSelectedInvoiceId(invoice.id)
            setShowViewModal(true)
          }}
        />
      )}
    </div>
  )
}

function ContractorInvoicesTab() {
  const { t } = useTranslation('turnover')
  usePermissionGuard('invoices')
  const { effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const searchParams = useSearchParams()

  const [invoices, setInvoices] = useState<ContractorInvoice[]>([])
  const [summary, setSummary] = useState<ContractorInvoiceSummary | null>(null)
  const [statusFilter, setStatusFilter] = useState<ContractorInvoiceStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [includeArchived, setIncludeArchived] = useState(false)

  // Modal state
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ContractorInvoice | null>(null)

  // Create-on-behalf flow state
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [showContractorPicker, setShowContractorPicker] = useState(false)
  const [pickedContractorId, setPickedContractorId] = useState<string | null>(null)
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [contractorSearch, setContractorSearch] = useState('')

  const visibleContractors = useMemo(() => {
    const q = contractorSearch.trim().toLowerCase()
    if (!q) return contractors
    return contractors.filter((c) =>
      (c.name?.toLowerCase().includes(q)) ||
      (c.email?.toLowerCase().includes(q))
    )
  }, [contractors, contractorSearch])

  const closeContractorPicker = useCallback(() => {
    setShowContractorPicker(false)
    setPickedContractorId(null)
    setContractorSearch('')
  }, [])

  const confirmContractorPick = useCallback((contractorId: string | null) => {
    const id = contractorId || pickedContractorId
    if (!id) return
    const c = contractors.find((x) => x.id === id)
    if (!c) return
    setSelectedContractor(c)
    setShowContractorPicker(false)
    setShowCreateInvoiceModal(true)
    setContractorSearch('')
  }, [contractors, pickedContractorId])

  // Track which invoices have current PDF files (keyed by invoice ID)
  const [invoicePDFs, setInvoicePDFs] = useState<Map<string, { fileId: string; filePath: string }>>(new Map())

  const fetchData = useCallback(async () => {
    if (!effectiveUserId) return

    setLoading(true)
    setError(null)
    try {
      const [invoicesRes, summaryRes] = await Promise.all([
        contractorInvoiceService.getContractorInvoices(undefined, undefined, includeArchived),
        contractorInvoiceService.getInvoiceSummary(),
      ])
      if (invoicesRes.status === 'success') setInvoices(invoicesRes.data)
      if (summaryRes.status === 'success') setSummary(summaryRes.data)
    } catch (err) {
      console.error('Error fetching invoices:', err)
      setError(err instanceof Error ? err.message : 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId, includeArchived])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch contractors for the create-on-behalf picker
  useEffect(() => {
    if (!effectiveUserId) return
    getContractors(effectiveUserId).then((res) => {
      if (res.status === 'success') setContractors(res.data)
    }).catch(() => { /* non-fatal: picker just won't have options */ })
  }, [effectiveUserId])

  // Auto-enable includeArchived when filtering by archived
  useEffect(() => {
    if (statusFilter === 'archived' && !includeArchived) {
      setIncludeArchived(true)
    }
  }, [statusFilter, includeArchived])

  // Deep-link support: ?invoiceId=xxx
  useEffect(() => {
    const invoiceId = searchParams.get('invoiceId')
    if (invoiceId && !loading && invoices.length > 0) {
      setSelectedInvoiceId(invoiceId)
      setShowViewModal(true)
    }
  }, [searchParams, loading, invoices])

  const filteredInvoices = invoices
    .filter((inv) => {
      if (statusFilter === 'all') {
        // When showing "all" without archived toggle, hide archived
        return includeArchived || inv.status !== 'archived'
      }
      return inv.status === statusFilter
    })
    .filter((inv) => {
      if (!searchTerm) return true
      const s = searchTerm.toLowerCase()
      return (
        inv.invoiceNumber.toLowerCase().includes(s) ||
        inv.contractorName?.toLowerCase().includes(s)
      )
    })

  const handleChangeStatus = async (invoice: ContractorInvoice, newStatus: ContractorInvoiceStatus) => {
    try {
      const res = await contractorInvoiceService.changeInvoiceStatus(invoice.id, newStatus)
      if (res.status === 'success') {
        showNotification(`Invoice ${invoice.invoiceNumber} set to ${CONTRACTOR_INVOICE_STATUS_INFO[newStatus].label}`, 'success')
        fetchData()
      } else {
        showNotification(res.message || 'Failed to change status', 'error')
      }
    } catch {
      showNotification('Error changing invoice status', 'error')
    }
  }

  // Fetch PDF file status for all loaded invoices
  useEffect(() => {
    if (invoices.length === 0) return
    const fetchPDFs = async () => {
      const pdfMap = new Map<string, { fileId: string; filePath: string }>()
      await Promise.all(invoices.map(async (inv) => {
        try {
          const res = await contractorInvoiceService.getInvoiceFiles(inv.id)
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

  const handleGeneratePDF = async (invoice: ContractorInvoice) => {
    try {
      const res = await contractorInvoiceService.generateInvoicePDF(invoice.id)
      if (res.status === 'success' && res.data?.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
        showNotification(`PDF generated for ${invoice.invoiceNumber}`, 'success')
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
    } catch {
      showNotification('Error generating PDF', 'error')
    }
  }

  const handlePreviewPDF = async (invoice: ContractorInvoice) => {
    const pdf = invoicePDFs.get(invoice.id)
    if (!pdf) return
    try {
      const res = await contractorInvoiceService.downloadInvoiceFile(invoice.id, pdf.fileId)
      if (res.status === 'success' && res.data?.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
      } else {
        showNotification('Failed to preview PDF', 'error')
      }
    } catch { showNotification('Error previewing PDF', 'error') }
  }

  const handleDownloadPDF = async (invoice: ContractorInvoice) => {
    const pdf = invoicePDFs.get(invoice.id)
    if (!pdf) return
    try {
      const res = await contractorInvoiceService.downloadInvoiceFile(invoice.id, pdf.fileId)
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

  const buildActions = (invoice: ContractorInvoice): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: 'View',
        icon: EyeIcon,
        onClick: () => { setSelectedInvoiceId(invoice.id); setShowViewModal(true) },
      },
    ]

    // Status change options: all statuses except current
    const allStatuses: ContractorInvoiceStatus[] = ['draft', 'pending', 'approved', 'rejected', 'paid', 'archived']
    for (const s of allStatuses) {
      if (s === invoice.status) continue
      actions.push({
        label: `Set ${CONTRACTOR_INVOICE_STATUS_INFO[s].label}`,
        icon: STATUS_ICONS[s],
        onClick: () => handleChangeStatus(invoice, s),
      })
    }

    actions.push({
      label: 'Delete',
      icon: TrashIcon,
      onClick: () => { setDeleteTarget(invoice); setShowDeleteModal(true) },
      variant: 'danger',
    })

    return actions
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('invoicesTitle')}</h1>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4">
          <ExclamationCircleIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">{t('errorLoadingInvoices')}</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('invoicesTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage contractor invoices</p>
        </div>
        <button
          onClick={() => setShowContractorPicker(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transition-colors cursor-pointer whitespace-nowrap"
        >
          <PlusIcon className="h-5 w-5" />
          New Invoice
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <SummaryCard label="Pending" count={summary.pending} amount={summary.pendingTotal} icon={ClockIcon} color="amber" />
          <SummaryCard label="Approved" count={summary.approved} amount={summary.approvedTotal} icon={CheckCircleIcon} color="blue" />
          <SummaryCard label="Paid" count={summary.paid} amount={summary.paidTotal} icon={CurrencyDollarIcon} color="green" />
          <SummaryCard label="Archived" count={summary.archived ?? 0} amount={null} icon={ArchiveBoxIcon} color="slate" />
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
        <div className="flex gap-2 overflow-x-auto items-center">
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
          {/* Show Archived toggle */}
          {statusFilter !== 'archived' && (
            <label className="flex items-center gap-1.5 ml-2 text-xs text-gray-500 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded border-gray-300 text-gray-600 focus:ring-gray-500 h-3.5 w-3.5"
              />
              Show Archived
            </label>
          )}
        </div>
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice # or contractor..."
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contractor</th>
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
                  const isArchived = invoice.status === 'archived'
                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => { setSelectedInvoiceId(invoice.id); setShowViewModal(true) }}
                      className={`hover:bg-blue-50/50 transition-colors group cursor-pointer ${isArchived ? 'opacity-60' : ''}`}
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
                        <p className="text-base font-medium text-gray-900">{invoice.contractorName || '—'}</p>
                        {invoice.contractorTrade && (
                          <p className="text-xs text-gray-400 mt-0.5">{invoice.contractorTrade}</p>
                        )}
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
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end">
                          <TableActionsDropdown
                            actions={buildActions(invoice)}
                            itemId={invoice.id}
                          />
                        </div>
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
            {invoices.length > 0 ? 'Try adjusting your search or status filter' : 'Invoices submitted by your contractors will appear here'}
          </p>
        </div>
      )}

      {/* View Invoice Modal */}
      {selectedInvoiceId && (
        <ViewContractorInvoiceModal
          isOpen={showViewModal}
          onClose={() => { setShowViewModal(false); setSelectedInvoiceId(null) }}
          invoiceId={selectedInvoiceId}
          onUpdated={fetchData}
          role="pm"
        />
      )}

      {/* Delete Invoice Modal */}
      {deleteTarget && (
        <DeleteContractorInvoiceModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setDeleteTarget(null) }}
          invoice={deleteTarget}
          onDeleted={fetchData}
        />
      )}

      {/* Contractor Picker — Step 1 of create-on-behalf */}
      <Modal
        isOpen={showContractorPicker}
        onClose={closeContractorPicker}
        style="max-w-2xl !w-11/12"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-6 pb-4 border-b border-gray-100 pr-12">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BanknotesIcon className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">Create Invoice for Contractor</h2>
            <p className="text-sm text-gray-500 mt-0.5">Pick which contractor this invoice is for.</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={contractorSearch}
              onChange={(e) => setContractorSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              autoFocus
            />
            {contractorSearch && (
              <button
                onClick={() => setContractorSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                title="Clear search"
              >
                <XMarkIcon className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="px-6 pb-4 overflow-y-auto" style={{ maxHeight: '24rem' }}>
          {visibleContractors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BanknotesIcon className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-700">
                {contractors.length === 0 ? 'No contractors yet' : 'No matches'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {contractors.length === 0
                  ? 'Add a contractor to your account first.'
                  : 'Try a different name or email.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleContractors.map((c) => {
                const selected = pickedContractorId === c.id
                const colors = getAvatarColor(c.id)
                const hasEmail = !!c.email && c.email !== c.name
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPickedContractorId(c.id)}
                    onDoubleClick={() => confirmContractorPick(c.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      selected
                        ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center font-semibold text-sm flex-shrink-0`}>
                      {getInitial(c)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.name || c.email || 'Unnamed contractor'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {hasEmail && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{c.email}</p>
                        )}
                        {c.trade && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{hasEmail ? `· ${c.trade}` : c.trade}</p>
                        )}
                      </div>
                    </div>
                    {selected && (
                      <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {contractorSearch.trim()
              ? `${visibleContractors.length} of ${contractors.length} contractors`
              : `${contractors.length} ${contractors.length === 1 ? 'contractor' : 'contractors'}`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={closeContractorPicker}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={!pickedContractorId}
              onClick={() => confirmContractorPick(null)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Continue
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Invoice Modal — Step 2 of create-on-behalf */}
      {selectedContractor && (
        <CreateContractorInvoiceModal
          isOpen={showCreateInvoiceModal}
          onClose={() => {
            setShowCreateInvoiceModal(false)
            setSelectedContractor(null)
            setPickedContractorId(null)
          }}
          contractor={selectedContractor}
          onCreated={(invoice) => {
            setShowCreateInvoiceModal(false)
            setSelectedContractor(null)
            setPickedContractorId(null)
            fetchData()
            setSelectedInvoiceId(invoice.id)
            setShowViewModal(true)
          }}
        />
      )}
    </div>
  )
}

function SummaryCard({
  label, count, amount, icon: Icon, color,
}: {
  label: string; count: number; amount: number | null
  icon: React.ComponentType<{ className?: string }>; color: 'amber' | 'blue' | 'green' | 'gray' | 'slate'
}) {
  const colors = {
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    green: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    gray: { bg: 'bg-gray-100', icon: 'text-gray-600' },
    slate: { bg: 'bg-slate-100', icon: 'text-slate-600' },
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
