'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingCartIcon,
  ClockIcon,
  CheckCircleIcon,
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

  // Completed section toggle
  const [showFulfilled, setShowFulfilled] = useState(false)

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

  // Split into pending and fulfilled
  const pendingLists = supplyLists
    .filter(sl => sl.status === 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const fulfilledLists = supplyLists
    .filter(sl => sl.status === 'fulfilled')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Supplies</h1>
          <p className="text-gray-500 mt-1">Your supply requests</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Supplies</h1>
        <p className="text-gray-500 mt-1">Track your supply requests</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`rounded-xl border p-3 bg-amber-50 text-amber-700 border-amber-100 ${pendingLists.length > 0 ? 'ring-2 ring-amber-300 ring-offset-1' : ''}`}>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 opacity-70" />
            <span className="text-xs font-medium opacity-70">Pending</span>
          </div>
          <p className="text-2xl font-bold mt-1">{pendingLists.length}</p>
        </div>
        <div className="rounded-xl border p-3 bg-green-50 text-green-700 border-green-100">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 opacity-70" />
            <span className="text-xs font-medium opacity-70">Fulfilled</span>
          </div>
          <p className="text-2xl font-bold mt-1">{fulfilledLists.length}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* Pending Section */}
        {pendingLists.length > 0 && (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 mb-3">
              <span className="text-sm font-semibold text-amber-700">Pending</span>
              <span className="text-xs font-medium text-amber-700 opacity-70">
                ({pendingLists.length})
              </span>
            </div>
            <div className="space-y-3">
              {pendingLists.map((sl, index) => (
                <SupplyCard key={sl.id} supplyList={sl} index={index} onClick={() => handleCardClick(sl)} />
              ))}
            </div>
          </div>
        )}

        {/* Fulfilled Section (collapsible) */}
        {fulfilledLists.length > 0 && (
          <div>
            <button
              onClick={() => setShowFulfilled(!showFulfilled)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Fulfilled ({fulfilledLists.length})
              </span>
              <span className="text-xs">{showFulfilled ? '\u2212' : '+'}</span>
            </button>

            {showFulfilled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 space-y-3"
              >
                {fulfilledLists.slice(0, 10).map((sl, index) => (
                  <SupplyCard key={sl.id} supplyList={sl} index={index} onClick={() => handleCardClick(sl)} />
                ))}
                {fulfilledLists.length > 10 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    + {fulfilledLists.length - 10} more fulfilled requests
                  </p>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* View Supply Lists Modal */}
      <ViewSupplyListsModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        projectId={selectedProjectId}
        projectName={selectedProjectName}
        onSupplyListsChanged={fetchData}
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
    green: 'bg-green-100 text-green-700',
  }

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
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusColors[statusInfo.color] || 'bg-gray-100 text-gray-700'}`}>
          {statusInfo.label}
        </span>
      </div>
    </motion.div>
  )
}
