'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ReceiptPercentIcon,
  CameraIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getCleanerSchedule } from '@/services/cleanerService'
import { searchReceipts } from '@/services/receiptService'
import type { UploadedReceipt, ReceiptStatus, UploadReceiptResponse } from '@/services/types/receipt'
import type { Cleaner } from '@/services/types/cleaner'
import type { Property } from '@/services/types/property'
import UploadReceiptModal from '@/components/receipt/upload/UploadReceiptModal'
import ReceiptDetailModal from '@/components/receipt/detail/ReceiptDetailModal'
import DeleteReceiptModal from '@/components/receipt/delete/DeleteReceiptModal'

const STATUS_FILTER_KEYS: { value: ReceiptStatus | 'all'; labelKey: string; color: string }[] = [
  { value: 'all', labelKey: 'allFilter', color: 'gray' },
  { value: 'pending', labelKey: 'statusPending', color: 'amber' },
  { value: 'matched', labelKey: 'statusReady', color: 'blue' },
  { value: 'applied', labelKey: 'statusApplied', color: 'green' },
  { value: 'failed', labelKey: 'statusFailed', color: 'red' },
  { value: 'archived', labelKey: 'statusArchived', color: 'slate' },
]

const statusConfigBase: Record<string, { labelKey: string; bg: string; text: string; dot: string }> = {
  pending: { labelKey: 'statusPending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  matched: { labelKey: 'statusReady', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  failed: { labelKey: 'statusFailed', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  applied: { labelKey: 'statusApplied', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  archived: { labelKey: 'statusArchived', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

export default function CleanerReceiptsPage() {
  const { t } = useTranslation('cleanerPortal')
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Data
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [receipts, setReceipts] = useState<UploadedReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Upload → Detail handoff
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [activeReceiptId, setActiveReceiptId] = useState('')

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UploadedReceipt | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchData = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)

    try {
      const [scheduleRes, receiptsRes] = await Promise.all([
        cleaner ? Promise.resolve(null) : getCleanerSchedule(),
        searchReceipts({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: debouncedSearch || undefined,
        }),
      ])

      if (scheduleRes?.status === 'success') {
        const cleanerData = {
          ...scheduleRes.data.cleaner,
          assignedProperties: scheduleRes.data.assignedProperties,
        } as Cleaner
        setCleaner(cleanerData)
        // Build Property[] from assigned properties for the detail modal
        setProperties(
          (scheduleRes.data.assignedProperties || []).map(p => ({
            id: p.propertyId,
            listingName: p.propertyName || p.propertyId,
          } as Property))
        )
      }

      if (receiptsRes.status === 'success') {
        setReceipts(receiptsRes.data)
      } else {
        setError(receiptsRes.message || 'Failed to load receipts')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load receipts'
      setError(message)
      console.error('Error loading receipts:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, statusFilter, debouncedSearch, cleaner])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Upload success → refresh list
  const handleUploadSuccess = () => {
    setShowUploadModal(false)
    showNotification(t('receiptScannedSuccessfully'), 'success')
    fetchData()
  }

  // Open existing receipt
  const handleOpenReceipt = (receipt: UploadedReceipt) => {
    setActiveReceiptId(receipt.id)
    setShowDetailModal(true)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount == null) return '—'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return '—'
    return `$${num.toFixed(2)}`
  }

  // Status counts
  const statusCounts = receipts.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  // Loading skeleton
  if (loading && receipts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-9 w-20 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error && receipts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
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
              <h3 className="font-semibold text-red-800">{t('errorLoadingReceipts')}</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            {t('tryAgain')}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('myReceipts')}</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">{t('receiptsSubtitle')}</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 transition-colors cursor-pointer active:scale-95"
        >
          <CameraIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{t('scanReceipt')}</span>
          <span className="sm:hidden">{t('scan')}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('searchByVendorOrProperty')}
          className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_FILTER_KEYS.map(({ value, labelKey, color }) => {
          const isActive = statusFilter === value
          const count = value === 'all' ? receipts.length : (statusCounts[value] || 0)
          const activeStyles: Record<string, string> = {
            gray: 'bg-gray-900 text-white',
            amber: 'bg-amber-500 text-white',
            blue: 'bg-blue-500 text-white',
            green: 'bg-green-500 text-white',
            red: 'bg-red-500 text-white',
            slate: 'bg-slate-500 text-white',
          }
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer active:scale-95 ${
                isActive
                  ? activeStyles[color]
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(labelKey)}
              {count > 0 && (
                <span className={`text-xs ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Receipt list */}
      {receipts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center"
        >
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto">
            <ReceiptPercentIcon className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">{t('noReceiptsYet')}</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            {t('noReceiptsDescription')}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 transition-colors cursor-pointer"
          >
            <CameraIcon className="w-4 h-4" />
            {t('scanFirstReceipt')}
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {receipts.map((receipt, index) => {
              const config = statusConfigBase[receipt.status] || statusConfigBase.pending
              return (
                <motion.div
                  key={receipt.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <button
                    onClick={() => handleOpenReceipt(receipt)}
                    className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left cursor-pointer hover:bg-gray-50/50 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                        <ReceiptPercentIcon className={`w-5 h-5 ${config.text}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {receipt.vendorName || receipt.originalName}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${config.bg} ${config.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                            {t(config.labelKey)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          {receipt.propertyName && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <BuildingOfficeIcon className="w-3 h-3 flex-shrink-0" />
                              {receipt.propertyName}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 flex-shrink-0">
                            <CalendarIcon className="w-3 h-3" />
                            {formatDate(receipt.expenseDate || receipt.createdAt)}
                          </span>
                          {receipt.uploaderName && receipt.uploadedBy !== profile?.id && (
                            <span className="text-gray-400 truncate">by {receipt.uploaderName}</span>
                          )}
                        </div>

                        {receipt.total != null && (
                          <p className="text-sm font-semibold text-gray-900 mt-1.5">
                            {formatCurrency(receipt.total)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Modal */}
      <UploadReceiptModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploaded={handleUploadSuccess}
      />

      {/* Detail Modal (view/edit/apply) */}
      {activeReceiptId && (
        <ReceiptDetailModal
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setActiveReceiptId('') }}
          receiptId={activeReceiptId}
          properties={properties}
          onUpdated={fetchData}
          onDeleted={() => { setShowDetailModal(false); setActiveReceiptId(''); fetchData() }}
          defaultPaidByType="CLEANER"
          defaultPaidById={profile?.id || null}
          readOnly={(() => { const r = receipts.find(r => r.id === activeReceiptId); return r ? r.uploadedBy !== profile?.id : false })()}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteReceiptModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setDeleteTarget(null) }}
          receipt={deleteTarget}
          onDeleted={() => { setShowDeleteModal(false); setDeleteTarget(null); fetchData() }}
        />
      )}
    </div>
  )
}
