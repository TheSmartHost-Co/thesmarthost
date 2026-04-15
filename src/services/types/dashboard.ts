// Dashboard type definitions

// Alerts
export interface MissingBookingAlert {
  propertyId: string
  propertyName: string
  lastUploadDate: string | null
  monthMissing: string
  daysSinceLastUpload: number | null
}

export interface MissingReportAlert {
  propertyId: string
  propertyName: string
  lastUploadDate: string | null
  monthMissing: string
}

export interface DashboardAlerts {
  missingBookings: MissingBookingAlert[]
  missingReports: MissingReportAlert[]
}

export interface AlertsResponse {
  status: 'success' | 'failed'
  message?: string
  data: DashboardAlerts
}

// Metrics
export interface DashboardMetrics {
  properties: {
    total: number
    active: number
    inactive: number
  }
  clients: {
    total: number
    byStatus: Record<string, number>
  }
  csvUploads: {
    thisMonth: number
    lastMonth: number
    change: number
    changePercent: number
  }
  reportsGenerated: {
    thisMonth: number
    lastMonth: number
    change: number
    changePercent: number
  }
  bookings: {
    thisMonth: number
    lastMonth: number
    change: number
    changePercent: number
  }
  revenue: {
    thisMonth: number
    lastMonth: number
    change: number
    changePercent: number
  }
  cleaningProjects: {
    thisMonth: number
    lastMonth: number
    change: number
    changePercent: number
  }
  invoices: {
    thisMonthTotal: number
    lastMonthTotal: number
    outstanding: number
    change: number
    changePercent: number
  }
  expenses: {
    thisMonth: number
    lastMonth: number
    change: number
    changePercent: number
  }
  activeCleaners: {
    count: number
  }
}

export interface MetricsResponse {
  status: 'success' | 'failed'
  message?: string
  data: DashboardMetrics
}

// Insights
export interface MetricChange {
  metric: 'revenue' | 'nights' | 'adr'
  direction: 'up' | 'down'
  percentChange: number
}

export interface PerformanceInsight {
  propertyId: string
  propertyName: string
  metric: 'revenue' | 'nights' | 'adr'
  direction: 'up' | 'down'
  percentChange: number
  currentValue: number
  previousValue: number
  currentRevenue: number
  previousRevenue: number
  currentNights: number
  previousNights: number
  currentAdr: number
  previousAdr: number
  context: string
  allMetrics: MetricChange[]
}

export interface InsightsResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    insights: PerformanceInsight[]
  }
}

// Activity
export interface ActivityMetadata {
  reportId?: string
  properties?: Array<{
    propertyId: string
    propertyName: string
  }>
  startDate?: string
  endDate?: string
  csvUploadId?: string
  propertyId?: string
  propertyName?: string
  fileName?: string
  bookingCount?: number
  clientId?: string
  clientName?: string
  address?: string
  propertyType?: string
  changes?: Record<string, any>
  projectId?: string
  projectDate?: string
  cleanerName?: string
  status?: string
  durationMinutes?: number
  invoiceId?: string
  invoiceNumber?: string
  total?: number
  supplyListId?: string
  itemCount?: number
  receiptId?: string
  vendorName?: string
  expenseId?: string
  amount?: number
  category?: string
  expenseDate?: string
}

export interface DashboardActivity {
  id: string
  type: 'report_generated' | 'csv_uploaded' | 'property_created' | 'property_updated' | 'client_created' | 'client_updated'
    | 'cleaning_project_created' | 'cleaning_project_completed'
    | 'invoice_created' | 'invoice_sent' | 'invoice_paid'
    | 'supply_list_submitted' | 'supply_list_fulfilled'
    | 'receipt_uploaded' | 'expense_added'
  timestamp: string
  description: string
  metadata: ActivityMetadata
}

export interface ActivityResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    activities: DashboardActivity[]
  }
}
