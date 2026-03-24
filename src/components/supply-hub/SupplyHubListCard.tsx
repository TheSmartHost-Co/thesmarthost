'use client'

import type { SupplyList } from '@/services/types/supplyList'
import { SUPPLY_LIST_STATUS_INFO } from '@/services/types/supplyList'
import { formatSupplyListAge } from '@/services/supplyListService'
import {
  CheckCircleIcon,
  TrashIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'

interface SupplyHubListCardProps {
  supplyList: SupplyList
  onViewDetails: (sl: SupplyList) => void
  onFulfill: (id: string) => void
  onDelete: (id: string) => void
  onScanReceipt: (sl: SupplyList) => void
  canWrite: boolean
  compact?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
}

export default function SupplyHubListCard({
  supplyList: sl,
  onViewDetails,
  onFulfill,
  onDelete,
  onScanReceipt,
  canWrite,
  compact = false,
}: SupplyHubListCardProps) {
  const statusInfo = SUPPLY_LIST_STATUS_INFO[sl.status]
  const purchasedCount = sl.items.filter(i => i.isPurchased).length
  const totalCount = sl.items.length
  const purchasedPct = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0
  const itemPreview = sl.items.slice(0, compact ? 2 : 4).map(i => i.name)
  const remaining = sl.items.length - itemPreview.length

  // Calculate cost from purchased items
  const purchasedCost = sl.items
    .filter(i => i.isPurchased)
    .reduce((sum, i) => sum + (i.quantity || 0), 0)

  // Format project date
  const projectDateStr = sl.projectDate
    ? (() => { const [y, m, d] = sl.projectDate.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })()
    : null

  return (
    <div
      className={`border border-gray-200 rounded-xl bg-white hover:border-gray-300 hover:shadow-md transition-all cursor-pointer ${compact ? 'p-2' : 'p-4'}`}
      onClick={() => onViewDetails(sl)}
    >
      {/* Row 1: Property + status + age */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        {!compact && (
          <span className="text-xs font-semibold text-gray-900 truncate max-w-[140px]">
            {sl.propertyName || 'Unknown'}
          </span>
        )}
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${STATUS_COLORS[statusInfo.color] || 'bg-gray-100 text-gray-700'}`}>
          {statusInfo.label}
        </span>
        <span className="text-[10px] text-gray-500 tabular-nums">
          {totalCount} item{totalCount !== 1 ? 's' : ''}
        </span>
        {purchasedCount > 0 && (
          <span className="text-[10px] text-teal-600 tabular-nums">
            {purchasedCount}/{totalCount} purchased
          </span>
        )}
        <span className="text-[10px] text-gray-400 tabular-nums ml-auto flex-shrink-0">
          {formatSupplyListAge(sl.createdAt)}
        </span>
      </div>

      {/* Progress bar */}
      {!compact && totalCount > 0 && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${purchasedPct}%` }}
          />
        </div>
      )}

      {/* Item pills + submitter */}
      {!compact && (
        <div className="mb-1.5">
          <div className="flex items-center flex-wrap gap-1 mb-1">
            {itemPreview.map((name, i) => (
              <span key={i} className="inline-flex px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] truncate max-w-[120px]">
                {name}
              </span>
            ))}
            {remaining > 0 && (
              <span className="text-[10px] text-gray-400">+{remaining} more</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {sl.submitterName && (
              <span className="truncate">by {sl.submitterName}</span>
            )}
            {projectDateStr && (
              <>
                {sl.submitterName && <span className="text-gray-300">·</span>}
                <span className="tabular-nums">Project: {projectDateStr}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Compact: inline text preview */}
      {compact && (
        <div className="flex items-center gap-1 mb-1.5">
          <p className="text-[10px] text-gray-500 truncate">
            {sl.items.slice(0, 2).map(i => i.name).join(', ')}{sl.items.length > 2 ? `, +${sl.items.length - 2} more` : ''}
          </p>
        </div>
      )}

      {/* Row 3: Actions (right-aligned) */}
      <div className="flex items-center justify-end gap-0.5">
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {canWrite && sl.status !== 'fulfilled' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onFulfill(sl.id) }}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
                title="Fulfill"
              >
                <CheckCircleIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onScanReceipt(sl) }}
                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
                title="Scan receipt"
              >
                <CameraIcon className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {canWrite && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(sl.id) }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
              title="Delete"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
