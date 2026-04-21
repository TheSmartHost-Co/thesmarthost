'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import type {
  CleanerPortfolioData,
  CleanerDelta,
  MetricDescription,
  InvoiceStatus,
} from '@/services/types/cleanerAnalytics'
import { SPEND_COLORS, DRIFT_THRESHOLD_PERCENT } from './constants'

interface SpendKPIStripProps {
  portfolio: CleanerPortfolioData
  metricDescriptions: Record<string, MetricDescription>
  showProjections: boolean
  onCardClick?: (status: InvoiceStatus | 'upcoming') => void
  activeInvoiceStatuses?: InvoiceStatus[]
  overdueTotals?: { overdueAmount: number; overdueCount: number; upcomingAmount: number; upcomingCount: number }
}

const fmtCurrency = (v: number) =>
  v.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtCurrencyFull = (v: number) =>
  v.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })

export default function SpendKPIStrip({
  portfolio,
  metricDescriptions,
  showProjections,
  onCardClick,
  activeInvoiceStatuses = [],
  overdueTotals,
}: SpendKPIStripProps) {
  const { current, delta } = portfolio

  // Use timeline-derived overdue/upcoming split when available, otherwise fall back to portfolio totals
  const overdueAmount = overdueTotals?.overdueAmount ?? 0
  const overdueCount = overdueTotals?.overdueCount ?? 0
  const upcomingAmount = overdueTotals
    ? overdueTotals.upcomingAmount + current.projectedInvoiceAmountForUnassignedProjects
    : current.projectedInvoiceAmountForPendingProjects + current.projectedInvoiceAmountForUnassignedProjects
  const upcomingCount = overdueTotals
    ? overdueTotals.upcomingCount + current.unassignedProjects
    : current.pendingProjects + current.unassignedProjects

  const cards: KPICardData[] = [
    {
      label: 'Paid',
      value: fmtCurrency(current.paidInvoicesAmount),
      subtitle: `${current.paidInvoicesCount} invoice${current.paidInvoicesCount !== 1 ? 's' : ''}`,
      color: SPEND_COLORS.paid,
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      delta: delta?.paidInvoicesAmount ?? null,
      descKey: 'paidInvoicesAmount',
      filterKey: 'paid' as InvoiceStatus | 'upcoming',
      isActive: activeInvoiceStatuses.length === 1 && activeInvoiceStatuses[0] === 'paid',
      ringClass: 'ring-emerald-400',
    },
    {
      label: 'Owed',
      value: fmtCurrency(current.unpaidInvoicesAmount),
      subtitle: `${current.unpaidInvoicesCount} unpaid invoice${current.unpaidInvoicesCount !== 1 ? 's' : ''}`,
      color: SPEND_COLORS.owed,
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      delta: delta?.unpaidInvoicesAmount ?? null,
      descKey: 'unpaidInvoicesAmount',
      filterKey: 'unpaid' as InvoiceStatus | 'upcoming',
      isActive: activeInvoiceStatuses.length === 1 && activeInvoiceStatuses[0] === 'unpaid',
      ringClass: 'ring-amber-400',
    },
    {
      label: 'Not Yet Billed',
      value: fmtCurrency(current.uninvoicedCompletedAmount),
      subtitle: `${current.uninvoicedCompletedCount} cleaning${current.uninvoicedCompletedCount !== 1 ? 's' : ''} pending invoice`,
      color: SPEND_COLORS.notBilled,
      bgClass: 'bg-red-50',
      textClass: 'text-red-700',
      delta: delta?.uninvoicedCompletedAmount ?? null,
      descKey: 'uninvoicedCompletedAmount',
      filterKey: 'uninvoiced' as InvoiceStatus | 'upcoming',
      isActive: activeInvoiceStatuses.length === 1 && activeInvoiceStatuses[0] === 'uninvoiced',
      ringClass: 'ring-red-400',
    },
    // Show Overdue card when there are past-due pending projects
    ...(overdueAmount > 0
      ? [
          {
            label: 'Overdue',
            value: fmtCurrency(overdueAmount),
            subtitle: `${overdueCount} past due`,
            color: SPEND_COLORS.overdue,
            bgClass: 'bg-red-50',
            textClass: 'text-red-700',
            delta: null as CleanerDelta | null,
            descKey: 'projectedInvoiceAmountForPendingProjects',
            filterKey: 'upcoming' as InvoiceStatus | 'upcoming',
            isActive: false,
            ringClass: 'ring-red-400',
          },
        ]
      : []),
    // Show Upcoming card when there are future pending projects
    ...(upcomingAmount > 0 || overdueAmount === 0
      ? [
          {
            label: 'Upcoming Spend',
            value: fmtCurrency(upcomingAmount),
            subtitle: `${upcomingCount} scheduled`,
            color: SPEND_COLORS.upcoming,
            bgClass: 'bg-blue-50',
            textClass: 'text-blue-700',
            delta: null as CleanerDelta | null,
            descKey: 'projectedInvoiceAmountForPendingProjects',
            filterKey: 'upcoming' as InvoiceStatus | 'upcoming',
            isActive: false,
            ringClass: 'ring-blue-400',
          },
        ]
      : []),
  ]

  // Reconciliation
  const projected = current.projectedInvoiceAmountForCompletedProjects
  const billed = current.paidInvoicesAmount + current.unpaidInvoicesAmount + current.uninvoicedCompletedAmount
  const drift = billed - projected
  const driftPct = projected > 0 ? Math.abs(drift / projected) * 100 : 0
  const driftExceeds = driftPct > DRIFT_THRESHOLD_PERCENT

  return (
    <div className="px-4 py-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(card => (
          <KPICard
            key={card.label}
            card={card}
            metricDescriptions={metricDescriptions}
            onClick={onCardClick ? () => onCardClick(card.filterKey) : undefined}
          />
        ))}
      </div>

      {/* Reconciliation footnote */}
      <AnimatePresence>
        {showProjections && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-xs ${
                driftExceeds ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-600'
              }`}
            >
              <span>
                Projected cost of completed: <strong>{fmtCurrencyFull(projected)}</strong>
              </span>
              <span className="text-gray-300">·</span>
              <span>
                Billed (paid+owed+not-billed): <strong>{fmtCurrencyFull(billed)}</strong>
              </span>
              <span className="text-gray-300">·</span>
              <span className={driftExceeds ? 'font-semibold text-amber-700' : ''}>
                Drift: {drift >= 0 ? '+' : ''}{fmtCurrencyFull(drift)}
                {projected > 0 && ` (${driftPct.toFixed(1)}%)`}
                {driftExceeds && ' ⚠'}
              </span>
              <Tooltip text={metricDescriptions?.projectedInvoiceAmountForCompletedProjects?.description} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Sub-components ---

interface KPICardData {
  label: string
  value: string
  subtitle: string
  color: string
  bgClass: string
  textClass: string
  delta: CleanerDelta | null
  descKey: string
  filterKey: InvoiceStatus | 'upcoming'
  isActive: boolean
  ringClass: string
}

function KPICard({
  card,
  metricDescriptions,
  onClick,
}: {
  card: KPICardData
  metricDescriptions: Record<string, MetricDescription>
  onClick?: () => void
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={`relative rounded-xl ${card.bgClass} px-3 py-2.5 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : ''
      } ${card.isActive ? `ring-2 ${card.ringClass} shadow-md` : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-gray-500">
          {card.label}
          {card.isActive && <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider opacity-60">filtered</span>}
        </p>
        <Tooltip text={metricDescriptions?.[card.descKey]?.description} />
      </div>
      <p className={`mt-1 text-lg font-bold tabular-nums ${card.textClass}`}>{card.value}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-[10px] text-gray-400">{card.subtitle}</p>
        {card.delta && <DeltaBadge delta={card.delta} />}
      </div>
    </div>
  )
}

function DeltaBadge({ delta }: { delta: CleanerDelta }) {
  if (delta.percentage === null && delta.absolute === 0) return null

  const isPositive = delta.absolute > 0
  const isNeutral = delta.absolute === 0

  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
        isNeutral
          ? 'bg-gray-100 text-gray-500'
          : isPositive
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-red-100 text-red-700'
      }`}
    >
      {isPositive ? '↑' : isNeutral ? '—' : '↓'}
      {delta.percentage !== null ? ` ${Math.abs(delta.percentage).toFixed(0)}%` : ''}
    </span>
  )
}

function Tooltip({ text }: { text?: string }) {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMouseEnter = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - 208), // 208 = tooltip width (w-52)
      })
    }
    setShow(true)
  }

  if (!text) return null

  return (
    <>
      <button
        ref={buttonRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
        className="text-gray-300 hover:text-gray-500"
      >
        <InformationCircleIcon className="h-3.5 w-3.5" />
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {show && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none fixed z-[100] w-52 rounded-lg bg-gray-900 px-3 py-2 text-[10px] leading-relaxed text-gray-200 shadow-lg"
                style={{ top: pos.top, left: pos.left }}
              >
                {text}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
