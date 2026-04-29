'use client'

import React from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  XCircleIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import type { BulkRowState } from '../BulkUploadReceiptModal'

interface ScanStepProps {
  rows: BulkRowState[]
  scanRunning: boolean
  scannedCount: number
  failedCount: number
  onRetry: (row: BulkRowState) => void
  onSkip: (id: string) => void
  onUploadAnyway: (row: BulkRowState) => void
}

function StatusBadge({ status }: { status: BulkRowState['status'] }) {
  const config: Record<
    BulkRowState['status'],
    { label: string; bg: string; text: string; Icon: React.ElementType }
  > = {
    queued: { label: 'Queued', bg: 'bg-gray-100', text: 'text-gray-600', Icon: ClockIcon },
    scanning: {
      label: 'Scanning',
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      Icon: ArrowPathIcon,
    },
    scanned: {
      label: 'Scanned',
      bg: 'bg-green-100',
      text: 'text-green-700',
      Icon: CheckCircleIcon,
    },
    failed: {
      label: 'Failed',
      bg: 'bg-red-100',
      text: 'text-red-700',
      Icon: ExclamationCircleIcon,
    },
    skipped: {
      label: 'Skipped',
      bg: 'bg-slate-100',
      text: 'text-slate-500',
      Icon: XCircleIcon,
    },
    duplicate: {
      label: 'Duplicate',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      Icon: DocumentDuplicateIcon,
    },
    applying: { label: 'Applying', bg: 'bg-blue-100', text: 'text-blue-700', Icon: ArrowPathIcon },
    applied: {
      label: 'Applied',
      bg: 'bg-green-100',
      text: 'text-green-700',
      Icon: CheckCircleIcon,
    },
    'apply-failed': {
      label: 'Apply failed',
      bg: 'bg-red-100',
      text: 'text-red-700',
      Icon: ExclamationCircleIcon,
    },
  }
  const c = config[status]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${c.bg} ${c.text}`}
    >
      <c.Icon
        className={`w-3.5 h-3.5 ${status === 'scanning' || status === 'applying' ? 'animate-spin' : ''}`}
      />
      {c.label}
    </span>
  )
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const ScanStep: React.FC<ScanStepProps> = ({
  rows,
  scanRunning,
  scannedCount,
  failedCount,
  onRetry,
  onSkip,
  onUploadAnyway,
}) => {
  const total = rows.length

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {scanRunning
                ? 'Scanning receipts…'
                : scannedCount === total
                ? 'All scanned'
                : `${scannedCount} of ${total} scanned`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {failedCount > 0
                ? `${failedCount} failed — retry or skip below`
                : 'AI extracts vendor, date, and totals from each receipt'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-mono">
              {scannedCount}/{total}
            </span>
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${total === 0 ? 0 : (scannedCount / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-[26rem] overflow-y-auto">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`flex items-center justify-between px-4 py-3 ${
              row.status === 'skipped' || row.status === 'duplicate' ? 'opacity-70' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {row.file.name}
                </p>
                <StatusBadge status={row.status} />
              </div>
              {row.status === 'scanned' && row.extracted && (
                <p className="text-xs text-gray-500 truncate">
                  {row.extracted.vendorName || 'Unknown vendor'} ·{' '}
                  {row.extracted.expenseDate || 'No date'} ·{' '}
                  {row.extracted.total != null
                    ? `$${Number(row.extracted.total).toFixed(2)}`
                    : 'No total'}
                </p>
              )}
              {row.status === 'failed' && row.errorMessage && (
                <p className="text-xs text-red-600 truncate">{row.errorMessage}</p>
              )}
              {row.status === 'duplicate' && row.duplicateOf && (
                <p
                  className="text-xs text-amber-700 truncate"
                  aria-label={`Duplicate of ${row.duplicateOf.originalName}${
                    row.duplicateOf.vendorName ? ` from ${row.duplicateOf.vendorName}` : ''
                  }${
                    row.duplicateOf.createdAt ? ` uploaded ${formatDate(row.duplicateOf.createdAt)}` : ''
                  }`}
                >
                  {row.duplicateOf.source === 'in-batch'
                    ? `Duplicate of "${row.duplicateOf.originalName}" earlier in this batch`
                    : `Already uploaded as "${row.duplicateOf.originalName}"${
                        row.duplicateOf.vendorName ? ` from ${row.duplicateOf.vendorName}` : ''
                      }${
                        row.duplicateOf.createdAt ? ` on ${formatDate(row.duplicateOf.createdAt)}` : ''
                      }`}
                </p>
              )}
            </div>
            {row.status === 'failed' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onRetry(row)}
                  className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  Retry
                </button>
                <button
                  onClick={() => onSkip(row.id)}
                  className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded-md"
                >
                  Skip
                </button>
              </div>
            )}
            {row.status === 'duplicate' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onUploadAnyway(row)}
                  className="px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-md"
                >
                  Upload anyway
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ScanStep
