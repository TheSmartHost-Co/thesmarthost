'use client'

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { SupplyList } from '@/services/types/supplyList'
import { SUPPLY_LIST_STATUS_INFO } from '@/services/types/supplyList'
import { formatSupplyListAge } from '@/services/supplyListService'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import NeedsReceiptBadge from '@/components/shared/NeedsReceiptBadge'
import {
  EyeIcon,
  CameraIcon,
  CheckCircleIcon,
  TrashIcon,
  ShoppingCartIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline'

interface SupplyHubTableViewProps {
  supplyLists: SupplyList[]
  onViewDetails: (sl: SupplyList) => void
  onFulfill: (id: string) => void
  onDelete: (id: string) => void
  onScanReceipt: (sl: SupplyList) => void
  canWrite: boolean
}

const statusBadgeStyles: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
}

// Deterministic gradient from property name
function getPropertyGradient(name: string): string {
  const gradients = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-teal-500 to-teal-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-indigo-500 to-indigo-600',
    'from-emerald-500 to-emerald-600',
    'from-orange-500 to-orange-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

export default function SupplyHubTableView({
  supplyLists,
  onViewDetails,
  onFulfill,
  onDelete,
  onScanReceipt,
  canWrite,
}: SupplyHubTableViewProps) {
  const { t } = useTranslation('turnover')
  const getActions = (sl: SupplyList): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: t('itemDetails'),
        icon: EyeIcon,
        onClick: () => onViewDetails(sl),
      },
    ]
    if (canWrite && sl.status !== 'fulfilled') {
      actions.push(
        {
          label: t('scanReceipt'),
          icon: CameraIcon,
          onClick: () => onScanReceipt(sl),
        },
        {
          label: t('fulfillList'),
          icon: CheckCircleIcon,
          onClick: () => onFulfill(sl.id),
        },
      )
    }
    if (canWrite) {
      actions.push({
        label: t('deleteList'),
        icon: TrashIcon,
        onClick: () => onDelete(sl.id),
        variant: 'danger',
      })
    }
    return actions
  }

  if (supplyLists.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShoppingCartIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('noSupplyLists')}</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          {t('tryAdjustingFilters')}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[220px]">
              {t('property')}
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[110px]">
              {t('status')}
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[130px]">
              {t('items')}
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[220px] max-w-[300px]">
              {t('notes')}
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[130px]">
              {t('submitterLabel')}
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
              {t('invoiceDate')}
            </th>
            <th className="sticky right-0 bg-gray-50/95 backdrop-blur-sm px-6 py-4 min-w-[60px] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {supplyLists.map((sl, index) => {
            const statusInfo = SUPPLY_LIST_STATUS_INFO[sl.status]
            const badgeStyle = statusBadgeStyles[statusInfo.color] || 'bg-gray-100 text-gray-700'
            const purchased = sl.items.filter(i => i.isPurchased).length
            const propertyName = sl.propertyName || 'Unknown Property'
            const gradient = getPropertyGradient(propertyName)
            const itemPreview = sl.items.slice(0, 3).map(i => i.name).join(', ')

            return (
              <motion.tr
                key={sl.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                onClick={() => onViewDetails(sl)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-sm flex-shrink-0`}>
                      <span className="text-white font-semibold text-sm">
                        {propertyName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{propertyName}</p>
                      {itemPreview && (
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{itemPreview}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${badgeStyle}`}>
                      {statusInfo.label}
                    </span>
                    <NeedsReceiptBadge supplyList={sl} />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{sl.items.length} item{sl.items.length !== 1 ? 's' : ''}</span>
                    {purchased > 0 && (
                      <p className="text-xs text-teal-600">{purchased}/{sl.items.length} purchased</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 align-top max-w-[300px]">
                  {sl.notes ? (
                    <div className="flex items-start gap-1.5" title={sl.notes}>
                      <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm italic text-gray-600 line-clamp-2 whitespace-normal break-words">
                        {sl.notes}
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-300">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700">{sl.submitterName || '—'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="text-sm text-gray-900">{new Date(sl.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-xs text-gray-400">{formatSupplyListAge(sl.createdAt)}</p>
                  </div>
                </td>
                <td
                  className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TableActionsDropdown
                    actions={getActions(sl)}
                    itemId={sl.id}
                  />
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
