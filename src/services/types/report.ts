// Report Types for HostMetrics Frontend

export type ReportFormat = 'pdf' | 'csv' | 'excel'

/**
 * Report file metadata
 */
export interface ReportFile {
  fileId: string
  downloadUrl: string
  generatedAt: string
  version: number
}

/**
 * Complete report entity
 */
export interface Report {
  id: string
  propertyId: string
  propertyName: string
  propertyAddress: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
  availableFormats: ReportFormat[]
  files: {
    pdf?: ReportFile
    csv?: ReportFile
    excel?: ReportFile
  }
}

/**
 * List reports response
 */
export interface ReportsResponse {
  status: 'success' | 'failed'
  message?: string
  data: Report[]
}

/**
 * Report generation request payload
 */
export interface ReportGenerationPayload {
  property_id: string
  start_date: string
  end_date: string
  format: ReportFormat
  logo_id?: string
}

/**
 * Report preview response (PDF format)
 */
export interface ReportPreviewPDFResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    format: 'pdf'
    pdfPreview: string // base64 string
    summary: ReportSummary
  }
}

/**
 * Report preview response (CSV/Excel format)
 */
export interface ReportPreviewDataResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    format: 'csv' | 'excel'
    bookings: BookingData[]
    summary: ReportSummary
  }
}

/**
 * Report generation response
 */
export interface ReportGenerationResponse {
  status: 'success' | 'failed'
  message?: string
  data: Report
}

/**
 * Report summary data
 */
export interface ReportSummary {
  totalRevenue?: number
  totalBookings?: number
  averageNightlyRate?: number
  occupancyRate?: number
  totalNights?: number
  totalCommission?: number
}

/**
 * Booking data for table display
 */
export interface BookingData {
  id: string
  reservationCode?: string
  guestName?: string
  checkInDate?: string
  checkOutDate?: string
  numNights?: number
  platform?: string
  listingName?: string
  nightlyRate?: number
  extraGuestFees?: number
  cleaningFee?: number
  lodgingTax?: number
  bedLinenFee?: number
  gst?: number
  qst?: number
  channelFee?: number
  stripeFee?: number
  totalPayout?: number
  mgmtFee?: number
  netEarnings?: number
  salesTax?: number
  // Legacy fields for backward compatibility
  checkIn?: string
  checkOut?: string
  nights?: number
  revenue?: number
  commission?: number
  channel?: string
}

/**
 * Logo entity
 */
export interface Logo {
  id: string
  originalName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  logoUrl: string
}

/**
 * Logos list response
 */
export interface LogosResponse {
  status: 'success' | 'failed'
  message?: string
  data: Logo[]
}

/**
 * Logo upload response
 */
export interface LogoUploadResponse {
  status: 'success' | 'failed'
  message?: string
  data: Logo
}