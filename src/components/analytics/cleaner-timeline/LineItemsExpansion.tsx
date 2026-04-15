'use client'

import { motion } from 'framer-motion'
import type { CleanerLineItem } from '@/services/types/cleanerAnalytics'
import { SPEND_COLORS } from './constants'

interface LineItemsExpansionProps {
  items: CleanerLineItem[]
  isLoading: boolean
  highlightOverrides: boolean
  hideCleaner?: boolean
}

const fmtCurrency = (v: number) =>
  v.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })

const BUCKET_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: SPEND_COLORS.paid },
  unpaid: { bg: 'bg-amber-50', text: 'text-amber-700', dot: SPEND_COLORS.owed },
  uninvoiced: { bg: 'bg-red-50', text: 'text-red-700', dot: SPEND_COLORS.notBilled },
}

export default function LineItemsExpansion({
  items,
  isLoading,
  highlightOverrides,
  hideCleaner = false,
}: LineItemsExpansionProps) {
  if (isLoading) {
    return (
      <div className="px-4 py-3">
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-xs text-gray-400">
        No line items found
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col className="w-[72px]" />
            <col className={hideCleaner ? 'w-[220px]' : 'w-[180px]'} />
            {!hideCleaner && <col className="w-[100px]" />}
            <col className="w-[80px]" />
            <col className="w-[80px]" />
            <col className="w-[90px]" />
            <col className="w-[110px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Property</th>
              {!hideCleaner && <th className="px-3 py-2 text-left font-medium text-gray-500">Cleaner</th>}
              <th className="px-3 py-2 text-left font-medium text-gray-500">Invoice</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Rate</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const style = BUCKET_STYLES[item.bucket] ?? BUCKET_STYLES.uninvoiced
              const isOverride = highlightOverrides && item.isManualOverride

              return (
                <tr
                  key={item.projectId}
                  className={`border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                    isOverride ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                    {new Date(item.projectDate + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    <span className="block max-w-[180px] truncate" title={item.propertyName}>
                      {item.propertyName}
                    </span>
                  </td>
                  {!hideCleaner && <td className="px-3 py-2 text-gray-700">{item.cleanerName}</td>}
                  <td className="px-3 py-2 text-gray-500">
                    {item.invoiceNumber ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
                      {item.bucket}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-gray-900">
                    {fmtCurrency(item.amount)}
                    {isOverride && (
                      <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700">
                        override
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                    {item.rateType === 'flat'
                      ? `Flat ${fmtCurrency(item.rateAmount ?? 0)}`
                      : item.rateType === 'hourly'
                        ? `${fmtCurrency(item.rateAmount ?? 0)}/hr${item.durationMinutes ? ` · ${(item.durationMinutes / 60).toFixed(1)}h` : ''}`
                        : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
