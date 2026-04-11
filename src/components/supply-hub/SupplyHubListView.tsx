'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupplyList } from '@/services/types/supplyList'
import SupplyHubListCard from './SupplyHubListCard'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'

interface SupplyHubListViewProps {
  supplyLists: SupplyList[]
  onViewDetails: (sl: SupplyList) => void
  onFulfill: (id: string) => void
  onDelete: (id: string) => void
  onScanReceipt: (sl: SupplyList) => void
  canWrite: boolean
}

export default function SupplyHubListView({
  supplyLists,
  onViewDetails,
  onFulfill,
  onDelete,
  onScanReceipt,
  canWrite,
}: SupplyHubListViewProps) {
  const { t } = useTranslation('turnover')
  const [visibleCount, setVisibleCount] = useState(10)

  if (supplyLists.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <ShoppingCartIcon className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-1">{t('noSupplyLists')}</p>
        <p className="text-sm text-gray-500">{t('tryAdjustingFilters')}</p>
      </div>
    )
  }

  const visibleLists = supplyLists.slice(0, visibleCount)
  const hasMore = visibleCount < supplyLists.length

  return (
    <div className="p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleLists.map(sl => (
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
      {hasMore && (
        <button
          onClick={() => setVisibleCount(prev => prev + 10)}
          className="mt-3 w-full py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          Load more ({supplyLists.length - visibleCount} remaining)
        </button>
      )}
      <p className="text-[10px] text-gray-400 mt-2 text-center tabular-nums">
        Showing {visibleLists.length} of {supplyLists.length}
      </p>
    </div>
  )
}
