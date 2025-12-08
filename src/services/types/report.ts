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
  propertyNames?: string[] // For multi-property reports
  propertyAddresses?: string[] // For multi-property reports
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
  propertyIds: string[]
  startDate: string
  endDate: string
  format: ReportFormat
  logoId?: string
}

/**
 * Property info in preview response
 */
export interface PropertyInfo {
  propertyId: string
  listingName: string
  address: string
  primaryOwner: {
    id: string
    name: string
    email: string
  }
  coOwners: Array<{
    id: string
    name: string
    email: string
  }>
}

/**
 * Owner info in preview response
 */
export interface OwnerInfo {
  id: string
  name: string
  email: string
}

/**
 * Enhanced report summary with multi-property support
 */
export interface EnhancedReportSummary {
  overall?: {
    totalBookings: number
    totalNights: number
    totalNightlyRate: number
    totalRoomRevenue: number
    totalExtraGuestFees: number
    totalCleaningFees: number
    totalLodgingTax: number
    totalBedLinenFees: number
    totalGst: number
    totalQst: number
    totalChannelFees: number
    totalStripeFees: number
    totalPayout: number
    totalMgmtFee: number
    totalNetEarnings: number
    totalSalesTax: number
    totalRevenue: number
  }
  byProperty?: Array<{
    propertyId: string
    propertyName: string
    totalBookings: number
    totalNights: number
    totalPayout: number
    totalNetEarnings: number
    totalRevenue: number
  }>
  // Enhanced summary fields
  averageNightlyRate?: number
  rentCollected?: string
  taxesCollected?: string
  
  // Individual totals (backward compatibility & direct access)
  totalBookings?: number
  totalNights?: number
  totalNightlyRate?: number
  totalRoomRevenue?: number
  totalExtraGuestFees?: number
  totalCleaningFees?: number
  totalLodgingTax?: number
  totalBedLinenFees?: number
  totalGst?: number
  totalQst?: number
  totalChannelFees?: number
  totalStripeFees?: number
  totalPayout?: number
  totalMgmtFee?: number
  totalNetEarnings?: number
  totalSalesTax?: number
  totalRevenue?: number
}

/**
 * Report preview response (unified)
 */
export interface ReportPreviewResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    format: ReportFormat
    pdfPreview?: string // base64 PDF content for PDF format
    reportData?: {
      properties: PropertyInfo[]
      allOwners: OwnerInfo[]
      property?: PropertyInfo // backward compatibility
      bookings: (BookingData & { propertyName: string })[]
      summary: EnhancedReportSummary
      reportingPeriod: string
      generatedAt: string
      logo?: any
    }
    summary: EnhancedReportSummary
    properties?: PropertyInfo[]
    allOwners?: OwnerInfo[]
    reportingPeriod?: string
    generatedAt?: string
  }
}

/**
 * Report generation response  
 */
export interface ReportGenerationResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    reportId: string
    fileId: string
    downloadUrl: string
    version: string
    format: ReportFormat
    generatedAt: string
    filename?: string
  }
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