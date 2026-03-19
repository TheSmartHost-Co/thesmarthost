'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingCartIcon,
  ExclamationCircleIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { getCleanerByAuthUserId } from '@/services/cleanerService'
import { getAllSupplyLists, formatSupplyListAge } from '@/services/supplyListService'
import type { SupplyList } from '@/services/types/supplyList'
import { SUPPLY_LIST_STATUS_INFO } from '@/services/types/supplyList'
import type { Cleaner } from '@/services/types/cleaner'
import ViewSupplyListsModal from '@/components/turnover/supply-lists/ViewSupplyListsModal'

export default function CleanerSuppliesPage() {
  const { profile } = useUserStore()

  // State
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [supplyLists, setSupplyLists] = useState<SupplyList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedProjectName, setSelectedProjectName] = useState('')

  // Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'fulfilled'>('all')

  const fetchData = useCallback(async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      // 1. Get cleaner record by auth user ID
      const cleanerRes = await getCleanerByAuthUserId(profile.id)
      if (cleanerRes.status !== 'success') {
        throw new Error(cleanerRes.message || 'Could not find your cleaner profile')
      }

      const cleanerData = cleanerRes.data
      setCleaner(cleanerData)

      // 2. Get all supply lists for the PM user
      const supplyRes = await getAllSupplyLists(cleanerData.userId)
      if (supplyRes.status === 'success') {
        // Filter to only those submitted by this cleaner
        const myLists = supplyRes.data.filter(sl => sl.submittedBy === cleanerData.id)
        setSupplyLists(myLists)
      } else {
        throw new Error(supplyRes.message || 'Failed to load supply lists')
      }
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
    setSelectedProjectId(sl.projectId)
    setSelectedProjectName(sl.propertyName || 'Supply List')
    setShowViewModal(true)
  }

  // Counts for filter pills
  const pendingCount = supplyLists.filter(sl => sl.status === 'pending').length
  const inProgressCount = supplyLists.filter(sl => sl.status === 'in_progress').length
  const fulfilledCount = supplyLists.filter(sl => sl.status === 'fulfilled').length

  // Stable sort by creation date, then filter by selected status
  const sortedLists = [...supplyLists]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const filteredLists = statusFilter === 'all'
    ? sortedLists
    : sortedLists.filter(sl => sl.status === statusFilter)

  // Loading state
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

  // Error state
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
              <h3 className="font-semibold text-red-800">Error loading supplies</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    )
  }

  // Empty state
  if (supplyLists.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Supplies</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">Your supply requests</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingCartIcon className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">No supply requests yet</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            When you submit supply requests during cleaning tasks, they will appear here so you can track their status.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Supplies</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">Track your supply requests</p>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {([
          { key: 'all' as const, label: 'All', count: supplyLists.length, color: 'gray' },
          { key: 'pending' as const, label: 'Pending', count: pendingCount, color: 'amber' },
          { key: 'in_progress' as const, label: 'In Progress', count: inProgressCount, color: 'blue' },
          { key: 'fulfilled' as const, label: 'Fulfilled', count: fulfilledCount, color: 'green' },
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

      {/* Supply List Cards */}
      <div className="space-y-3">
        {filteredLists.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No {statusFilter === 'all' ? '' : statusFilter.replace('_', ' ')} supply lists
          </div>
        ) : (
          filteredLists.map((sl, index) => (
            <SupplyCard key={sl.id} supplyList={sl} index={index} onClick={() => handleCardClick(sl)} />
          ))
        )}
      </div>

      {/* View Supply Lists Modal */}
      <ViewSupplyListsModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        projectId={selectedProjectId}
        projectName={selectedProjectName}
        onSupplyListsChanged={fetchData}
        fulfilledBy={cleaner?.id}
      />
    </div>
  )
}

// Supply Card Component
function SupplyCard({
  supplyList,
  index,
  onClick,
}: {
  supplyList: SupplyList
  index: number
  onClick: () => void
}) {
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
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <BuildingOfficeIcon className="w-5 h-5 text-gray-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {supplyList.propertyName || 'Unknown Property'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {supplyList.items.length} item{supplyList.items.length !== 1 ? 's' : ''} &middot; {formatSupplyListAge(supplyList.createdAt)}
            </p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {itemPreview}{remaining > 0 ? `, +${remaining} more` : ''}
            </p>
            {/* Progress bar */}
            {supplyList.status !== 'fulfilled' && purchasedCount > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{purchasedCount}/{totalCount} purchased</span>
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
