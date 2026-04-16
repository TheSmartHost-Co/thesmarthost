export const BOOKING_CHART_COLORS = {
  primary: '#3B82F6',
  primaryLight: '#3B82F666',
  secondary: '#8B5CF6',
  secondaryLight: '#8B5CF666',
} as const

export const BOOKING_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const FINANCIAL_READINESS_OPTIONS = [
  { value: 'report_ready', label: 'Report Ready' },
  { value: 'scheduling_only', label: 'Scheduling Only' },
] as const

export const SOURCE_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'ical', label: 'iCal' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'manual', label: 'Manual' },
] as const

export const BREAKDOWN_TABS = [
  { value: 'property', label: 'Property' },
  { value: 'channel', label: 'Channel' },
  { value: 'source', label: 'Source' },
  { value: 'client', label: 'Client' },
] as const

export type BreakdownTab = 'property' | 'channel' | 'source' | 'client'

export type ChartType = 'bar' | 'area'

export type TimelineMetric = 'total_payout' | 'net_earnings' | 'booking_count' | 'total_nights' | 'avg_nightly_rate'

export const TIMELINE_METRIC_OPTIONS: { value: TimelineMetric; label: string; format: 'currency' | 'number' }[] = [
  { value: 'total_payout', label: 'Total Payout', format: 'currency' },
  { value: 'net_earnings', label: 'Net Earnings', format: 'currency' },
  { value: 'booking_count', label: 'Bookings', format: 'number' },
  { value: 'total_nights', label: 'Nights', format: 'number' },
  { value: 'avg_nightly_rate', label: 'Avg Rate', format: 'currency' },
]

export const BREAKDOWN_COLORS = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444',
  '#10B981', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
] as const
