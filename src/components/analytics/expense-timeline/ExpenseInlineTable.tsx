'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline'
import type {
  DrilldownExpense,
  DrilldownPagination,
  ExpenseDrilldownData,
} from '@/services/types/expenseAnalytics'
import type { CrossFilter, CategoryInfo } from './useExpenseTimeline'
import { PAYMENT_STATUS_COLORS, PAID_BY_TYPE_COLORS } from './constants'

interface ExpenseInlineTableProps {
  data: ExpenseDrilldownData | null
  isLoading: boolean
  crossFilter: CrossFilter | null
  categoryMap: Map<string, CategoryInfo>
  onClearCrossFilter: () => void
  onPageChange: (page: number) => void
}

export default function ExpenseInlineTable({
  data,
  isLoading,
  crossFilter,
  categoryMap,
  onClearCrossFilter,
  onPageChange,
}: ExpenseInlineTableProps) {
  const expenses = data?.expenses ?? []
  const pagination = data?.pagination ?? null

  return (
    <div className="border-t border-gray-100 px-5 pb-5 pt-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Expense Details
          {pagination && (
            <span className="ml-2 font-normal text-gray-400">
              ({pagination.total} total)
            </span>
          )}
        </h4>

        {/* Active cross-filter chip */}
        {crossFilter && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
          >
            Filtered by: {crossFilter.source === 'property' ? 'Property' : crossFilter.source === 'category' ? 'Category' : 'Period'}
            <button
              onClick={onClearCrossFilter}
              className="rounded-full p-0.5 hover:bg-indigo-100"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </motion.span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && expenses.length === 0 && (
        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-8">
          <p className="text-sm text-gray-400">No expenses found</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && expenses.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-100 sm:block">
            <table className="w-full min-w-[800px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="w-8 px-2 py-2.5" />
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Property</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Category</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Vendor</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500">Amount</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Paid By</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Method</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500">Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map(expense => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    categoryMap={categoryMap}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 sm:hidden">
            {expenses.map(expense => (
              <MobileExpenseCard
                key={expense.id}
                expense={expense}
                categoryMap={categoryMap}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-3 w-3" />
                  Prev
                </button>
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRightIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// --- Expandable Row ---

function ExpenseRow({
  expense,
  categoryMap,
}: {
  expense: DrilldownExpense
  categoryMap: Map<string, CategoryInfo>
}) {
  const [expanded, setExpanded] = useState(false)
  const catInfo = categoryMap.get(expense.category)
  const statusColors = PAYMENT_STATUS_COLORS[expense.paymentStatus] || PAYMENT_STATUS_COLORS.pending
  const paidByColors = expense.paidByType ? PAID_BY_TYPE_COLORS[expense.paidByType] : null

  const formattedDate = new Date(expense.expenseDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const formatMethod = (method: string | null) => {
    if (!method) return '—'
    return method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatPaidByType = (type: string | null) => {
    if (!type) return null
    switch (type) {
      case 'PROPERTY-MANAGER': return 'PM'
      case 'CLEANER': return 'Cleaner'
      case 'OWNER': return 'Owner'
      default: return type
    }
  }

  return (
    <>
      <tr
        className="cursor-pointer transition-colors hover:bg-gray-50/80"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand toggle */}
        <td className="px-2 py-2.5 text-center">
          {(expense.lineItems.length > 0 || expense.taxBreakdown.total > 0) && (
            expanded ? (
              <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
            )
          )}
        </td>

        {/* Date */}
        <td className="px-3 py-2.5 text-gray-700">{formattedDate}</td>

        {/* Property */}
        <td className="max-w-[140px] truncate px-3 py-2.5 text-gray-700">
          {expense.propertyName || '—'}
        </td>

        {/* Category */}
        <td className="px-3 py-2.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: (catInfo?.colorHex || '#6B7280') + '15',
              color: catInfo?.colorHex || '#6B7280',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: catInfo?.colorHex || '#6B7280' }} />
            {catInfo?.label || expense.category}
          </span>
        </td>

        {/* Vendor */}
        <td className="max-w-[120px] truncate px-3 py-2.5 text-gray-700">
          {expense.vendorName || '—'}
        </td>

        {/* Amount + indicators */}
        <td className="px-3 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {expense.isReimbursable && (
              <ArrowPathRoundedSquareIcon className="h-3 w-3 text-amber-500" title="Reimbursable" />
            )}
            {expense.isTaxDeductible && (
              <DocumentCheckIcon className="h-3 w-3 text-rose-500" title="Tax Deductible" />
            )}
            <span className="font-medium text-gray-900">
              ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </td>

        {/* Paid By */}
        <td className="px-3 py-2.5">
          {expense.paidById ? (
            <div className="flex items-center gap-1.5">
              {paidByColors && (
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${paidByColors.bg} ${paidByColors.text}`}>
                  {formatPaidByType(expense.paidByType)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>

        {/* Method */}
        <td className="px-3 py-2.5 text-gray-600">
          {formatMethod(expense.paymentMethod)}
        </td>

        {/* Status */}
        <td className="px-3 py-2.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors.bg} ${statusColors.text}`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColors.dot }} />
            {expense.paymentStatus.charAt(0).toUpperCase() + expense.paymentStatus.slice(1)}
          </span>
        </td>

        {/* Tax */}
        <td className="px-3 py-2.5 text-right">
          <div className="group relative">
            <span className="text-gray-600">
              {expense.taxBreakdown.total > 0
                ? `$${expense.taxBreakdown.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : '—'}
            </span>
            {expense.taxBreakdown.total > 0 && (
              <div className="invisible absolute bottom-full right-0 z-30 mb-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] shadow-lg group-hover:visible">
                {expense.taxBreakdown.gst > 0 && <div className="flex justify-between gap-3"><span className="text-gray-500">GST</span><span>${expense.taxBreakdown.gst.toFixed(2)}</span></div>}
                {expense.taxBreakdown.pst > 0 && <div className="flex justify-between gap-3"><span className="text-gray-500">PST</span><span>${expense.taxBreakdown.pst.toFixed(2)}</span></div>}
                {expense.taxBreakdown.hst > 0 && <div className="flex justify-between gap-3"><span className="text-gray-500">HST</span><span>${expense.taxBreakdown.hst.toFixed(2)}</span></div>}
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={10} className="bg-gray-50/50 p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-8 py-3 space-y-3">
                  {/* Description */}
                  {expense.description && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium text-gray-500">Note:</span> {expense.description}
                    </p>
                  )}

                  {/* Line Items */}
                  {expense.lineItems.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Line Items
                      </p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="pb-1 text-left font-medium">Description</th>
                            <th className="pb-1 text-center font-medium">Qty</th>
                            <th className="pb-1 text-right font-medium">Unit Cost</th>
                            <th className="pb-1 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {expense.lineItems.map(item => (
                            <tr key={item.id}>
                              <td className="py-1 text-gray-700">{item.description}</td>
                              <td className="py-1 text-center text-gray-600">{item.quantity}</td>
                              <td className="py-1 text-right text-gray-600">${item.unitCost.toFixed(2)}</td>
                              <td className="py-1 text-right font-medium text-gray-700">${item.totalCost.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tax Breakdown */}
                  {expense.taxBreakdown.total > 0 && (
                    <div className="inline-flex gap-4 rounded-lg bg-white px-3 py-2 text-xs border border-gray-100">
                      {expense.taxBreakdown.gst > 0 && (
                        <span className="text-gray-500">GST: <span className="font-medium text-gray-700">${expense.taxBreakdown.gst.toFixed(2)}</span></span>
                      )}
                      {expense.taxBreakdown.pst > 0 && (
                        <span className="text-gray-500">PST: <span className="font-medium text-gray-700">${expense.taxBreakdown.pst.toFixed(2)}</span></span>
                      )}
                      {expense.taxBreakdown.hst > 0 && (
                        <span className="text-gray-500">HST: <span className="font-medium text-gray-700">${expense.taxBreakdown.hst.toFixed(2)}</span></span>
                      )}
                      <span className="font-medium text-gray-700">
                        Total: ${expense.taxBreakdown.total.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

// --- Mobile Expense Card ---

function MobileExpenseCard({
  expense,
  categoryMap,
}: {
  expense: DrilldownExpense
  categoryMap: Map<string, CategoryInfo>
}) {
  const [expanded, setExpanded] = useState(false)
  const catInfo = categoryMap.get(expense.category)
  const statusColors = PAYMENT_STATUS_COLORS[expense.paymentStatus] || PAYMENT_STATUS_COLORS.pending

  const formattedDate = new Date(expense.expenseDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const formatMethod = (method: string | null) => {
    if (!method) return '—'
    return method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">{formattedDate}</span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
              style={{
                backgroundColor: (catInfo?.colorHex || '#6B7280') + '15',
                color: catInfo?.colorHex || '#6B7280',
              }}
            >
              {catInfo?.label || expense.category}
            </span>
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusColors.bg} ${statusColors.text}`}>
              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: statusColors.dot }} />
              {expense.paymentStatus.charAt(0).toUpperCase() + expense.paymentStatus.slice(1)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-700">{expense.propertyName || 'No property'}</p>
          {expense.vendorName && (
            <p className="truncate text-[11px] text-gray-500">{expense.vendorName}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-gray-900">
            ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-end gap-1">
            {expense.isReimbursable && (
              <ArrowPathRoundedSquareIcon className="h-3 w-3 text-amber-500" />
            )}
            {expense.isTaxDeductible && (
              <DocumentCheckIcon className="h-3 w-3 text-rose-500" />
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-50 bg-gray-50/50"
          >
            <div className="space-y-2 px-3 py-3">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500">Method</span>
                  <p className="font-medium text-gray-700">{formatMethod(expense.paymentMethod)}</p>
                </div>
                {expense.taxBreakdown.total > 0 && (
                  <div>
                    <span className="text-gray-500">Tax</span>
                    <p className="font-medium text-gray-700">${expense.taxBreakdown.total.toFixed(2)}</p>
                  </div>
                )}
              </div>
              {expense.description && (
                <p className="text-[11px] text-gray-600">{expense.description}</p>
              )}
              {expense.lineItems.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Line Items</p>
                  {expense.lineItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-[11px]">
                      <span className="truncate text-gray-600">{item.description} x{item.quantity}</span>
                      <span className="shrink-0 font-medium text-gray-700">${item.totalCost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
