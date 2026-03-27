// Invoice statuses
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid'

// Main invoice entity
export interface CleanerInvoice {
  id: string
  userId: string
  cleanerId: string
  invoiceNumber: string
  periodStart: string
  periodEnd: string
  subtotal: number
  total: number
  status: InvoiceStatus
  cleanerNotes?: string | null
  pmNotes?: string | null
  submittedAt?: string | null
  approvedAt?: string | null
  paidAt?: string | null
  createdAt: string
  updatedAt?: string | null
  // Joined data
  cleanerName?: string
  cleanerEmail?: string
  cleanerPhone?: string
  cleanerHourlyRate?: number | null
  itemCount?: number
  // Included when fetching single invoice
  items?: CleanerInvoiceItem[]
}

// Invoice line item
export interface CleanerInvoiceItem {
  id: string
  invoiceId: string
  cleaningProjectId?: string | null
  propertyId?: string | null
  projectDate?: string | null
  description: string
  rateType?: 'flat' | 'hourly' | null
  rateAmount?: number | null
  durationMinutes?: number | null
  amount: number
  isManualOverride: boolean
  originalAmount?: number | null
  originalDurationMinutes?: number | null
  notes?: string | null
  sortOrder: number
  createdAt: string
  // Joined data
  propertyName?: string
  propertyAddress?: string
  // Receipt attachment
  receiptId?: string | null
  receiptOriginalName?: string | null
  receiptStoragePath?: string | null
  receiptSignedUrl?: string | null
}

// Available project for invoice generation
export interface AvailableProject {
  id: string
  propertyId: string
  projectDate: string
  projectStartTime?: string | null
  projectEndTime?: string | null
  actualStart?: string | null
  actualEnd?: string | null
  estimatedDurationMinutes?: number | null
  status: string
  pmNotes?: string | null
  cleanerNotes?: string | null
  createdAt: string
  propertyName?: string
  propertyAddress?: string
  propertyRateType?: 'flat' | 'hourly' | null
  propertyRateAmount?: number | null
  propertyDefaultDurationMinutes?: number | null
  cleanerPropertyDurationMinutes?: number | null
}

// Invoice summary stats
export interface InvoiceSummary {
  total: number
  draft: number
  pending: number
  approved: number
  rejected: number
  paid: number
  pendingTotal: number
  approvedTotal: number
  paidTotal: number
}

// Payloads
export interface CreateInvoicePayload {
  cleanerId: string
  periodStart: string
  periodEnd: string
  projectIds?: string[]  // Optional — if provided, only these projects are included
  itemOverrides?: Record<string, { durationMinutes?: number; amount?: number }>  // Optional per-project overrides
}

export interface UpdateInvoicePayload {
  periodStart?: string
  periodEnd?: string
  cleanerNotes?: string | null
  pmNotes?: string | null
}

export interface UpdateInvoiceItemPayload {
  description?: string
  rateType?: 'flat' | 'hourly' | null
  rateAmount?: number
  durationMinutes?: number
  amount?: number
  notes?: string | null
  receiptId?: string | null
}

export interface AddInvoiceItemPayload {
  description: string
  amount: number
  notes?: string | null
  receiptId?: string | null
}

// API Responses
export interface CleanerInvoiceResponse {
  status: 'success' | 'failed'
  data: CleanerInvoice
  message?: string
}

export interface CleanerInvoicesResponse {
  status: 'success' | 'failed'
  data: CleanerInvoice[]
  message?: string
}

export interface InvoiceSummaryResponse {
  status: 'success' | 'failed'
  data: InvoiceSummary
  message?: string
}

export interface AvailableProjectsResponse {
  status: 'success' | 'failed'
  data: AvailableProject[]
  message?: string
}

export interface InvoiceItemResponse {
  status: 'success' | 'failed'
  data: CleanerInvoiceItem
  message?: string
}

export interface DeleteInvoiceResponse {
  status: 'success' | 'failed'
  message: string
}

// Invoice PDF file
export interface InvoiceFile {
  id: string
  invoiceId: string
  filePath: string
  fileName: string
  fileVersion: number
  isCurrent: boolean
  createdAt: string
}

// Monthly earnings data
export interface MonthlyEarnings {
  currentMonth: { paid: number; approved: number; pending: number; label: string }
  lastMonth: { paid: number; approved: number; pending: number; label: string }
  allTime: { paid: number; approved: number; pending: number }
}

// PDF generation response
export interface InvoicePDFResponse {
  status: 'success' | 'failed'
  data?: { fileId: string; fileName: string; fileVersion: number; signedUrl: string | null }
  message?: string
}

export interface InvoiceFilesResponse {
  status: 'success' | 'failed'
  data: InvoiceFile[]
  message?: string
}

export interface InvoiceFileDownloadResponse {
  status: 'success' | 'failed'
  data?: { signedUrl: string; fileName: string }
  message?: string
}

export interface MonthlyEarningsResponse {
  status: 'success' | 'failed'
  data: MonthlyEarnings
  message?: string
}

// Status display helpers
export const INVOICE_STATUS_INFO: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'gray' },
  pending: { label: 'Pending', color: 'amber' },
  approved: { label: 'Approved', color: 'blue' },
  rejected: { label: 'Rejected', color: 'red' },
  paid: { label: 'Paid', color: 'green' },
}
