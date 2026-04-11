'use client'

import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  ArrowPathIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import type { PreviewBookingRow, PreviewExpenseRow, EnhancedReportSummary } from '@/services/types/report'

// ─── Column definitions ───

interface ColumnDef {
  key: string
  label: string
  format?: 'currency' | 'number' | 'date' | 'boolean'
}

const BOOKING_COLUMNS_CONDENSED: ColumnDef[] = [
  { key: 'propertyName', label: 'Property' },
  { key: 'guestName', label: 'Guest' },
  { key: 'checkInDate', label: 'Check-in', format: 'date' },
  { key: 'checkOutDate', label: 'Check-out', format: 'date' },
  { key: 'numNights', label: 'Nights', format: 'number' },
  { key: 'platform', label: 'Platform' },
  { key: 'totalPayout', label: 'Total Payout', format: 'currency' },
  { key: 'netEarnings', label: 'Net Earnings', format: 'currency' },
]

const BOOKING_COLUMNS_ALL: ColumnDef[] = [
  { key: 'propertyName', label: 'Property' },
  { key: 'guestName', label: 'Guest' },
  { key: 'reservationCode', label: 'Res. Code' },
  { key: 'platform', label: 'Platform' },
  { key: 'checkInDate', label: 'Check-in', format: 'date' },
  { key: 'checkOutDate', label: 'Check-out', format: 'date' },
  { key: 'numNights', label: 'Nights', format: 'number' },
  { key: 'nightlyRate', label: 'Nightly Rate', format: 'currency' },
  { key: 'extraGuestFees', label: 'Extra Guest', format: 'currency' },
  { key: 'bedLinenFee', label: 'Bed Linen', format: 'currency' },
  { key: 'cleaningFee', label: 'Cleaning', format: 'currency' },
  { key: 'salesTax', label: 'Sales Tax', format: 'currency' },
  { key: 'lodgingTax', label: 'Lodging Tax', format: 'currency' },
  { key: 'gst', label: 'GST', format: 'currency' },
  { key: 'qst', label: 'QST', format: 'currency' },
  { key: 'channelFee', label: 'Channel Fee', format: 'currency' },
  { key: 'stripeFee', label: 'Stripe Fee', format: 'currency' },
  { key: 'mgmtFee', label: 'Mgmt Fee', format: 'currency' },
  { key: 'cohostFee', label: 'Cohost Fee', format: 'currency' },
  { key: 'totalPayout', label: 'Total Payout', format: 'currency' },
  { key: 'mgmtCleaningFee', label: 'Mgmt+Clean', format: 'currency' },
  { key: 'clientNetEarnings', label: 'Client Net', format: 'currency' },
  { key: 'netEarnings', label: 'Net Earnings', format: 'currency' },
  { key: 'rentCollectedDb', label: 'Rent Collected', format: 'currency' },
  { key: 'taxesCollectedDb', label: 'Taxes Collected', format: 'currency' },
]

