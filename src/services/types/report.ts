// Report Types for HostMetrics Frontend

import { BookingSource } from './booking'

export type ReportFormat = 'pdf' | 'csv' | 'excel'

export type DateFilterMode = 'checkIn' | 'checkOut' | 'reservationCreated' | 'calendar'

/**
 * Report file metadata
 */
export interface ReportFile {
  id: string
  format: ReportFormat
  version: string
  isCurrent: boolean
  generatedAt: string
  notes: string | null
  downloadUrl: string
  fileName: string
}

/**
 * Property info in report
 */
export interface ReportProperty {
  id: string
  listingName: string
  address: string
}

/**
 * Complete report entity
 */
export interface Report {
  id: string
  propertyId: string
  propertyName: string
  propertyAddress: string
  propertyIds: string[]
  properties: ReportProperty[]
  propertyCount: number
  isMultiProperty: boolean
  startDate: string
  endDate: string
  sourceFilter?: BookingSource[] | null
  createdAt: string
  updatedAt: string | null
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
  templateIds?: string[]  // Array of template IDs (PDF: 0-1, Excel/CSV: 0+)
  dateFilterMode?: DateFilterMode  // How to filter bookings by date (defaults to 'checkIn' on backend)
  sourcesFilter?: BookingSource[]  // Which booking sources to include (defaults to all on backend)
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
    totalCohostFee: number
    totalRentCollected: number
    totalTaxesCollected: number
    averageNightlyRate: number
    totalRevenue: number
  }
  byProperty?: Array<{
    propertyId: string
    propertyName: string
    totalBookings: number
    totalNights: number
    totalPayout: number
    totalNetEarnings: number
    totalCohostFee: number
    totalRentCollected: number
    totalTaxesCollected: number
    totalRevenue: number
  }>
  // Enhanced summary fields
  averageNightlyRate?: number
  totalRentCollected?: number
  totalTaxesCollected?: number
  totalCohostFee?: number

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
  // DB-style backward compat keys
  totalRentCollectedDb?: number
  totalTaxesCollectedDb?: number
  rentCollected?: string
  taxesCollected?: string
}

/**
 * Report preview response — returns bookings, expenses, and summary as JSON
 */
export interface ReportPreviewResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    bookings: PreviewBookingRow[]
    expenses: PreviewExpenseRow[]
    summary: EnhancedReportSummary
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
  rentCollected?: number
  taxesCollected?: number
  cohostFee?: number
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

/**
 * Single report response with file details
 */
export interface SingleReportResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    id: string
    startDate: string
    endDate: string
    createdAt: string
    updatedAt: string | null
    propertyIds: string[]
    properties: ReportProperty[]
    isMultiProperty: boolean
    propertyCount: number
    propertyId?: string
    propertyName?: string
    filesByFormat: Record<string, ReportFile[]>
    fileStats: {
      totalFiles: number
      availableFormats: string[]
      totalVersions: number
      currentVersions: number
    }
  }
}

// ============ Send Report Types ============

/**
 * A potential recipient for sending a report (property owner)
 */
export interface ReportRecipient {
  clientId: string
  name: string
  email: string
  isPrimary: boolean
  properties: string[]
}

/**
 * Response from GET /reports/:id/recipients
 */
export interface ReportRecipientsResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    recipients: ReportRecipient[]
  }
}

/**
 * Payload for POST /reports/:id/send
 */
export interface SendReportPayload {
  recipients: Array<{
    clientId: string | null
    email: string
    name: string
  }>
  formats: string[]
  deliveryMethod: 'portal' | 'email' | 'both'
  message?: string
}

/**
 * Response from POST /reports/:id/send
 */
export interface SendReportResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    sentReportId: string
    recipientCount: number
    emailResults: Array<{
      email: string
      status: string
      emailId?: string
    }>
    portalNotified: number
  }
}

// ============ Preview Bookings Types (New Report Flow) ============

/**
 * Booking row returned by POST /api/reports/preview-bookings
 * Financial fields are decimal strings (e.g. "200.00"), not numbers.
 * Identity key: reservationCode (no UUID in this response)
 */
export interface PreviewBookingRow {
  id: string
  propertyId: string
  propertyName: string
  checkInDate: string
  checkOutDate: string
  numNights: number
  guestName: string
  platform: string
  reservationCode: string
  nightlyRate: string
  salesTax: string
  lodgingTax: string
  cleaningFee: string
  channelFee: string
  stripeFee: string
  totalPayout: string
  mgmtFee: string
  mgmtCleaningFee: string
  clientNetEarnings: string
  extraGuestFees: string | null
  bedLinenFee: string | null
  gst: string | null
  qst: string | null
  netEarnings: string | null
  cohostFee: string
  rentCollectedDb: string
  taxesCollectedDb: string
}

/**
 * Expense row returned by POST /api/reports/preview-bookings
 * Identity key: id (UUID)
 */
export interface PreviewExpenseRow {
  id: string
  propertyId: string
  bookingId: string | null
  propertyName: string
  bookingGuestName: string | null
  bookingReservationCode: string | null
  expenseDate: string
  amount: number
  currency: string
  category: string
  vendorName: string | null
  description: string | null
  receiptPath: string | null
  isReimbursable: boolean
  isTaxDeductible: boolean
  paymentMethod: string | null
  paymentStatus: string | null
}

/**
 * Request payload for POST /api/reports/preview
 */
export interface ReportPreviewPayload {
  propertyIds: string[]
  startDate: string
  endDate: string
  dateFilterMode?: DateFilterMode
  sourcesFilter?: BookingSource[]
}