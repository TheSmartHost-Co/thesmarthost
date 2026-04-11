'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ShoppingCartIcon,
  ExclamationCircleIcon,
  BuildingOfficeIcon,
  PlusIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getCleanerSchedule } from '@/services/cleanerService'
import { getSupplyListsByProject, getAllSupplyLists, formatSupplyListAge } from '@/services/supplyListService'
import type { SupplyList, SupplyListStatus } from '@/services/types/supplyList'
import { SUPPLY_LIST_STATUS_INFO } from '@/services/types/supplyList'
import type { Cleaner } from '@/services/types/cleaner'
import {
  CleanerCreateSupplyListModal,
  CleanerSupplyListModal,
} from '@/components/cleaner-portal/supply-lists'
import UploadReceiptModal from '@/components/receipt/upload/UploadReceiptModal'
import ReceiptDetailModal from '@/components/receipt/detail/ReceiptDetailModal'
import type { UploadReceiptResponse } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'

export default function CleanerSuppliesPage() {
  const { t } = useTranslation('cleanerPortal')
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // State
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [supplyLists, setSupplyLists] = useState<SupplyList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadReceiptModal, setShowUploadReceiptModal] = useState(false)
  const [showReceiptDetailModal, setShowReceiptDetailModal] = useState(false)
  const [activeReceiptId, setActiveReceiptId] = useState('')
  const [showUnifiedModal, setShowUnifiedModal] = useState(false)
  const [selectedSupplyList, setSelectedSupplyList] = useState<SupplyList | null>(null)

  // Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'fulfilled'>('all')

  const fetchData = useCallback(async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      // 1. Get cleaner + projects in one call
      const scheduleRes = await getCleanerSchedule()
      if (scheduleRes.status !== 'success') {
        throw new Error(scheduleRes.message || 'Could not load schedule')
      }
      const cleanerData = {
        ...scheduleRes.data.cleaner,
        assignedProperties: scheduleRes.data.assignedProperties,
      } as Cleaner
      setCleaner(cleanerData)

      // 2. Get unique project IDs
      const projectIds = [...new Set(scheduleRes.data.cleaningProjects.map((p: { id: string }) => p.id))]

      // 3. Fetch supply lists per-project + standalone lists in parallel
      const [standaloneRes, ...results] = await Promise.all([
        getAllSupplyLists().catch(() => null),
        ...projectIds.map(pid => getSupplyListsByProject(pid).catch(() => null)),
      ])

      // 4. Flatten — show all supply lists for projects this cleaner is assigned to + standalone
      const allLists = [
        ...(standaloneRes?.status === 'success' ? standaloneRes.data : []),
        ...results.filter(r => r?.status === 'success').flatMap(r => r!.data),
      ]

      // Deduplicate by ID
      const seen = new Set<string>()
      const unique = allLists.filter(sl => {
        if (seen.has(sl.id)) return false
        seen.add(sl.id)
        return true
      })

      setSupplyLists(unique)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load supplies'
      setError(message)
      console.error('Error loading supplies:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCardClick = (sl: SupplyList) => {
    setSelectedSupplyList(sl)
    setShowUnifiedModal(true)
  }

  // Counts
  const pendingCount = supplyLists.filter(sl => sl.status === 'pending').length
  const inProgressCount = supplyLists.filter(sl => sl.status === 'in_progress').length
  const fulfilledCount = supplyLists.filter(sl => sl.status === 'fulfilled').length

  const sortedLists = [...supplyLists]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const filteredLists = statusFilter === 'all'
    ? sortedLists
    : sortedLists.filter(sl => sl.status === statusFilter)

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
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
              <h3 className="font-semibold text-red-800">{t('errorLoadingSupplies')}</h3>
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
      {/* Header with New Request button */}
      <div className="flex items-center justify-between mb-5 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('mySupplies')}</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">{t('trackSupplyRequests')}</p>
        </div>
        {cleaner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadReceiptModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-teal-700 border border-teal-200 rounded-xl text-sm font-medium hover:bg-teal-50 transition-colors cursor-pointer"
            >
              <CameraIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('receipt')}</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 transition-colors cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('newRequest')}</span>
              <span className="sm:hidden">{t('new')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {([
          { key: 'all' as const, label: t('allFilter'), count: supplyLists.length, color: 'gray' },
          { key: 'pending' as const, label: t('statusPending'), count: pendingCount, color: 'amber' },
          { key: 'in_progress' as const, label: t('inProgress'), count: inProgressCount, color: 'blue' },
          { key: 'fulfilled' as const, label: t('fulfilled'), count: fulfilledCount, color: 'green' },
        ]).map(({ key, label, count, color }) => {
          const isActive = statusFilter === key
          const activeStyles: Record<string, string> = {
            gray: 'bg-gray-900 text-white',
            amber: 'bg-amber-500 text-white',
            blue: 'bg-blue-500 text-white',
            green: 'bg-green-500 text-white',
          }
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer active:scale-95 ${
                isActive
                  ? activeStyles[color]
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
              <span className={`text-xs ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {supplyLists.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingCartIcon className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">{t('noSupplyRequestsYet')}</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            {t('noSupplyRequestsDescription')}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredLists.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {t('noSupplyLists', { status: statusFilter === 'all' ? '' : statusFilter.replace('_', ' ') })}
            </div>
          ) : (
            filteredLists.map((sl, index) => (
              <SupplyCard
                key={sl.id}
                supplyList={sl}
                index={index}
                onClick={() => handleCardClick(sl)}
              />
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {cleaner && (
        <CleanerCreateSupplyListModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          cleanerId={cleaner.id}
          pmUserId={cleaner.userId}
          properties={cleaner.assignedProperties?.map(p => ({ id: p.propertyId, listingName: p.propertyName || p.propertyId })) || []}
          onCreated={() => { setShowCreateModal(false); fetchData() }}
        />
      )}

      <UploadReceiptModal
        isOpen={showUploadReceiptModal}
        onClose={() => setShowUploadReceiptModal(false)}
        onUploaded={(data: UploadReceiptResponse['data']) => {
          setShowUploadReceiptModal(false)
          setActiveReceiptId(data.receipt.id)
          setShowReceiptDetailModal(true)
        }}
      />

      {activeReceiptId && (
        <ReceiptDetailModal
          isOpen={showReceiptDetailModal}
          onClose={() => { setShowReceiptDetailModal(false); setActiveReceiptId('') }}
          receiptId={activeReceiptId}
          properties={(cleaner?.assignedProperties || []).map(p => ({ id: p.propertyId, listingName: p.propertyName || p.propertyId } as Property))}
          onUpdated={fetchData}
          onDeleted={() => { setShowReceiptDetailModal(false); setActiveReceiptId(''); fetchData() }}
          defaultPaidByType="CLEANER"
          defaultPaidById={profile?.id || null}
        />
      )}

      <CleanerSupplyListModal
        isOpen={showUnifiedModal}
        onClose={() => setShowUnifiedModal(false)}
        supplyList={selectedSupplyList}
        cleanerId={cleaner?.id || ''}
        pmUserId={cleaner?.userId}
        propertyId={selectedSupplyList?.propertyId}
        onChanged={fetchData}
      />
    </div>
  )
}

// Supply Card Component (simplified — unified modal handles all actions)
function SupplyCard({
  supplyList,
  index,
  onClick,
}: {
  supplyList: SupplyList
  index: number
  onClick: () => void
}) {
  const { t } = useTranslation('cleanerPortal')
  const itemPreview = supplyList.items.slice(0, 3).map(i => i.name).join(', ')
  const remaining = supplyList.items.length - 3
  const statusInfo = SUPPLY_LIST_STATUS_INFO[supplyList.status]

  const statusColors: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
  }

  const purchasedCount = supplyList.items.filter(i => i.isPurchased).length
  const totalCount = supplyList.items.length
  const percentage = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <BuildingOfficeIcon className="w-5 h-5 text-gray-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {supplyList.propertyName || t('unknownProperty')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {supplyList.items.length} item{supplyList.items.length !== 1 ? 's' : ''} &middot; {formatSupplyListAge(supplyList.createdAt)}
            </p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {itemPreview}{remaining > 0 ? `, +${remaining} more` : ''}
            </p>
            {supplyList.status !== 'fulfilled' && purchasedCount > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{t('purchased', { purchased: purchasedCount, total: totalCount })}</span>
                  <span>{percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusColors[statusInfo.color] || 'bg-gray-100 text-gray-700'}`}>
          {statusInfo.label}
        </span>
      </div>
    </motion.div>
  )
}
