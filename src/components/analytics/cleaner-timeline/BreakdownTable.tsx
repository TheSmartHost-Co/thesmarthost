'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronDownIcon, TableCellsIcon } from '@heroicons/react/24/outline'
import LineItemsExpansion from './LineItemsExpansion'
import type {
  DateRange,
  CleanerBreakdown,
  CleanerPropertyBreakdown,
  CleanerPortfolioData,
  CleanerLineItem,
  CleanerDelta,
} from '@/services/types/cleanerAnalytics'
import type { AnalyticsTab, BreakdownView } from './constants'
import { DRIFT_THRESHOLD_PERCENT } from './constants'

interface BreakdownTableProps {
  activeTab: AnalyticsTab
  breakdownView: BreakdownView
  onBreakdownViewChange: (view: BreakdownView) => void
  byCleaner: CleanerBreakdown[]
  byProperty: CleanerPropertyBreakdown[]
  portfolio: CleanerPortfolioData
  showProjections: boolean
  lineItems: CleanerLineItem[]
  lineItemsLoading: boolean
  onFetchLineItems: (cleanerId?: string | null, propertyIds?: string[] | null) => Promise<CleanerLineItem[]>
  dateRange: DateRange
}

const fmtCurrency = (v: number) =>
  v.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

// --- Helpers ---

interface PropertyPaymentAgg {
  propertyId: string
  propertyName: string
  paid: number
  owed: number
  notBilled: number
  paidCount: number
  owedCount: number
  notBilledCount: number
}

function groupLineItemsByProperty(items: CleanerLineItem[]): Map<string, PropertyPaymentAgg> {
  const map = new Map<string, PropertyPaymentAgg>()

  for (const item of items) {
    const existing = map.get(item.propertyId) ?? {
      propertyId: item.propertyId,
      propertyName: item.propertyName,
      paid: 0, owed: 0, notBilled: 0,
      paidCount: 0, owedCount: 0, notBilledCount: 0,
    }

    if (item.bucket === 'paid') {
      existing.paid += item.amount
      existing.paidCount++
    } else if (item.bucket === 'unpaid') {
      existing.owed += item.amount
      existing.owedCount++
    } else {
      existing.notBilled += item.amount
      existing.notBilledCount++
    }

    map.set(item.propertyId, existing)
  }

  return map
}

