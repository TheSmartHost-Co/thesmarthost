// Report Types for HostMetrics Frontend

/**
 * Report generation request payload
 */
export interface ReportGenerationPayload {
  propertyId: string
  startDate: string // YYYY-MM-DD format
  endDate: string   // YYYY-MM-DD format
}

/**
 * Report generation response data
 */
export interface ReportData {
  reportId: string
  version: number
  pdfFilePath?: string
  csvFilePath?: string
  excelFilePath?: string
  downloadUrl: string
  reportingPeriod: string
  generatedAt: string
}

/**
 * Generic report generation response
 */
export interface ReportGenerationResponse {
  status: 'success' | 'failed'
  message?: string
  data: ReportData
}