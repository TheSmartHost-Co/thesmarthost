'use client'

import { motion } from 'framer-motion'
import type { AnalyticsTab } from './constants'
import { SPEND_COLORS, WORKLOAD_COLORS } from './constants'

interface PremiumTooltipProps {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
  activeTab: AnalyticsTab
  granularity: string
}

const currencyFmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const currencyFmtFull = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function PremiumTooltip({
  active,
  payload,
  label,
  activeTab,
  granularity,
}: PremiumTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const dataPoint = payload[0]?.payload as Record<string, number | string> | undefined
  if (!dataPoint) return null

  const granularityLabel =
    granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="pointer-events-none rounded-xl border border-gray-100 bg-white/95 p-4 shadow-2xl backdrop-blur-sm"
      style={{ minWidth: 220 }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {granularityLabel}
        </span>
      </div>

      {/* Body */}
      {activeTab === 'spend' ? (
        <SpendTooltipBody dataPoint={dataPoint} />
      ) : (
        <WorkloadTooltipBody dataPoint={dataPoint} />
      )}
    </motion.div>
  )
}

function SpendTooltipBody({ dataPoint }: { dataPoint: Record<string, number | string> }) {
  const paid = (dataPoint.paidInvoicesAmount as number) || 0
  const owed = (dataPoint.unpaidInvoicesAmount as number) || 0
  const notBilled = (dataPoint.uninvoicedCompletedAmount as number) || 0
  const overdue = (dataPoint.overdueAmount as number) || 0
  const upcoming = (dataPoint.upcomingAmount as number) || 0
  const total = paid + owed + notBilled + overdue + upcoming

  const rows = [
    { color: SPEND_COLORS.paid, label: 'Paid', amount: paid },
    { color: SPEND_COLORS.owed, label: 'Owed', amount: owed },
    { color: SPEND_COLORS.notBilled, label: 'Not Billed', amount: notBilled },
    { color: SPEND_COLORS.overdue, label: 'Overdue', amount: overdue },
    { color: SPEND_COLORS.upcoming, label: 'Upcoming', amount: upcoming },
  ].filter(r => r.amount > 0)

  const maxVal = Math.max(...rows.map(r => r.amount), 1)

  return (
    <div className="space-y-2">
      {rows.map(row => (
        <TooltipRow
          key={row.label}
          color={row.color}
          label={row.label}
          amount={row.amount}
          barWidth={(row.amount / maxVal) * 100}
        />
      ))}
      <div className="mt-2 border-t border-gray-100 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-900">
            Total {currencyFmtFull.format(total)}
          </span>
        </div>
      </div>
    </div>
  )
}

function WorkloadTooltipBody({ dataPoint }: { dataPoint: Record<string, number | string> }) {
  const completed = (dataPoint.completedProjects as number) || 0
  const pending = (dataPoint.pendingProjects as number) || 0
  const total = completed + pending
  const hours = (dataPoint.totalHoursWorked as number) || 0

  return (
    <div className="space-y-2">
      <TooltipRow
        color={WORKLOAD_COLORS.completed}
        label="Completed"
        amount={completed}
        barWidth={total > 0 ? (completed / total) * 100 : 0}
        isCount
      />
      <TooltipRow
        color={WORKLOAD_COLORS.pending}
        label="Pending"
        amount={pending}
        barWidth={total > 0 ? (pending / total) * 100 : 0}
        isCount
      />
      <div className="mt-2 border-t border-gray-100 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-900">
            {total} project{total !== 1 ? 's' : ''}
          </span>
          {hours > 0 && (
            <span className="text-[10px] text-gray-400">{hours.toFixed(1)}h</span>
          )}
        </div>
      </div>
    </div>
  )
}

function TooltipRow({
  color,
  label,
  amount,
  barWidth,
  isCount,
}: {
  color: string
  label: string
  amount: number
  barWidth: number
  isCount?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0 flex-1 truncate text-xs text-gray-600">{label}</span>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-900">
        {isCount ? amount : currencyFmt.format(amount)}
      </span>
      <div className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.max(barWidth, 2)}%`, backgroundColor: color, opacity: 0.8 }}
        />
      </div>
    </div>
  )
}
