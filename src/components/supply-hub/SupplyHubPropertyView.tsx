'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupplyList, SupplyListSummary } from '@/services/types/supplyList'
import SupplyHubListCard from './SupplyHubListCard'
import { ChevronDownIcon, ChevronRightIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'

interface SupplyHubPropertyViewProps {
  supplyLists: SupplyList[]
  summary: SupplyListSummary | null
  onViewDetails: (sl: SupplyList) => void
  onFulfill: (id: string) => void
  onDelete: (id: string) => void
  onScanReceipt: (sl: SupplyList) => void
  canWrite: boolean
}

const STATUS_DOT_COLORS: Record<string, string> = {
  pending: 'bg-amber-400',
  in_progress: 'bg-blue-400',
  fulfilled: 'bg-green-400',
}

export default function SupplyHubPropertyView({
  supplyLists,
  summary,
  onViewDetails,
  onFulfill,
  onDelete,
  onScanReceipt,
  canWrite,
}: SupplyHubPropertyViewProps) {
  const { t } = useTranslation('turnover')
  const grouped = useMemo(() => {
    const map = new Map<string, { propertyName: string; lists: SupplyList[] }>()
    for (const sl of supplyLists) {
      const key = sl.propertyId
      if (!map.has(key)) {
        map.set(key, { propertyName: sl.propertyName || 'Unknown', lists: [] })
      }
      map.get(key)!.lists.push(sl)
    }
    return Array.from(map.entries())
  }, [supplyLists])

  // First 3 groups open by default
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (propertyId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(propertyId)) next.delete(propertyId)
      else next.add(propertyId)
      return next
    })
  }

  const getSummaryForProperty = (propertyId: string) => {
    return summary?.byProperty.find(bp => bp.propertyId === propertyId)
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

  // Compute per-property stats from lists
  const getPropertyStats = (lists: SupplyList[]) => {
    const statusCounts: Record<string, number> = { pending: 0, in_progress: 0, fulfilled: 0 }
    let totalItems = 0
    let purchasedItems = 0
    for (const sl of lists) {
      statusCounts[sl.status] = (statusCounts[sl.status] || 0) + 1
      totalItems += sl.items.length
      purchasedItems += sl.items.filter(i => i.isPurchased).length
    }
    const purchasedPct = totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0
    return { statusCounts, totalItems, purchasedItems, purchasedPct }
  }

  if (grouped.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <BuildingOfficeIcon className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-1">{t('noSupplyLists')}</p>
        <p className="text-sm text-gray-500">{t('tryAdjustingFilters')}</p>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-3">
      {grouped.map(([propertyId, { propertyName, lists }], index) => {
        const isOpen = index < 3 ? !collapsed.has(propertyId) : collapsed.has(propertyId)
        const propertySummary = getSummaryForProperty(propertyId)
        const stats = getPropertyStats(lists)

        return (
          <div key={propertyId} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Section header */}
            <button
              onClick={() => toggle(propertyId)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isOpen ? (
                  <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                )}
                <BuildingOfficeIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-900 truncate">{propertyName}</span>

                {/* Status pills */}
                <div className="hidden sm:flex items-center gap-2 ml-2">
                  {stats.statusCounts.pending > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS.pending}`} />
                      {stats.statusCounts.pending} pending
                    </span>
                  )}
                  {stats.statusCounts.in_progress > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS.in_progress}`} />
                      {stats.statusCounts.in_progress} in progress
                    </span>
                  )}
                  {stats.statusCounts.fulfilled > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS.fulfilled}`} />
                      {stats.statusCounts.fulfilled} fulfilled
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Mini progress bar */}
                {stats.totalItems > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 tabular-nums">{stats.purchasedItems}/{stats.totalItems}</span>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${stats.purchasedPct}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[10px] text-gray-500 tabular-nums">
                  <span>{lists.length} list{lists.length !== 1 ? 's' : ''}</span>
                  {propertySummary && (
                    <span>{fmt(propertySummary.totalCost)}</span>
                  )}
                </div>
              </div>
            </button>

            {/* Section body */}
            {isOpen && (
              <div className="bg-white">
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lists.map(sl => (
                    <SupplyHubListCard
                      key={sl.id}
                      supplyList={sl}
                      onViewDetails={onViewDetails}
                      onFulfill={onFulfill}
                      onDelete={onDelete}
                      onScanReceipt={onScanReceipt}
                      canWrite={canWrite}
                    />
                  ))}
                </div>
                {/* Summary footer */}
                <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                  <span>{stats.totalItems} total items · {stats.purchasedItems} purchased</span>
                  {propertySummary && <span>{fmt(propertySummary.totalCost)} total cost</span>}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
