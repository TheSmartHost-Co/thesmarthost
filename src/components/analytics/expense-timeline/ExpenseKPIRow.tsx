'use client'

import { useState } from 'react'
import { KPICard, KPICardSkeleton } from '@/components/analytics/shared/KPICard'
import {
  BanknotesIcon,
  ReceiptPercentIcon,
  CalculatorIcon,
  ArrowPathRoundedSquareIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline'
import type { ExpensePortfolioData } from '@/services/types/expenseAnalytics'

interface ExpenseKPIRowProps {
  portfolio: ExpensePortfolioData | null
  isLoading: boolean
}

export default function ExpenseKPIRow({ portfolio, isLoading }: ExpenseKPIRowProps) {
  const [hoveredTax, setHoveredTax] = useState(false)

  if (isLoading || !portfolio) {
    return (
      <div className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <KPICardSkeleton key={i} size="compact" />
        ))}
      </div>
    )
  }

  const { current, delta } = portfolio

  return (
    <div className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-3 lg:grid-cols-5">
      <KPICard
        label="Total Expenses"
        value={current.totalAmount}
        delta={delta?.totalAmount}
        format="currency"
        icon={<BanknotesIcon className="h-4 w-4" />}
        accentColor="emerald"
        size="compact"
        delay={0}
      />
      <KPICard
        label="Expense Count"
        value={current.expenseCount}
        delta={delta?.expenseCount}
        format="number"
        icon={<ReceiptPercentIcon className="h-4 w-4" />}
        accentColor="blue"
        size="compact"
        delay={0.05}
      />
      <KPICard
        label="Avg Expense"
        value={current.avgExpenseAmount}
        delta={delta?.avgExpenseAmount}
        format="currency"
        icon={<CalculatorIcon className="h-4 w-4" />}
        accentColor="violet"
        size="compact"
        delay={0.1}
      />
      <KPICard
        label="Reimbursable"
        value={current.reimbursableAmount}
        delta={delta?.reimbursableAmount}
        format="currency"
        icon={<ArrowPathRoundedSquareIcon className="h-4 w-4" />}
        accentColor="amber"
        size="compact"
        delay={0.15}
      />

      {/* Tax Deductible with hover tooltip */}
      <div
        className="relative"
        onMouseEnter={() => setHoveredTax(true)}
        onMouseLeave={() => setHoveredTax(false)}
      >
        <KPICard
          label="Tax Deductible"
          value={current.taxDeductibleAmount}
          delta={delta?.taxDeductibleAmount}
          format="currency"
          icon={<DocumentCheckIcon className="h-4 w-4" />}
          accentColor="rose"
          size="compact"
          delay={0.2}
        />
        {hoveredTax && current.taxBreakdown && (
          <div className="absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Tax Breakdown
            </p>
            <div className="space-y-0.5 text-xs">
              {current.taxBreakdown.gst > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">GST</span>
                  <span className="font-medium text-gray-900">
                    ${current.taxBreakdown.gst.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {current.taxBreakdown.pst > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">PST</span>
                  <span className="font-medium text-gray-900">
                    ${current.taxBreakdown.pst.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {current.taxBreakdown.hst > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">HST</span>
                  <span className="font-medium text-gray-900">
                    ${current.taxBreakdown.hst.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-0.5">
                <span className="font-medium text-gray-700">Total</span>
                <span className="font-semibold text-gray-900">
                  ${current.taxBreakdown.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
