'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ReceiptPercentIcon,
  MagnifyingGlassIcon,
  CameraIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  TrashIcon,
  Squares2X2Icon,
  ListBulletIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotificationStore } from '@/store/useNotificationStore'
import { searchReceipts, archiveReceipt, unarchiveReceipt } from '@/services/receiptService'
import { getProperties } from '@/services/propertyService'
import type { UploadedReceipt, ReceiptStatus, ReceiptSearchParams } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'
import UploadReceiptModal from '@/components/receipt/upload/UploadReceiptModal'
import BulkUploadReceiptModal from '@/components/receipt/upload/BulkUploadReceiptModal'
import ReceiptDetailModal from '@/components/receipt/detail/ReceiptDetailModal'
import DeleteReceiptModal from '@/components/receipt/delete/DeleteReceiptModal'
import BulkDeleteReceiptsModal from '@/components/receipt/delete/BulkDeleteReceiptsModal'
import ReceiptGalleryCard from '@/components/receipt/ReceiptGalleryCard'
import PropertyChip from '@/components/receipt/PropertyChip'
import ReceiptThumbnail from '@/components/shared/ReceiptThumbnail'
import TableActionsDropdown from '@/components/shared/TableActionsDropdown'
import type { ActionItem } from '@/components/shared/TableActionsDropdown'

const ITEMS_PER_PAGE = 20

const STATUS_FILTERS: { value: ReceiptStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'matched', label: 'Ready' },
  { value: 'failed', label: 'Failed' },
  { value: 'applied', label: 'Applied' },
  { value: 'archived', label: 'Archived' },
]

const statusConfig: Record<ReceiptStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  matched: { label: 'Ready', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  applied: { label: 'Applied', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  archived: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

export default function ReceiptsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <ReceiptsContent />
    </Suspense>
  )
}

