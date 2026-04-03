'use client'

import React from 'react'
import type { UploadedReceipt, ReceiptStatus } from '@/services/types/receipt'
import TableActionsDropdown from '@/components/shared/TableActionsDropdown'
import type { ActionItem } from '@/components/shared/TableActionsDropdown'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

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
}

const ReceiptGalleryCard: React.FC<ReceiptGalleryCardProps> = ({
  receipt,
  onOpen,
  actions,
}) => {
  const status = statusConfig[receipt.status] || statusConfig.pending
  const isImage = receipt.mimeType?.startsWith('image/')

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
        {isImage && receipt.signedUrl ? (
          <img
            src={receipt.signedUrl}
            alt={receipt.originalName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <DocumentTextIcon className="w-12 h-12 text-gray-300" />
          </div>
        )}

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
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {receipt.vendorName || receipt.originalName}
        </p>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {receipt.propertyName || 'No property'}
        </p>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-xs text-gray-400">
            {formatDate(receipt.expenseDate || receipt.createdAt)}
          </span>
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(receipt.total)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ReceiptGalleryCard
