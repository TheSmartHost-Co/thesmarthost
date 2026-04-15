// Types for the cleaner earnings analytics endpoint

export interface CleanerEarningsDateRange {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface CleanerEarningsSummary {
  completedEarnings: number
  expectedEarnings: number
  unassignedCost: number
  totalProjects: number
  completedProjects: number
  expectedProjects: number
  unassignedProjects: number
  totalHoursWorked: number
}

export interface MonthlyTrendPoint {
  month: string        // "2026-04"
  monthLabel: string   // "April 2026"
  completedEarnings: number
  expectedEarnings: number
  unassignedCost: number
  projectCount: number
  totalHours: number
}

export interface CleanerPropertyEarning {
  propertyId: string
  propertyName: string
  rateType: string | null   // "per_project", "hourly", "per_room", or null
  rateAmount: number | null
  completedEarnings: number
  expectedEarnings: number
  numProjects: number
}

export interface CleanerEarningEntry {
  cleanerId: string
  cleanerName: string
  completedEarnings: number
  expectedEarnings: number
  numProjects: number
  projectsPerWeek: number
  totalHoursWorked: number
  properties: CleanerPropertyEarning[]
}

export interface CleanerEarningsData {
  dateRange: CleanerEarningsDateRange
  summary: CleanerEarningsSummary
  monthlyTrend: MonthlyTrendPoint[]
  cleaners: CleanerEarningEntry[]
}

export interface CleanerEarningsResponse {
  status: 'success' | 'failed'
  data: CleanerEarningsData
  message?: string
}

export interface CleanerEarningsParams {
  startDate?: string
  endDate?: string
  cleanerId?: string
  forceRefresh?: boolean
}

export interface ClearCacheResponse {
  status: 'success' | 'failed'
  message: string
}
