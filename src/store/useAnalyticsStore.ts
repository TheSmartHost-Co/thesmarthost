import { create } from 'zustand'
import type {
  AnalyticsData,
  BookingsData,
  AIInsightsData,
  Granularity,
  AnalyticsDateRange,
} from '@/services/types/analytics'

// --- Helper to get current month range ---
const getCurrentMonthRange = (): AnalyticsDateRange => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

// --- Filter State ---

export interface AnalyticsFilters {
  dateRange: AnalyticsDateRange
  propertyIds: string[]
  channels: string[]
  comparison: boolean
}

// --- Drill-Down State ---

export interface DrillDownContext {
  type: 'property' | 'channel' | 'date' | null
  propertyId?: string
  propertyName?: string
  channel?: string
  date?: string
}

// --- Store State ---

interface AnalyticsState {
  // Filters
  filters: AnalyticsFilters
  granularity: Granularity

  // Data
  analyticsData: AnalyticsData | null
  bookingsData: BookingsData | null
  aiInsights: AIInsightsData | null

  // Drill-down context
  drillDown: DrillDownContext

  // Loading & Errors
  isLoading: boolean
  isLoadingBookings: boolean
  isLoadingAI: boolean
  error: string | null
  bookingsError: string | null
  aiError: string | null

  // Actions
  setFilters: (filters: Partial<AnalyticsFilters>) => void
  setDateRange: (dateRange: AnalyticsDateRange) => void
  setGranularity: (granularity: Granularity) => void
  setAnalyticsData: (data: AnalyticsData | null) => void
  setBookingsData: (data: BookingsData | null) => void
  setAIInsights: (data: AIInsightsData | null) => void
  setDrillDown: (context: DrillDownContext) => void
  clearDrillDown: () => void
  setLoading: (loading: boolean) => void
  setLoadingBookings: (loading: boolean) => void
  setLoadingAI: (loading: boolean) => void
  setError: (error: string | null) => void
  setBookingsError: (error: string | null) => void
  setAIError: (error: string | null) => void
  resetData: () => void
  resetAll: () => void
}

// --- Initial State ---

const getInitialFilters = (): AnalyticsFilters => ({
  dateRange: getCurrentMonthRange(),
  propertyIds: [],
  channels: [],
  comparison: true,
})

const initialDrillDown: DrillDownContext = {
  type: null,
}

// --- Store (no persistence to avoid stale data issues) ---

export const useAnalyticsStore = create<AnalyticsState>()((set) => ({
  // Initial state
  filters: getInitialFilters(),
  granularity: 'daily',
  analyticsData: null,
  bookingsData: null,
  aiInsights: null,
  drillDown: initialDrillDown,
  isLoading: false,
  isLoadingBookings: false,
  isLoadingAI: false,
  error: null,
  bookingsError: null,
  aiError: null,

  // Filter actions
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  setDateRange: (dateRange) =>
    set((state) => ({
      filters: { ...state.filters, dateRange },
    })),

  setGranularity: (granularity) =>
    set({ granularity }),

  // Data actions
  setAnalyticsData: (data) =>
    set({ analyticsData: data }),

  setBookingsData: (data) =>
    set({ bookingsData: data }),

  setAIInsights: (data) =>
    set({ aiInsights: data }),

  // Drill-down actions
  setDrillDown: (context) =>
    set({ drillDown: context }),

  clearDrillDown: () =>
    set({ drillDown: initialDrillDown, bookingsData: null }),

  // Loading actions
  setLoading: (loading) =>
    set({ isLoading: loading }),

  setLoadingBookings: (loading) =>
    set({ isLoadingBookings: loading }),

  setLoadingAI: (loading) =>
    set({ isLoadingAI: loading }),

  // Error actions
  setError: (error) =>
    set({ error }),

  setBookingsError: (error) =>
    set({ bookingsError: error }),

  setAIError: (error) =>
    set({ aiError: error }),

  // Reset actions
  resetData: () =>
    set({
      analyticsData: null,
      bookingsData: null,
      error: null,
      bookingsError: null,
    }),

  resetAll: () =>
    set({
      filters: getInitialFilters(),
      granularity: 'daily',
      analyticsData: null,
      bookingsData: null,
      aiInsights: null,
      drillDown: initialDrillDown,
      isLoading: false,
      isLoadingBookings: false,
      isLoadingAI: false,
      error: null,
      bookingsError: null,
      aiError: null,
    }),
}))
