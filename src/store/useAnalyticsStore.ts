import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AnalyticsFilters {
  startDate: string
  endDate: string
  propertyIds: string[]
  platforms: string[]
}

export interface AnalyticsSummaryData {
  filters: AnalyticsFilters & { comparisonPeriod: string }
  snapshot: {
    total_revenue: number
    net_earnings: number
    nights_booked: number
    occupancy_rate: number
    adr: number
    avg_revenue_per_stay: number
    total_reservations: number
  }
  changes: {
    revenue_change: number
    revenue_change_pct: number
    nights_change: number
    nights_change_pct: number
    adr_change: number
    adr_change_pct: number
    revenue_attribution: {
      nights_driven: number
      adr_driven: number
    }
  }
  channel_mix: Array<{
    platform: string
    revenue: number
    adr: number
    avg_nights_per_stay: number
    revenue_share_pct: number
    reservation_count: number
  }>
  property_contribution: Array<{
    property_id: string
    property_name: string
    revenue: number
    adr: number
    contribution_pct: number
    adr_vs_portfolio: number
    reservation_count: number
  }>
}

export interface AnalyticsTimeseriesData {
  filters: AnalyticsFilters & { granularity: string }
  revenue_over_time: Array<{
    date: string
    revenue: number
    reservations: number
    nights: number
    adr: number
  }>
  channel_revenue_over_time: Array<{
    date: string
    platform: string
    revenue: number
    reservations: number
  }>
}

export interface AnalyticsBookingsData {
  filters: AnalyticsFilters
  bookings: Array<{
    id: string
    property_id: string
    csv_upload_id: string | null
    reservation_code: string
    guest_name: string
    check_in_date: string
    num_nights: string
    platform: string
    nightly_rate: number
    extra_guest_fees: number
    cleaning_fee: number
    lodging_tax: number
    bed_linen_fee: number
    gst: number
    qst: number
    channel_fee: number
    stripe_fee: number
    total_payout: number
    mgmt_fee: number
    net_earnings: number
    sales_tax: number
    created_at: string
    listing_name: string
    check_out_date: string
    user_id: string
    property_name: string
    property_address: string
    csv_file_name: string | null
  }>
  operational_stats: {
    total_reservations: number
    avg_nights_per_stay: number
    stay_length_distribution: {
      one_night: number
      short_stays: number
      medium_stays: number
      long_stays: number
    }
    turnover_metrics: {
      weeks_with_bookings: number
      avg_turnovers_per_week: number
    }
  }
  data_integrity: {
    total_bookings: number
    csv_imported: number
    manually_added: number
    csv_import_pct: number
    unique_csv_uploads: number
    data_completeness: {
      missing_guest_names: number
      missing_reservation_codes: number
    }
  }
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

interface AnalyticsState {
  filters: AnalyticsFilters
  summaryData: AnalyticsSummaryData | null
  timeseriesData: AnalyticsTimeseriesData | null
  bookingsData: AnalyticsBookingsData | null
  granularity: 'daily' | 'weekly'
  isLoading: boolean
  errors: {
    summary: string | null
    timeseries: string | null
    bookings: string | null
  }
  
  setFilters: (filters: Partial<AnalyticsFilters>) => void
  setGranularity: (granularity: 'daily' | 'weekly') => void
  setSummaryData: (data: AnalyticsSummaryData | null) => void
  setTimeseriesData: (data: AnalyticsTimeseriesData | null) => void
  setBookingsData: (data: AnalyticsBookingsData | null) => void
  setLoading: (loading: boolean) => void
  setError: (endpoint: 'summary' | 'timeseries' | 'bookings', error: string | null) => void
  resetData: () => void
  resetErrors: () => void
}

const getCurrentMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return {
    startDate: `${year}-${month}-01`,
    endDate: new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0]
  }
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      filters: {
        ...getCurrentMonth(),
        propertyIds: [],
        platforms: [],
      },
      summaryData: null,
      timeseriesData: null,
      bookingsData: null,
      granularity: 'weekly',
      isLoading: false,
      errors: {
        summary: null,
        timeseries: null,
        bookings: null,
      },

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      setGranularity: (granularity) =>
        set({ granularity }),

      setSummaryData: (data) =>
        set({ summaryData: data }),

      setTimeseriesData: (data) =>
        set({ timeseriesData: data }),

      setBookingsData: (data) =>
        set({ bookingsData: data }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setError: (endpoint, error) =>
        set((state) => ({
          errors: { ...state.errors, [endpoint]: error },
        })),

      resetData: () =>
        set({
          summaryData: null,
          timeseriesData: null,
          bookingsData: null,
        }),

      resetErrors: () =>
        set({
          errors: {
            summary: null,
            timeseries: null,
            bookings: null,
          },
        }),
    }),
    {
      name: 'analytics-store',
      partialize: (state) => ({
        filters: state.filters,
        granularity: state.granularity,
      }),
    }
  )
)