function ReceiptsContent() {
  const { t } = useTranslation('expenses')
  usePermissionGuard('receipts')
  const { effectiveUserId, canWrite } = usePermissions()
  const showNotification = useNotificationStore((s) => s.showNotification)

  // Data
  const [receipts, setReceipts] = useState<UploadedReceipt[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('gallery')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | 'all'>('all')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [linkedFilter, setLinkedFilter] = useState<'' | 'true' | 'false'>('')
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UploadedReceipt | null>(null)

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter, propertyFilter, startDate, endDate, linkedFilter])

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!effectiveUserId) return
    setLoading(true)
    setError(null)
    try {
      const params: ReceiptSearchParams = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (statusFilter !== 'all') params.status = statusFilter
      if (propertyFilter) params.propertyId = propertyFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (linkedFilter) params.linked = linkedFilter

      const [receiptsRes, propertiesRes] = await Promise.all([
        searchReceipts(params),
        properties.length === 0 ? getProperties(effectiveUserId) : Promise.resolve(null),
      ])

      if (receiptsRes.status === 'success') {
        setReceipts(receiptsRes.data)
        if (receiptsRes.total != null) setTotalCount(receiptsRes.total)
        else setTotalCount(receiptsRes.data.length)
      } else {
        setError(receiptsRes.message || t('failedToLoadReceipts'))
      }

      if (propertiesRes && propertiesRes.status === 'success') {
        setProperties(propertiesRes.data)
      }
    } catch (err) {
      console.error('Fetch receipts error:', err)
      setError(err instanceof Error ? err.message : t('failedToLoadReceipts'))
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId, currentPage, debouncedSearch, statusFilter, propertyFilter, startDate, endDate, linkedFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Click-outside for filter popover
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activeFilterCount = [propertyFilter, startDate, endDate, linkedFilter].filter(Boolean).length

  // Build actions for each receipt
  const buildActions = (receipt: UploadedReceipt): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: t('viewDetails', { ns: 'common' }),
        icon: EyeIcon,
        onClick: () => {
          setSelectedReceiptId(receipt.id)
          setShowDetailModal(true)
        },
      },
    ]

    if (canWrite('receipts')) {
      if (receipt.status === 'matched') {
        actions.push({
          label: t('applyAsExpense'),
          icon: CheckCircleIcon,
          variant: 'highlight',
          onClick: () => {
            setSelectedReceiptId(receipt.id)
            setShowDetailModal(true)
          },
        })
      }

      if (receipt.status === 'archived') {
        actions.push({
          label: t('unarchive'),
          icon: ArchiveBoxXMarkIcon,
          onClick: async () => {
            const res = await unarchiveReceipt(receipt.id)
            if (res.status === 'success') {
              showNotification(t('receiptUnarchived'), 'success')
              fetchData()
            } else {
              showNotification(res.message || 'Failed', 'error')
            }
          },
        })
      } else if (receipt.status !== 'applied') {
        actions.push({
          label: t('archive'),
          icon: ArchiveBoxIcon,
          onClick: async () => {
            const res = await archiveReceipt(receipt.id)
            if (res.status === 'success') {
              showNotification(t('receiptArchived'), 'success')
              fetchData()
            } else {
              showNotification(res.message || 'Failed', 'error')
            }
          },
        })
      }

      actions.push({
        label: 'Delete',
        icon: TrashIcon,
        variant: 'danger',
        onClick: () => {
          setDeleteTarget(receipt)
          setShowDeleteModal(true)
        },
      })
    }

    return actions
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number | string | null) => {
    if (amount == null) return '—'
    return `$${parseFloat(String(amount)).toFixed(2)}`
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Handle upload complete
  const handleUploaded = (data: { receipt: { id: string } }) => {
    fetchData()
    setSelectedReceiptId(data.receipt.id)
    setShowDetailModal(true)
  }

  // Loading state
  if (loading && receipts.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error && receipts.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-700 font-medium mb-2">Failed to load receipts</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-xl hover:bg-red-200">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('receiptTitle')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('receiptSubtitle')}</p>
        </div>
        {canWrite('receipts') && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors shadow-sm w-full sm:w-auto"
            >
              <DocumentTextIcon className="w-4 h-4" />
              Bulk Upload
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
            >
              <CameraIcon className="w-4 h-4" />
              Scan Receipt
            </button>
          </div>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status pills */}
        <div className="flex flex-wrap gap-2 items-center">
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
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendor, property..."
              className="w-full sm:w-56 pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter popover */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 text-xs bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilterPopover && (
              <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">Filters</span>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => {
                        setPropertyFilter('')
                        setStartDate('')
                        setEndDate('')
                        setLinkedFilter('')
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Property</label>
                  <select
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Properties</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.listingName || p.address || p.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Applied Status</label>
                  <select
                    value={linkedFilter}
                    onChange={(e) => setLinkedFilter(e.target.value as '' | 'true' | 'false')}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="true">Applied (linked to expense)</option>
                    <option value="false">Not applied</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => {
                setViewMode('table')
              }}
              className={`p-2 transition-colors ${
                viewMode === 'table' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
              title="Table view"
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setViewMode('gallery')
                setSelectedIds(new Set())
              }}
              className={`p-2 transition-colors ${
                viewMode === 'gallery' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
              title="Gallery view"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Top pagination — desktop only, mirrors bottom controls */}
      {receipts.length > 0 && totalPages > 1 && (
        <div className="hidden md:flex items-center justify-between px-1">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">{receipts.length}</span>
            {totalCount > receipts.length && (
              <> of <span className="font-medium">{totalCount}</span></>
            )}{' '}
            receipts
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-2 text-xs text-gray-500">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {receipts.length > 0 ? (
        <>
          {/* Mobile view */}
          <div className="md:hidden">
            {viewMode === 'gallery' ? (
              /* Mobile gallery — big cards with receipt images */
              <div className="grid grid-cols-1 gap-3">
                {receipts.map((receipt) => (
                  <ReceiptGalleryCard
                    key={receipt.id}
                    receipt={receipt}
                    onOpen={(id) => {
                      setSelectedReceiptId(id)
                      setShowDetailModal(true)
                    }}
                    actions={buildActions(receipt)}
                  />
                ))}
              </div>
            ) : (
              /* Mobile compact list */
              <div className="space-y-3">
                {receipts.map((receipt) => {
                  const status = statusConfig[receipt.status]
                  return (
                    <div
                      key={receipt.id}
                      onClick={() => {
                        setSelectedReceiptId(receipt.id)
                        setShowDetailModal(true)
                      }}
                      className={`bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 active:bg-blue-50 transition-colors cursor-pointer ${
                        receipt.status === 'archived' ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <ReceiptThumbnail
                          signedUrl={receipt.signedUrl}
                          mimeType={receipt.mimeType}
                          originalName={receipt.originalName}
                          imgClassName="w-full h-full object-cover"
                          pdfRenderWidth={160}
                          fallback={<DocumentTextIcon className="w-5 h-5 text-gray-300" />}
                        />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{receipt.vendorName || 'Unknown'}</p>
                        <div className="mt-1">
                          <PropertyChip receipt={receipt} size="sm" />
                        </div>
                      </div>
                      {/* Amount + Status */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(receipt.total)}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.bg} ${status.text}`}>
                          <span className={`w-1 h-1 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Mobile pagination */}
            <div className="flex items-center justify-between pt-3">
              <p className="text-xs text-gray-500">
                {receipts.length} of {totalCount} receipts
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-2 text-xs text-gray-500">{currentPage}/{totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Desktop: table or gallery based on toggle */}
          {viewMode === 'table' ? (
            <>
              {/* Bulk-action toolbar — visible when ≥1 row is selected (table view only) */}
              {selectedIds.size > 0 && canWrite('receipts') && (
                <div className="hidden md:flex items-center justify-between gap-3 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-xl mb-3">
                  <div className="text-sm text-purple-900">
                    <span className="font-semibold">{selectedIds.size}</span>{' '}
                    receipt{selectedIds.size === 1 ? '' : 's'} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowBulkDeleteModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Delete {selectedIds.size}
                    </button>
                  </div>
                </div>
              )}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-4 text-left w-10">
                        {canWrite('receipts') && receipts.length > 0 && (
                          <input
                            type="checkbox"
                            aria-label="Select all visible receipts"
                            checked={
                              receipts.length > 0 &&
                              receipts.every((r) => selectedIds.has(r.id))
                            }
                            ref={(el) => {
                              if (el) {
                                const someSelected = receipts.some((r) => selectedIds.has(r.id))
                                const allSelected = receipts.every((r) => selectedIds.has(r.id))
                                el.indeterminate = someSelected && !allSelected
                              }
                            }}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(new Set(receipts.map((r) => r.id)))
                              } else {
                                setSelectedIds(new Set())
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        )}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12" />
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded On</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded By</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {receipts.map((receipt) => {
                      const status = statusConfig[receipt.status]
                      const isSelected = selectedIds.has(receipt.id)
                      return (
                        <tr
                          key={receipt.id}
                          onClick={() => {
                            setSelectedReceiptId(receipt.id)
                            setShowDetailModal(true)
                          }}
                          className={`hover:bg-blue-50/50 transition-colors group cursor-pointer ${
                            receipt.status === 'archived' ? 'opacity-60' : ''
                          } ${isSelected ? 'bg-purple-50/50' : ''}`}
                        >
                          {/* Selection checkbox */}
                          <td
                            className="px-4 py-4 w-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {canWrite('receipts') && (
                              <input
                                type="checkbox"
                                aria-label={`Select receipt ${receipt.originalName}`}
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedIds((prev) => {
                                    const next = new Set(prev)
                                    if (e.target.checked) next.add(receipt.id)
                                    else next.delete(receipt.id)
                                    return next
                                  })
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                            )}
                          </td>

                          {/* Thumbnail */}
                          <td className="px-6 py-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              <ReceiptThumbnail
                                signedUrl={receipt.signedUrl}
                                mimeType={receipt.mimeType}
                                originalName={receipt.originalName}
                                imgClassName="w-full h-full object-cover"
                                pdfRenderWidth={160}
                                fallback={<DocumentTextIcon className="w-5 h-5 text-gray-300" />}
                              />
                            </div>
                          </td>

                          {/* Vendor */}
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-900">
                              {receipt.vendorName || 'Unknown'}
                            </p>
                            {receipt.description && (
                              <p className="text-xs text-gray-400 mt-0.5">{receipt.description}</p>
                            )}
                          </td>

                          {/* Property */}
                          <td className="px-6 py-4">
                            <PropertyChip receipt={receipt} size="sm" />
                          </td>

                          {/* Date */}
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">{formatDate(receipt.expenseDate || receipt.createdAt)}</p>
                          </td>

                          {/* Uploaded On */}
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-500">{formatDate(receipt.createdAt)}</p>
                          </td>

                          {/* Total */}
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold text-gray-900 tabular-nums">
                              {formatCurrency(receipt.total)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </td>

                          {/* Uploaded By */}
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">{receipt.uploaderName || '—'}</p>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end">
                              <TableActionsDropdown actions={buildActions(receipt)} itemId={receipt.id} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium">{receipts.length}</span>
                  {totalCount > receipts.length && (
                    <> of <span className="font-medium">{totalCount}</span></>
                  )}{' '}
                  receipts
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-2 text-xs text-gray-500">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {receipts.map((receipt) => (
                <ReceiptGalleryCard
                  key={receipt.id}
                  receipt={receipt}
                  onOpen={(id) => {
                    setSelectedReceiptId(id)
                    setShowDetailModal(true)
                  }}
                  actions={buildActions(receipt)}
                />
              ))}
            </motion.div>
          )}

          {/* Gallery pagination (desktop only) */}
          {viewMode === 'gallery' && totalPages > 1 && (
            <div className="hidden md:flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <ReceiptPercentIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">
            {statusFilter !== 'all' || debouncedSearch || propertyFilter
              ? 'No receipts match your filters'
              : 'No receipts yet'}
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            {statusFilter !== 'all' || debouncedSearch || propertyFilter
              ? 'Try adjusting your search or filters'
              : 'Upload a receipt to get started with OCR extraction'}
          </p>
          {canWrite('receipts') && !debouncedSearch && statusFilter === 'all' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <CameraIcon className="w-4 h-4" />
              Scan Receipt
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <UploadReceiptModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploaded={handleUploaded}
      />

      <BulkUploadReceiptModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onComplete={() => {
          fetchData()
        }}
        source="bulk_upload"
      />

      <BulkDeleteReceiptsModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        receipts={receipts.filter((r) => selectedIds.has(r.id))}
        onDeleted={() => {
          setSelectedIds(new Set())
          fetchData()
        }}
      />

      {selectedReceiptId && (
        <ReceiptDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedReceiptId(null)
          }}
          receiptId={selectedReceiptId}
          properties={properties}
          onUpdated={fetchData}
          onDeleted={fetchData}
        />
      )}

      {deleteTarget && (
        <DeleteReceiptModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setDeleteTarget(null)
          }}
          receipt={deleteTarget}
          onDeleted={fetchData}
        />
      )}
    </div>
  )
}
