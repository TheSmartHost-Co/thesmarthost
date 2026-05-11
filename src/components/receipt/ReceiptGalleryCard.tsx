'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import type { UploadedReceipt, ReceiptStatus } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'
import TableActionsDropdown from '@/components/shared/TableActionsDropdown'
import type { ActionItem } from '@/components/shared/TableActionsDropdown'
import ReceiptThumbnail from '@/components/shared/ReceiptThumbnail'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import PropertyChip from './PropertyChip'

const statusConfig: Record<ReceiptStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  matched: { label: 'Ready', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  applied: { label: 'Applied', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  archived: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

interface ReceiptGalleryCardProps {
  receipt: UploadedReceipt
  onOpen: (id: string) => void
  actions: ActionItem[]
  properties?: Property[]
}

const ReceiptGalleryCard: React.FC<ReceiptGalleryCardProps> = ({
  receipt,
  onOpen,
  actions,
  properties,
}) => {
  const { t } = useTranslation('expenses')
  const status = statusConfig[receipt.status] || statusConfig.pending

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

  return (
    <div
      onClick={() => onOpen(receipt.id)}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-all group ${
        receipt.status === 'archived' ? 'opacity-60' : ''
      }`}
    >
      {/* Image area */}
      <div className="relative h-48 bg-gray-100">
        <ReceiptThumbnail
          signedUrl={receipt.signedUrl}
          mimeType={receipt.mimeType}
          originalName={receipt.originalName}
          imgClassName="w-full h-full object-cover"
          pdfRenderWidth={500}
          fallback={
            <div className="flex items-center justify-center h-full w-full">
              <DocumentTextIcon className="w-12 h-12 text-gray-300" />
            </div>
          }
        />

        {/* Status badge */}
        <span
          className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>

        {/* Actions */}
        <div
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <TableActionsDropdown actions={actions} itemId={receipt.id} />
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {receipt.vendorName || receipt.originalName}
            </p>
            {receipt.uploaderName && (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                by {receipt.uploaderName}
              </p>
            )}
          </div>
          <span className="text-sm font-bold text-gray-900 flex-shrink-0">
            {formatCurrency(receipt.total)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1.5">
          <p className="text-xs text-gray-400 flex-shrink-0">
            {formatDate(receipt.expenseDate || receipt.createdAt)}
          </p>
          <PropertyChip receipt={receipt} properties={properties} size="sm" />
        </div>

        {/* Quick actions */}
        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-2.5 pt-2.5 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
            {actions.map((action) => {
              const Icon = action.icon
              const isDanger = action.variant === 'danger'
              const isHighlight = action.variant === 'highlight'
              return (
                <button
                  key={action.label}
                  onClick={() => action.onClick()}
                  title={action.label}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    isDanger
                      ? 'text-red-600 hover:bg-red-50'
                      : isHighlight
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                  {action.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReceiptGalleryCard
