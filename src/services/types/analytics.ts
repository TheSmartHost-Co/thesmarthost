// Property Analytics Types (for dashboard property analytics charts)

export interface PropertyTimeseriesPoint {
  date: string
  displayLabel: string
  revenue: number
  payout: number
  bookings: number
  nights: number
  adr: number
  channelFees: number
  mgmtFees: number
}

export interface PropertyTimeseries {
  propertyId: string
  propertyName: string
  timeseries: PropertyTimeseriesPoint[]
  summary: {
    totalRevenue: number
    totalPayout: number
    totalBookings: number
    totalNights: number
    avgAdr: number
    avgMonthlyRevenue: number
  }
  comparison: {
    revenue: { current: number; previous: number; change: number; changePct: number }
    payout: { current: number; previous: number; change: number; changePct: number }
    bookings: { current: number; previous: number; change: number; changePct: number }
    adr: { current: number; previous: number; change: number; changePct: number }
  }
}

export interface PropertyAnalyticsAggregate {
  totalRevenue: number
  totalPayout: number
  totalBookings: number
  avgRevenuePerProperty: number
  avgPayoutPerProperty: number
  topPerformer: {
    propertyId: string
    propertyName: string
    revenue: number
  } | null
}

export interface PropertyAnalyticsTrend {
  revenue: { change: number; changePct: number; direction: 'up' | 'down' | 'flat' }
  payout: { change: number; changePct: number; direction: 'up' | 'down' | 'flat' }
  bookings: { change: number; changePct: number; direction: 'up' | 'down' | 'flat' }
  adr: { change: number; changePct: number; direction: 'up' | 'down' | 'flat' }
}

export interface PropertyAnalyticsData {
  properties: PropertyTimeseries[]
  aggregate: PropertyAnalyticsAggregate
  trend: PropertyAnalyticsTrend
}

export interface PropertyAnalyticsResponse {
  success: boolean
  data: PropertyAnalyticsData
}