export default function BreakdownTable({
  activeTab,
  breakdownView,
  onBreakdownViewChange,
  byCleaner,
  byProperty,
  showProjections,
  lineItems,
  lineItemsLoading,
  onFetchLineItems,
}: BreakdownTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [lineItemsRow, setLineItemsRow] = useState<string | null>(null)

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleViewLineItems = useCallback(
    async (cleanerId: string) => {
      if (lineItemsRow === cleanerId) {
        setLineItemsRow(null)
        return
      }
      setLineItemsRow(cleanerId)
      await onFetchLineItems(cleanerId)
    },
    [lineItemsRow, onFetchLineItems]
  )

  return (
    <div className="border-t border-gray-100">
      {/* Sub-tab header */}
      <div className="flex items-center gap-1 border-b border-gray-100 px-4 py-2">
        <button
          onClick={() => onBreakdownViewChange('byCleaner')}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
            breakdownView === 'byCleaner'
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          By Cleaner
        </button>
        <button
          onClick={() => onBreakdownViewChange('byProperty')}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
            breakdownView === 'byProperty'
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          By Property
        </button>
      </div>

      {/* Desktop: Table */}
      <div className="hidden overflow-x-auto sm:block">
        {activeTab === 'spend' ? (
          breakdownView === 'byCleaner' ? (
            <SpendByCleanerTable
              data={byCleaner}
              showProjections={showProjections}
              expandedRows={expandedRows}
              toggleRow={toggleRow}
              lineItemsRow={lineItemsRow}
              lineItems={lineItems}
              lineItemsLoading={lineItemsLoading}
              onViewLineItems={handleViewLineItems}
              onFetchLineItems={onFetchLineItems}
            />
          ) : (
            <SpendByPropertyTable
              data={byProperty}
              showProjections={showProjections}
              lineItems={lineItems}
              lineItemsLoading={lineItemsLoading}
              onFetchLineItems={onFetchLineItems}
            />
          )
        ) : breakdownView === 'byCleaner' ? (
          <WorkloadByCleanerTable
            data={byCleaner}
            expandedRows={expandedRows}
            toggleRow={toggleRow}
          />
        ) : (
          <WorkloadByPropertyTable data={byProperty} />
        )}
      </div>

      {/* Mobile: Card layout */}
      <div className="sm:hidden">
        {activeTab === 'spend' ? (
          breakdownView === 'byCleaner' ? (
            <MobileSpendByCleanerCards
              data={byCleaner}
              showProjections={showProjections}
              expandedRows={expandedRows}
              toggleRow={toggleRow}
            />
          ) : (
            <MobileSpendByPropertyCards data={byProperty} showProjections={showProjections} />
          )
        ) : breakdownView === 'byCleaner' ? (
          <MobileWorkloadByCleanerCards
            data={byCleaner}
            expandedRows={expandedRows}
            toggleRow={toggleRow}
          />
        ) : (
          <MobileWorkloadByPropertyCards data={byProperty} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Spend — By Cleaner
// ============================================================================

function SpendByCleanerTable({
  data,
  showProjections,
  expandedRows,
  toggleRow,
  lineItemsRow,
  lineItems,
  lineItemsLoading,
  onViewLineItems,
  onFetchLineItems,
}: {
  data: CleanerBreakdown[]
  showProjections: boolean
  expandedRows: Set<string>
  toggleRow: (id: string) => void
  lineItemsRow: string | null
  lineItems: CleanerLineItem[]
  lineItemsLoading: boolean
  onViewLineItems: (cleanerId: string) => void
  onFetchLineItems: (cleanerId?: string | null, propertyIds?: string[] | null) => Promise<CleanerLineItem[]>
}) {
  // Cache line items per cleaner for enriched accordion
  const [cleanerItemsCache, setCleanerItemsCache] = useState<Record<string, CleanerLineItem[]>>({})
  const [loadingCleaners, setLoadingCleaners] = useState<Set<string>>(new Set())
  const fetchedRef = useRef<Set<string>>(new Set())

  // Auto-fetch line items when a row is expanded (if not already cached)
  useEffect(() => {
    for (const cleanerId of expandedRows) {
      if (!cleanerItemsCache[cleanerId] && !fetchedRef.current.has(cleanerId)) {
        fetchedRef.current.add(cleanerId)
        setLoadingCleaners(prev => new Set(prev).add(cleanerId))

        onFetchLineItems(cleanerId).then(items => {
          setCleanerItemsCache(prev => ({ ...prev, [cleanerId]: items }))
          setLoadingCleaners(prev => {
            const next = new Set(prev)
            next.delete(cleanerId)
            return next
          })
        })
      }
    }
  }, [expandedRows, cleanerItemsCache, onFetchLineItems])

  const sorted = [...data].sort(
    (a, b) => b.current.paidInvoicesAmount + b.current.unpaidInvoicesAmount - (a.current.paidInvoicesAmount + a.current.unpaidInvoicesAmount)
  )

  const colCount = showProjections ? 10 : 8

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <th className="w-8 px-2 py-2" />
          <th className="px-3 py-2 text-left font-medium text-gray-500">Cleaner</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Completed</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Paid</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Owed</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Not Billed</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Upcoming</th>
          {showProjections && (
            <>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Projected</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Drift</th>
            </>
          )}
          <th className="px-3 py-2 text-right font-medium text-gray-500">Δ</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(cleaner => {
          const c = cleaner.current
          const isExpanded = expandedRows.has(cleaner.cleanerId)
          const showingLineItems = lineItemsRow === cleaner.cleanerId
          const projected = c.projectedInvoiceAmountForCompletedProjects
          const billed = c.paidInvoicesAmount + c.unpaidInvoicesAmount + c.uninvoicedCompletedAmount
          const drift = billed - projected
          const driftPct = projected > 0 ? Math.abs(drift / projected) * 100 : 0
          const driftExceeds = driftPct > DRIFT_THRESHOLD_PERCENT

          // Per-property payment aggregation from cached line items
          const cachedItems = cleanerItemsCache[cleaner.cleanerId]
          const isLoadingItems = loadingCleaners.has(cleaner.cleanerId)
          const paymentByProperty = cachedItems ? groupLineItemsByProperty(cachedItems) : null

          return (
            <React.Fragment key={cleaner.cleanerId}>
              {/* Main row */}
              <tr
                className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50"
                onClick={() => toggleRow(cleaner.cleanerId)}
              >
                <td className="px-2 py-2.5">
                  <ChevronDownIcon
                    className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-900">{cleaner.cleanerName}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{c.completedProjects}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{fmtCurrency(c.paidInvoicesAmount)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">{fmtCurrency(c.unpaidInvoicesAmount)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-red-700">{fmtCurrency(c.uninvoicedCompletedAmount)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-blue-700">{fmtCurrency(c.projectedInvoiceAmountForPendingProjects)}</td>
                {showProjections && (
                  <>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{fmtCurrency(projected)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <DriftChip
                        drift={drift}
                        exceeds={driftExceeds}
                        onClick={e => {
                          e.stopPropagation()
                          onViewLineItems(cleaner.cleanerId)
                        }}
                      />
                    </td>
                  </>
                )}
                <td className="px-3 py-2.5 text-right">
                  <DeltaInline delta={cleaner.delta?.paidInvoicesAmount ?? null} />
                </td>
              </tr>

              {/* Expanded: per-property rows aligned with parent columns */}
              {isExpanded && cleaner.properties.map(prop => {
                const agg = paymentByProperty?.get(prop.propertyId)
                const rateLabel = prop.rateType
                  ? prop.rateType === 'flat'
                    ? `Flat ${fmtCurrency(prop.rateAmount ?? 0)}`
                    : `${fmtCurrency(prop.rateAmount ?? 0)}/hr`
                  : null

                return (
                  <tr key={`${cleaner.cleanerId}-${prop.propertyId}`} className="border-b border-gray-50 bg-gray-50/30">
                    <td className="px-2 py-1.5" />
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2 pl-2">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                        <span className="truncate text-[11px] text-gray-600" title={prop.propertyName}>
                          {prop.propertyName}
                        </span>
                        {rateLabel && (
                          <span className="shrink-0 rounded bg-gray-200/70 px-1.5 py-0.5 text-[9px] text-gray-500">
                            {rateLabel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right text-[11px] tabular-nums text-gray-600">
                      {prop.completedProjects}
                    </td>
                    {/* Paid */}
                    <td className="px-3 py-1.5 text-right text-[11px] tabular-nums">
                      {isLoadingItems ? (
                        <span className="inline-block h-3 w-10 animate-pulse rounded bg-gray-200" />
                      ) : agg && agg.paid > 0 ? (
                        <span className="text-emerald-600">{fmtCurrency(agg.paid)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {/* Owed */}
                    <td className="px-3 py-1.5 text-right text-[11px] tabular-nums">
                      {isLoadingItems ? (
                        <span className="inline-block h-3 w-10 animate-pulse rounded bg-gray-200" />
                      ) : agg && agg.owed > 0 ? (
                        <span className="text-amber-600">{fmtCurrency(agg.owed)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {/* Not Billed */}
                    <td className="px-3 py-1.5 text-right text-[11px] tabular-nums">
                      {isLoadingItems ? (
                        <span className="inline-block h-3 w-10 animate-pulse rounded bg-gray-200" />
                      ) : agg && agg.notBilled > 0 ? (
                        <span className="text-red-600">{fmtCurrency(agg.notBilled)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {/* Upcoming */}
                    <td className="px-3 py-1.5 text-right text-[11px] tabular-nums">
                      {prop.pendingProjects > 0 ? (
                        <span className="text-blue-600">{fmtCurrency(prop.projectedInvoiceAmountForPendingProjects)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {showProjections && (
                      <>
                        <td className="px-3 py-1.5" />
                        <td className="px-3 py-1.5" />
                      </>
                    )}
                    <td className="px-3 py-1.5" />
                  </tr>
                )
              })}

              {/* View line items button row */}
              {isExpanded && (
                <tr className="border-b border-gray-100 bg-gray-50/30">
                  <td className="px-2 py-1.5" />
                  <td colSpan={colCount - 1} className="px-3 py-1.5">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onViewLineItems(cleaner.cleanerId)
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                        showingLineItems
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                      }`}
                    >
                      <TableCellsIcon className="h-3.5 w-3.5" />
                      {showingLineItems ? 'Hide individual projects' : 'View individual projects'}
                    </button>
                  </td>
                </tr>
              )}

              {/* Inline line items */}
              {isExpanded && showingLineItems && (
                <tr className="border-b border-gray-50">
                  <td colSpan={colCount} className="p-0">
                    <LineItemsExpansion
                      items={lineItems}
                      isLoading={lineItemsLoading}
                      highlightOverrides={showProjections}
                      hideCleaner
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

// ============================================================================
// Spend — By Property (with expandable line items)
// ============================================================================

function SpendByPropertyTable({
  data,
  showProjections,
  lineItems,
  lineItemsLoading,
  onFetchLineItems,
}: {
  data: CleanerPropertyBreakdown[]
  showProjections: boolean
  lineItems: CleanerLineItem[]
  lineItemsLoading: boolean
  onFetchLineItems: (cleanerId?: string | null, propertyIds?: string[] | null) => Promise<CleanerLineItem[]>
}) {
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null)
  const [propertyItemsCache, setPropertyItemsCache] = useState<Record<string, CleanerLineItem[]>>({})
  const [loadingProperty, setLoadingProperty] = useState<string | null>(null)

  const toggleProperty = useCallback(
    async (propertyId: string) => {
      if (expandedProperty === propertyId) {
        setExpandedProperty(null)
        return
      }
      setExpandedProperty(propertyId)

      if (!propertyItemsCache[propertyId]) {
        setLoadingProperty(propertyId)
        const items = await onFetchLineItems(null, [propertyId])
        setPropertyItemsCache(prev => ({ ...prev, [propertyId]: items }))
        setLoadingProperty(null)
      }
    },
    [expandedProperty, propertyItemsCache, onFetchLineItems]
  )

  const sorted = [...data].sort(
    (a, b) => b.current.paidInvoicesAmount + b.current.unpaidInvoicesAmount - (a.current.paidInvoicesAmount + a.current.unpaidInvoicesAmount)
  )

  const colCount = showProjections ? 10 : 8

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <th className="w-8 px-2 py-2" />
          <th className="px-3 py-2 text-left font-medium text-gray-500">Property</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Completed</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Paid</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Owed</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Not Billed</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Upcoming</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Cleaners</th>
          {showProjections && (
            <>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Projected</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Drift</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {sorted.map(prop => {
          const p = prop.current
          const isExpanded = expandedProperty === prop.propertyId
          const projected = p.projectedInvoiceAmountForCompletedProjects
          const billed = p.paidInvoicesAmount + p.unpaidInvoicesAmount + p.uninvoicedCompletedAmount
          const drift = billed - projected
          const driftPct = projected > 0 ? Math.abs(drift / projected) * 100 : 0
          const driftExceeds = driftPct > DRIFT_THRESHOLD_PERCENT

          // Use cached items for this property, or the global lineItems if this property's row triggered the last fetch
          const expandedItems = propertyItemsCache[prop.propertyId] ?? (isExpanded ? lineItems : [])
          const isLoadingThis = loadingProperty === prop.propertyId || (isExpanded && lineItemsLoading && !propertyItemsCache[prop.propertyId])

          return (
            <React.Fragment key={prop.propertyId}>
              <tr
                className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50"
                onClick={() => toggleProperty(prop.propertyId)}
              >
                <td className="px-2 py-2.5">
                  <ChevronDownIcon
                    className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-900">{prop.propertyName}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{p.completedProjects}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{fmtCurrency(p.paidInvoicesAmount)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">{fmtCurrency(p.unpaidInvoicesAmount)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-red-700">{fmtCurrency(p.uninvoicedCompletedAmount)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-blue-700">
                  {fmtCurrency(p.projectedInvoiceAmountForPendingProjects + p.projectedInvoiceAmountForUnassignedProjects)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{p.cleanerCount}</td>
                {showProjections && (
                  <>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{fmtCurrency(projected)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <DriftChip drift={drift} exceeds={driftExceeds} />
                    </td>
                  </>
                )}
              </tr>

              {/* Expanded: line items for this property */}
              {isExpanded && (
                <tr className="border-b border-gray-50">
                  <td colSpan={colCount} className="p-0">
                    <LineItemsExpansion
                      items={expandedItems}
                      isLoading={isLoadingThis}
                      highlightOverrides={showProjections}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

// ============================================================================
// Workload — By Cleaner
// ============================================================================

function WorkloadByCleanerTable({
  data,
  expandedRows,
  toggleRow,
}: {
  data: CleanerBreakdown[]
  expandedRows: Set<string>
  toggleRow: (id: string) => void
}) {
  const sorted = [...data].sort(
    (a, b) => (b.current.completedProjects + b.current.pendingProjects) - (a.current.completedProjects + a.current.pendingProjects)
  )

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <th className="w-8 px-2 py-2" />
          <th className="px-3 py-2 text-left font-medium text-gray-500">Cleaner</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Completed</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Upcoming</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Projects/wk</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Hours</th>
          <th className="px-3 py-2 text-left font-medium text-gray-500">Properties</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(cleaner => {
          const c = cleaner.current
          const total = c.completedProjects + c.pendingProjects
          const isExpanded = expandedRows.has(cleaner.cleanerId)
          const activeProps = cleaner.properties.filter(
            p => p.completedProjects > 0 || p.pendingProjects > 0
          )

          return (
            <React.Fragment key={cleaner.cleanerId}>
              <tr
                className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50"
                onClick={() => toggleRow(cleaner.cleanerId)}
              >
                <td className="px-2 py-2.5">
                  <ChevronDownIcon
                    className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-900">{cleaner.cleanerName}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{c.completedProjects}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-blue-700">{c.pendingProjects}</td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums text-gray-900">{total}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{c.projectsPerWeek.toFixed(1)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{c.totalHoursWorked.toFixed(1)}</td>
                <td className="max-w-[200px] truncate px-3 py-2.5 text-gray-500">
                  {activeProps.map(p => p.propertyName).join(', ') || '—'}
                </td>
              </tr>

              {/* Expanded: per-property breakdown rows */}
              {isExpanded && activeProps.map(prop => {
                const propTotal = prop.completedProjects + prop.pendingProjects
                const projectedCost = prop.projectedInvoiceAmountForCompletedProjects + prop.projectedInvoiceAmountForPendingProjects
                return (
                  <tr key={prop.propertyId} className="border-b border-gray-50 bg-gray-50/30">
                    <td className="px-2 py-1.5" />
                    <td className="py-1.5 pl-6 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                        <span className="truncate text-[11px] text-gray-600" title={prop.propertyName}>
                          {prop.propertyName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right text-[11px] tabular-nums text-emerald-600">{prop.completedProjects}</td>
                    <td className="px-3 py-1.5 text-right text-[11px] tabular-nums text-blue-600">{prop.pendingProjects}</td>
                    <td className="px-3 py-1.5 text-right text-[11px] font-medium tabular-nums text-gray-700">{propTotal}</td>
                    <td className="px-3 py-1.5 text-right text-[11px] tabular-nums text-gray-400">
                      {prop.projectsPerWeek > 0 ? prop.projectsPerWeek.toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-[11px] tabular-nums text-gray-400">
                      {prop.totalHoursWorked > 0 ? `${prop.totalHoursWorked.toFixed(1)}` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-[11px] tabular-nums text-gray-500">
                      {projectedCost > 0 ? `$${projectedCost.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </React.Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

// ============================================================================
// Workload — By Property
// ============================================================================

function WorkloadByPropertyTable({ data }: { data: CleanerPropertyBreakdown[] }) {
  const sorted = [...data].sort(
    (a, b) => b.current.projectCount - a.current.projectCount
  )

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <th className="px-3 py-2 text-left font-medium text-gray-500">Property</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Completed</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Pending</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Unassigned</th>
          <th className="px-3 py-2 text-right font-medium text-gray-500">Cleaners</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(prop => {
          const p = prop.current
          return (
            <tr key={prop.propertyId} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
              <td className="px-3 py-2.5 font-medium text-gray-900">{prop.propertyName}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{p.completedProjects}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-blue-700">{p.pendingProjects}</td>
              <td className={`px-3 py-2.5 text-right tabular-nums ${p.unassignedProjects > 0 ? 'font-medium text-red-700' : 'text-gray-500'}`}>
                {p.unassignedProjects}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{p.cleanerCount}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ============================================================================
// Mobile Card Layouts
// ============================================================================

function MobileSpendByCleanerCards({
  data,
  showProjections,
  expandedRows,
  toggleRow,
}: {
  data: CleanerBreakdown[]
  showProjections: boolean
  expandedRows: Set<string>
  toggleRow: (id: string) => void
}) {
  const sorted = [...data].sort(
    (a, b) => b.current.paidInvoicesAmount + b.current.unpaidInvoicesAmount - (a.current.paidInvoicesAmount + a.current.unpaidInvoicesAmount)
  )

  return (
    <div className="divide-y divide-gray-100">
      {sorted.map(cleaner => {
        const c = cleaner.current
        const isExpanded = expandedRows.has(cleaner.cleanerId)
        const total = c.paidInvoicesAmount + c.unpaidInvoicesAmount + c.uninvoicedCompletedAmount

        return (
          <div key={cleaner.cleanerId}>
            <button
              onClick={() => toggleRow(cleaner.cleanerId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-900">{cleaner.cleanerName}</p>
                <p className="text-[11px] text-gray-500">{c.completedProjects} completed</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium tabular-nums text-gray-900">{fmtCurrency(total)}</p>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-50 bg-gray-50/50 px-4 py-3">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-500">Paid</span>
                    <p className="font-medium tabular-nums text-emerald-700">{fmtCurrency(c.paidInvoicesAmount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Owed</span>
                    <p className="font-medium tabular-nums text-amber-700">{fmtCurrency(c.unpaidInvoicesAmount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Not Billed</span>
                    <p className="font-medium tabular-nums text-red-700">{fmtCurrency(c.uninvoicedCompletedAmount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Upcoming</span>
                    <p className="font-medium tabular-nums text-blue-700">{fmtCurrency(c.projectedInvoiceAmountForPendingProjects)}</p>
                  </div>
                  {showProjections && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Projected</span>
                      <p className="font-medium tabular-nums text-gray-600">{fmtCurrency(c.projectedInvoiceAmountForCompletedProjects)}</p>
                    </div>
                  )}
                </div>
                {/* Per-property breakdown */}
                {cleaner.properties.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-gray-200 pt-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Properties</p>
                    {cleaner.properties.map(prop => (
                      <div key={prop.propertyId} className="flex items-center justify-between text-[11px]">
                        <span className="truncate text-gray-600">{prop.propertyName}</span>
                        <span className="shrink-0 tabular-nums text-gray-700">{prop.completedProjects} jobs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MobileSpendByPropertyCards({
  data,
  showProjections,
}: {
  data: CleanerPropertyBreakdown[]
  showProjections: boolean
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const sorted = [...data].sort(
    (a, b) => b.current.paidInvoicesAmount + b.current.unpaidInvoicesAmount - (a.current.paidInvoicesAmount + a.current.unpaidInvoicesAmount)
  )

  return (
    <div className="divide-y divide-gray-100">
      {sorted.map(prop => {
        const p = prop.current
        const isExpanded = expanded === prop.propertyId
        const total = p.paidInvoicesAmount + p.unpaidInvoicesAmount + p.uninvoicedCompletedAmount

        return (
          <div key={prop.propertyId}>
            <button
              onClick={() => setExpanded(isExpanded ? null : prop.propertyId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-900">{prop.propertyName}</p>
                <p className="text-[11px] text-gray-500">{p.completedProjects} completed · {p.cleanerCount} cleaners</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium tabular-nums text-gray-900">{fmtCurrency(total)}</p>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-50 bg-gray-50/50 px-4 py-3">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-500">Paid</span>
                    <p className="font-medium tabular-nums text-emerald-700">{fmtCurrency(p.paidInvoicesAmount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Owed</span>
                    <p className="font-medium tabular-nums text-amber-700">{fmtCurrency(p.unpaidInvoicesAmount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Not Billed</span>
                    <p className="font-medium tabular-nums text-red-700">{fmtCurrency(p.uninvoicedCompletedAmount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Upcoming</span>
                    <p className="font-medium tabular-nums text-blue-700">
                      {fmtCurrency(p.projectedInvoiceAmountForPendingProjects + p.projectedInvoiceAmountForUnassignedProjects)}
                    </p>
                  </div>
                  {showProjections && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Projected</span>
                      <p className="font-medium tabular-nums text-gray-600">{fmtCurrency(p.projectedInvoiceAmountForCompletedProjects)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MobileWorkloadByCleanerCards({
  data,
  expandedRows,
  toggleRow,
}: {
  data: CleanerBreakdown[]
  expandedRows: Set<string>
  toggleRow: (id: string) => void
}) {
  const sorted = [...data].sort(
    (a, b) => (b.current.completedProjects + b.current.pendingProjects) - (a.current.completedProjects + a.current.pendingProjects)
  )

  return (
    <div className="divide-y divide-gray-100">
      {sorted.map(cleaner => {
        const c = cleaner.current
        const total = c.completedProjects + c.pendingProjects
        const isExpanded = expandedRows.has(cleaner.cleanerId)
        const activeProps = cleaner.properties.filter(p => p.completedProjects > 0 || p.pendingProjects > 0)

        return (
          <div key={cleaner.cleanerId}>
            <button
              onClick={() => toggleRow(cleaner.cleanerId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-900">{cleaner.cleanerName}</p>
                <div className="flex gap-3 text-[11px]">
                  <span className="text-emerald-700">{c.completedProjects} done</span>
                  <span className="text-blue-700">{c.pendingProjects} upcoming</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium tabular-nums text-gray-900">{total} total</p>
                <p className="text-[11px] tabular-nums text-gray-500">{c.projectsPerWeek.toFixed(1)}/wk</p>
              </div>
            </button>

            {isExpanded && activeProps.length > 0 && (
              <div className="border-t border-gray-50 bg-gray-50/50 px-4 py-3">
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                  <div>
                    <span className="text-gray-500">Hours</span>
                    <p className="font-medium text-gray-700">{c.totalHoursWorked.toFixed(1)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Properties</span>
                    <p className="font-medium text-gray-700">{activeProps.length}</p>
                  </div>
                </div>
                <div className="space-y-1.5 border-t border-gray-200 pt-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Properties</p>
                  {activeProps.map(prop => (
                    <div key={prop.propertyId} className="flex items-center justify-between text-[11px]">
                      <span className="truncate text-gray-600">{prop.propertyName}</span>
                      <span className="shrink-0 tabular-nums">
                        <span className="text-emerald-600">{prop.completedProjects}</span>
                        {prop.pendingProjects > 0 && <span className="text-blue-600"> + {prop.pendingProjects}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MobileWorkloadByPropertyCards({ data }: { data: CleanerPropertyBreakdown[] }) {
  const sorted = [...data].sort((a, b) => b.current.projectCount - a.current.projectCount)

  return (
    <div className="divide-y divide-gray-100">
      {sorted.map(prop => {
        const p = prop.current
        return (
          <div key={prop.propertyId} className="px-4 py-3">
            <p className="truncate text-xs font-medium text-gray-900">{prop.propertyName}</p>
            <div className="mt-1.5 flex gap-4 text-[11px]">
              <div>
                <span className="text-gray-500">Done </span>
                <span className="font-medium tabular-nums text-emerald-700">{p.completedProjects}</span>
              </div>
              <div>
                <span className="text-gray-500">Pending </span>
                <span className="font-medium tabular-nums text-blue-700">{p.pendingProjects}</span>
              </div>
              <div>
                <span className="text-gray-500">Unassigned </span>
                <span className={`font-medium tabular-nums ${p.unassignedProjects > 0 ? 'text-red-700' : 'text-gray-500'}`}>{p.unassignedProjects}</span>
              </div>
              <div>
                <span className="text-gray-500">Cleaners </span>
                <span className="font-medium tabular-nums text-gray-700">{p.cleanerCount}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Shared sub-components
// ============================================================================

function DeltaInline({ delta }: { delta: CleanerDelta | null }) {
  if (!delta || (delta.percentage === null && delta.absolute === 0)) return <span className="text-gray-300">—</span>

  const isPositive = delta.absolute > 0
  return (
    <span className={`text-[10px] font-medium tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
      {isPositive ? '↑' : '↓'}
      {delta.percentage !== null ? ` ${Math.abs(delta.percentage).toFixed(0)}%` : ''}
    </span>
  )
}

function DriftChip({
  drift,
  exceeds,
  onClick,
}: {
  drift: number
  exceeds: boolean
  onClick?: (e: React.MouseEvent) => void
}) {
  if (!exceeds) {
    return <span className="text-[10px] text-emerald-600">✓</span>
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-amber-700 transition-colors hover:bg-amber-200"
    >
      {drift >= 0 ? '+' : ''}{fmtCurrency(drift)} ⚠
    </button>
  )
}
