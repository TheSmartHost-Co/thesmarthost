'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import type { DateRange, ExpenseDrilldownData, DrilldownExpense } from '@/services/types/expenseAnalytics'
import type { CategoryInfo } from './useExpenseTimeline'
import { PAYMENT_STATUS_COLORS } from './constants'

interface ExpenseDrilldownModalProps {
  dateRange: DateRange
  data: ExpenseDrilldownData | null
  page: number
  onPageChange: (page: number) => void
  onClose: () => void
  isLoading: boolean
  categoryMap: Map<string, CategoryInfo>
}

const fmtCurrency = (v: number) =>
  v.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })

const fmtDate = (d: string) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ExpenseDrilldownModal({
  dateRange,
  data,
  page,
  onPageChange,
  onClose,
  isLoading,
  categoryMap,
}: ExpenseDrilldownModalProps) {
  const [mounted, setMounted] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      setMounted(false)
      document.body.style.overflow = 'auto'
    }
  }, [])

  // Reset expanded rows on page change
  useEffect(() => {
    setExpandedRows(new Set())
  }, [page])

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expenses = data?.expenses || []
  const pagination = data?.pagination

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  const periodLabel = formatPeriodLabel(dateRange)

  if (!mounted) return null

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <BanknotesIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">Expense Drilldown</h2>
              <p className="text-sm text-gray-500">
                {periodLabel}
                {!isLoading && pagination && (
                  <span className="ml-2 text-gray-400">
                    &middot; {pagination.total} expense{pagination.total !== 1 ? 's' : ''} &middot; {fmtCurrency(totalAmount)}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex h-48 items-center justify-center">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">No expenses found</p>
                  <p className="mt-1 text-xs text-gray-400">No expenses in this period</p>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="sticky top-0 z-10 bg-gray-50 text-left">
                    <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      Category
                    </th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      Property
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="w-10 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, index) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      index={index}
                      expanded={expandedRows.has(expense.id)}
                      onToggle={() => toggleRow(expense.id)}
                      categoryMap={categoryMap}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={!pagination.hasPrev}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-900">
                {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={!pagination.hasNext}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

// --- Expense Row ---

function ExpenseRow({
  expense,
  index,
  expanded,
  onToggle,
  categoryMap,
}: {
  expense: DrilldownExpense
  index: number
  expanded: boolean
  onToggle: () => void
  categoryMap: Map<string, CategoryInfo>
}) {
  const catInfo = categoryMap.get(expense.category)
  const statusColor = PAYMENT_STATUS_COLORS[expense.paymentStatus]
  const hasLineItems = expense.lineItems && expense.lineItems.length > 0
  const hasTax = expense.taxBreakdown && expense.taxBreakdown.total > 0

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02, duration: 0.2 }}
        className="border-b border-gray-50 transition-colors hover:bg-gray-50/50"
      >
        <td className="px-6 py-3 text-xs text-gray-900">{fmtDate(expense.expenseDate)}</td>
        <td className="px-4 py-3">
          {catInfo ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: catInfo.colorHex + '15',
                color: catInfo.colorHex,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: catInfo.colorHex }}
              />
              {catInfo.label}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{expense.category || '—'}</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-700">{expense.vendorName || '—'}</td>
        <td className="px-4 py-3 text-xs text-gray-700">{expense.propertyName || 'Unassigned'}</td>
        <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-gray-900">
          {fmtCurrency(expense.amount)}
        </td>
        <td className="px-4 py-3">
          {statusColor ? (
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusColor.bg} ${statusColor.text}`}
            >
              {expense.paymentStatus}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{expense.paymentStatus}</span>
          )}
        </td>
        <td className="px-2 py-3">
          {(hasLineItems || hasTax) && (
            <button
              onClick={onToggle}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              {expanded ? (
                <ChevronUpIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </td>
      </motion.tr>

      {/* Expanded details */}
      {expanded && (hasLineItems || hasTax) && (
        <tr>
          <td colSpan={7} className="bg-gray-50/50 px-6 py-3">
            <div className="space-y-3">
              {/* Line Items */}
              {hasLineItems && (
                <div>
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    Line Items
                  </p>
                  <div className="space-y-1">
                    {expense.lineItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                          {item.description}
                          {item.quantity > 1 && (
                            <span className="ml-1 text-gray-400">
                              &times; {item.quantity} @ {fmtCurrency(item.unitCost)}
                            </span>
                          )}
                        </span>
                        <span className="font-medium tabular-nums text-gray-900">
                          {fmtCurrency(item.totalCost)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tax Breakdown */}
              {hasTax && (
                <div>
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    Tax Breakdown
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    {expense.taxBreakdown.gst > 0 && (
                      <span>GST: {fmtCurrency(expense.taxBreakdown.gst)}</span>
                    )}
                    {expense.taxBreakdown.pst > 0 && (
                      <span>PST: {fmtCurrency(expense.taxBreakdown.pst)}</span>
                    )}
                    {expense.taxBreakdown.hst > 0 && (
                      <span>HST: {fmtCurrency(expense.taxBreakdown.hst)}</span>
                    )}
                    <span className="font-medium text-gray-900">
                      Total Tax: {fmtCurrency(expense.taxBreakdown.total)}
                    </span>
                  </div>
                </div>
              )}

              {/* Description */}
              {expense.description && (
                <p className="text-xs text-gray-500 italic">{expense.description}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// --- Helpers ---

function formatPeriodLabel(range: DateRange): string {
  const start = new Date(range.startDate + 'T00:00:00')
  const end = new Date(range.endDate + 'T00:00:00')

  // Same day
  if (range.startDate === range.endDate) {
    return start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Same month
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
  }

  // Different months
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}
