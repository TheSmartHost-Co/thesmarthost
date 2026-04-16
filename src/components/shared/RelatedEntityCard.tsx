'use client'

import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

const ENTITY_CONFIG = {
  receipt: {
    icon: DocumentTextIcon,
    defaultTitle: 'Receipt',
    iconColor: 'text-blue-500',
  },
  expense: {
    icon: CurrencyDollarIcon,
    defaultTitle: 'Expense',
    iconColor: 'text-green-600',
  },
  'supply-list': {
    icon: ClipboardDocumentListIcon,
    defaultTitle: 'Supply List',
    iconColor: 'text-purple-500',
  },
} as const

const STATUS_COLORS: Record<string, string> = {
  // Receipt statuses
  pending: 'bg-amber-100 text-amber-700',
  matched: 'bg-blue-100 text-blue-700',
  applied: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-100 text-red-700',
  // Supply list statuses
  in_progress: 'bg-blue-100 text-blue-700',
  fulfilled: 'bg-green-100 text-green-700',
  // Expense statuses
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700',
  reimbursed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

interface RelatedEntityCardProps {
  entityType: 'receipt' | 'expense' | 'supply-list'
  title: string
  subtitle?: string
  amount?: number | null
  status?: string
  onClick: () => void
  emptyText?: string
  onAction?: () => void
  actionLabel?: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function RelatedEntityCard({
  entityType,
  title,
  subtitle,
  amount,
  status,
  onClick,
  emptyText,
  onAction,
  actionLabel,
}: RelatedEntityCardProps) {
  const config = ENTITY_CONFIG[entityType]
  const Icon = config.icon

  // Empty state
  if (!title && emptyText) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
        <Icon className={`w-6 h-6 mx-auto mb-2 text-gray-300`} />
        <p className="text-sm text-gray-400">{emptyText}</p>
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
      </div>
    )
  }

  const statusClass = status ? STATUS_COLORS[status] || 'bg-gray-100 text-gray-600' : ''

  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors group cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {config.defaultTitle}
            </span>
            {status && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusClass}`}>
                {status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {subtitle && (
              <span className="text-xs text-gray-500">{subtitle}</span>
            )}
            {amount != null && (
              <span className="text-xs font-semibold text-gray-700 tabular-nums">
                {formatCurrency(amount)}
              </span>
            )}
          </div>
        </div>
        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 mt-1 group-hover:translate-x-0.5 transform" />
      </div>
    </button>
  )
}