const EXPENSE_COLUMNS_CONDENSED: ColumnDef[] = [
  { key: 'propertyName', label: 'Property' },
  { key: 'vendorName', label: 'Vendor' },
  { key: 'expenseDate', label: 'Date', format: 'date' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount', format: 'currency' },
  { key: 'description', label: 'Description' },
]

const EXPENSE_COLUMNS_ALL: ColumnDef[] = [
  { key: 'propertyName', label: 'Property' },
  { key: 'vendorName', label: 'Vendor' },
  { key: 'expenseDate', label: 'Date', format: 'date' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount', format: 'currency' },
  { key: 'currency', label: 'Currency' },
  { key: 'description', label: 'Description' },
  { key: 'bookingGuestName', label: 'Booking Guest' },
  { key: 'bookingReservationCode', label: 'Booking Code' },
  { key: 'paymentMethod', label: 'Payment' },
  { key: 'paymentStatus', label: 'Status' },
  { key: 'isReimbursable', label: 'Reimbursable', format: 'boolean' },
  { key: 'isTaxDeductible', label: 'Tax Deductible', format: 'boolean' },
]

// ─── Helpers ───

function formatCellValue(value: unknown, format?: string): string {
  if (value == null) return '-'
  if (format === 'currency') {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value)
    return isNaN(num) ? '-' : `$${num.toFixed(2)}`
  }
  if (format === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

// ─── Props ───

interface PreviewDataStepProps {
  bookings: PreviewBookingRow[]
  expenses: PreviewExpenseRow[]
  summary: EnhancedReportSummary
  generating: boolean
  onGenerate: () => void
  onRefresh: () => void
  refreshing: boolean
  onBack: () => void
  onEditBooking: (bookingId: string) => void
  onEditExpense: (expenseId: string) => void
}

// ─── Component ───

const PreviewDataStep: React.FC<PreviewDataStepProps> = ({
  bookings,
  expenses,
  summary,
  generating,
  onGenerate,
  onRefresh,
  refreshing,
  onBack,
  onEditBooking,
  onEditExpense,
}) => {
  const [showAllBookingCols, setShowAllBookingCols] = useState(false)
  const [showAllExpenseCols, setShowAllExpenseCols] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['bookings']))

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {/* ─── Bookings Table ─── */}
        <CollapsibleSection
          title="Bookings"
          sectionKey="bookings"
          expanded={expandedSections.has('bookings')}
          onToggle={toggleSection}
          badge={`${bookings.length}`}
        >
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={() => setShowAllBookingCols(!showAllBookingCols)}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {showAllBookingCols ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
              {showAllBookingCols ? 'Show Less' : 'Show All Columns'}
            </button>
          </div>
          <ReadOnlyTable
            data={bookings}
            columns={showAllBookingCols ? BOOKING_COLUMNS_ALL : BOOKING_COLUMNS_CONDENSED}
            getKey={(row) => (row as PreviewBookingRow).id}
            onRowClick={(row) => onEditBooking((row as PreviewBookingRow).id)}
            clickableLabel="Click to edit booking"
            emptyMessage="No bookings found for this period"
          />
        </CollapsibleSection>

        {/* ─── Expenses Table ─── */}
        <CollapsibleSection
          title="Expenses"
          sectionKey="expenses"
          expanded={expandedSections.has('expenses')}
          onToggle={toggleSection}
          badge={`${expenses.length}`}
        >
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={() => setShowAllExpenseCols(!showAllExpenseCols)}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {showAllExpenseCols ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
              {showAllExpenseCols ? 'Show Less' : 'Show All Columns'}
            </button>
          </div>
          <ReadOnlyTable
            data={expenses}
            columns={showAllExpenseCols ? EXPENSE_COLUMNS_ALL : EXPENSE_COLUMNS_CONDENSED}
            getKey={(row) => (row as PreviewExpenseRow).id}
            onRowClick={(row) => onEditExpense((row as PreviewExpenseRow).id)}
            clickableLabel="Click to view/edit"
            emptyMessage="No expenses found for this period"
          />
        </CollapsibleSection>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={onBack}
          disabled={generating}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={refreshing || generating}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg transition-all shadow-sm disabled:opacity-50"
          >
            {generating ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───

function CollapsibleSection({
  title,
  sectionKey,
  expanded,
  onToggle,
  badge,
  children,
}: {
  title: string
  sectionKey: string
  expanded: boolean
  onToggle: (key: string) => void
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">{badge}</span>
          )}
        </div>
        {expanded ? (
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 py-3 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReadOnlyTable<T extends Record<string, any>>({
  data,
  columns,
  getKey,
  onRowClick,
  clickableLabel,
  emptyMessage,
}: {
  data: T[]
  columns: ColumnDef[]
  getKey: (row: T) => string
  onRowClick?: (row: T) => void
  clickableLabel?: string
  emptyMessage: string
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">{emptyMessage}</div>
    )
  }

  // Compute column totals for currency/number columns
  const totals: Record<string, number> = {}
  for (const col of columns) {
    if (col.format === 'currency' || col.format === 'number') {
      let sum = 0
      for (const row of data) {
        const v = row[col.key]
        if (v != null) {
          const num = typeof v === 'string' ? parseFloat(v) : Number(v)
          if (!isNaN(num)) sum += num
        }
      }
      totals[col.key] = sum
    }
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map(col => (
              <th key={col.key} className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map(row => (
            <tr
              key={getKey(row)}
              onClick={() => onRowClick?.(row)}
              className={`${onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50/50'} transition-colors`}
              title={onRowClick ? clickableLabel : undefined}
            >
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                  {formatCellValue(row[col.key], col.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-300">
            {columns.map((col, i) => (
              <td key={col.key} className="px-3 py-2 text-xs font-semibold text-gray-900 whitespace-nowrap">
                {i === 0 ? (
                  `Totals (${data.length})`
                ) : totals[col.key] != null ? (
                  col.format === 'currency'
                    ? `$${totals[col.key].toFixed(2)}`
                    : String(totals[col.key])
                ) : null}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default PreviewDataStep
