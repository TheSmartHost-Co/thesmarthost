'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentTextIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import ReceiptThumbnail from '@/components/shared/ReceiptThumbnail'
import { parseLocalDate } from '@/utils/dateUtils'
import type {
  ClientPortalReceipt,
  ClientPortalReceiptStatus,
} from '@/services/types/clientPortal'

const STATUS_CONFIG: Record<
  ClientPortalReceiptStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  matched: { label: 'Matched', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  applied: { label: 'Applied', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  archived: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

const formatCurrency = (value: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value)
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return parseLocalDate(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface ClientReceiptGalleryCardProps {
  receipt: ClientPortalReceipt
  onOpen: (id: string) => void
}

const ClientReceiptGalleryCard: React.FC<ClientReceiptGalleryCardProps> = ({
  receipt,
  onOpen,
}) => {
  const { t } = useTranslation('clientPortal')
  const status = STATUS_CONFIG[receipt.status] || STATUS_CONFIG.pending

  return (
    <button
      type="button"
      onClick={() => onOpen(receipt.id)}
      className={`w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-all ${
        receipt.status === 'archived' ? 'opacity-60' : ''
      }`}
    >
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

        <span
          className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {receipt.vendorName || t('unknownVendor')}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(receipt.expenseDate || receipt.createdAt)}
            </p>
          </div>
          <span className="text-sm font-bold text-gray-900 shrink-0">
            {formatCurrency(receipt.total)}
          </span>
        </div>

        {receipt.propertyName && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
            <BuildingOffice2Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <p className="text-xs text-gray-500 truncate">{receipt.propertyName}</p>
          </div>
        )}
      </div>
    </button>
  )
}

export default ClientReceiptGalleryCard
