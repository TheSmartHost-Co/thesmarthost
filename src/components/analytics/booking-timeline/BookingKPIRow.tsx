'use client'

import { useState } from 'react'
import { KPICard, KPICardSkeleton } from '@/components/analytics/shared/KPICard'
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  MoonIcon,
  ChartBarIcon,
  ReceiptPercentIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline'
import type { BookingPortfolioData, MetricDescription } from '@/services/types/bookingAnalytics'

interface BookingKPIRowProps {
  portfolio: BookingPortfolioData | null
  metricDescriptions: Record<string, MetricDescription>
  isLoading: boolean
}

export default function BookingKPIRow({ portfolio, metricDescriptions, isLoading }: BookingKPIRowProps) {
  const [hoveredFees, setHoveredFees] = useState(false)
  const [hoveredTaxes, setHoveredTaxes] = useState(false)

  if (isLoading || !portfolio) {
    return (
      <div className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-4 lg:grid-cols-8">
        {[...Array(8)].map((_, i) => (
          <KPICardSkeleton key={i} size="compact" />
        ))}
      </div>
    )
  }

  const { current, delta } = portfolio

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-4 lg:grid-cols-8">
      {/* Revenue cluster */}
      <KPICard
        label="Total Payout"
        value={current.total_payout}
        delta={delta?.total_payout}
        format="currency"
        icon={<BanknotesIcon className="h-4 w-4" />}
        accentColor="emerald"
        size="compact"
        delay={0}
      />
      <KPICard
        label="Net Earnings"
        value={current.net_earnings}
        delta={delta?.net_earnings}
        format="currency"
        icon={<CurrencyDollarIcon className="h-4 w-4" />}
        accentColor="blue"
        size="compact"
        delay={0.05}
      />

      {/* Activity cluster */}
      <KPICard
        label="Bookings"
        value={current.booking_count}
        delta={delta?.booking_count}
        format="number"
        icon={<CalendarDaysIcon className="h-4 w-4" />}
        accentColor="violet"
        size="compact"
        delay={0.1}
      />
      <KPICard
        label="Total Nights"
        value={current.total_nights}
        delta={delta?.total_nights}
        format="number"
        icon={<MoonIcon className="h-4 w-4" />}
        accentColor="amber"
        size="compact"
        delay={0.15}
      />
      <KPICard
        label="ADR"
        value={current.avg_nightly_rate}
        delta={delta?.avg_nightly_rate}
        format="currency"
        icon={<ChartBarIcon className="h-4 w-4" />}
        accentColor="rose"
        size="compact"
        delay={0.2}
      />

      {/* Occupancy — delta shown as absolute points */}
      <KPICard
        label="Occupancy"
        value={current.occupancy_rate}
        delta={delta?.occupancy_rate ? {
          absolute: delta.occupancy_rate.absolute,
          percentage: delta.occupancy_rate.absolute,
        } : undefined}
        format="percent"
        icon={<CalendarDaysIcon className="h-4 w-4" />}
        accentColor="slate"
        size="compact"
        delay={0.25}
      />

      {/* Fees summary with hover breakdown */}
      <div
        className="relative"
        onMouseEnter={() => setHoveredFees(true)}
        onMouseLeave={() => setHoveredFees(false)}
      >
        <KPICard
          label="Total Fees"
          value={current.total_mgmt_fee + current.total_channel_fee + current.total_stripe_fee + current.total_cohost_fee + current.total_cleaning_fee}
          format="currency"
          icon={<ReceiptPercentIcon className="h-4 w-4" />}
          accentColor="amber"
          size="compact"
          delay={0.3}
        />
        {hoveredFees && (
          <div className="absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg whitespace-nowrap">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Fee Breakdown
            </p>
            <div className="space-y-0.5 text-xs">
              {current.total_mgmt_fee > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{metricDescriptions.total_mgmt_fee?.label || 'Mgmt Fee'}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(current.total_mgmt_fee)}</span>
                </div>
              )}
              {current.total_channel_fee > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{metricDescriptions.total_channel_fee?.label || 'Channel Fee'}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(current.total_channel_fee)}</span>
                </div>
              )}
              {current.total_stripe_fee > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{metricDescriptions.total_stripe_fee?.label || 'Stripe Fee'}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(current.total_stripe_fee)}</span>
                </div>
              )}
              {current.total_cohost_fee > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{metricDescriptions.total_cohost_fee?.label || 'Co-host Fee'}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(current.total_cohost_fee)}</span>
                </div>
              )}
              {current.total_cleaning_fee > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{metricDescriptions.total_cleaning_fee?.label || 'Cleaning Fee'}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(current.total_cleaning_fee)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Taxes summary with hover breakdown */}
      <div
        className="relative"
        onMouseEnter={() => setHoveredTaxes(true)}
        onMouseLeave={() => setHoveredTaxes(false)}
      >
        <KPICard
          label="Taxes"
          value={current.taxes_collected}
          delta={delta?.taxes_collected}
          format="currency"
          icon={<CalculatorIcon className="h-4 w-4" />}
          accentColor="rose"
          size="compact"
          delay={0.35}
        />
        {hoveredTaxes && (
          <div className="absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg whitespace-nowrap">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Tax Breakdown
            </p>
            <div className="space-y-0.5 text-xs">
              {current.total_gst > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{metricDescriptions.total_gst?.label || 'GST'}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(current.total_gst)}</span>
                </div>
              )}
              {current.total_qst > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{metricDescriptions.total_qst?.label || 'QST'}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(current.total_qst)}</span>
                </div>
              )}
              {current.total_lodging_tax > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{metricDescriptions.total_lodging_tax?.label || 'Lodging Tax'}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(current.total_lodging_tax)}</span>
                </div>
              )}
              {current.total_sales_tax > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{metricDescriptions.total_sales_tax?.label || 'Sales Tax'}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(current.total_sales_tax)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-0.5">
                <span className="font-medium text-gray-700">Total</span>
                <span className="font-semibold text-gray-900">{formatCurrency(current.taxes_collected)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
