// Invoice statuses
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'archived'

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
  // Tax fields
  taxHst: number
  taxGst: number
  taxQst: number
  taxHstEnabled: boolean
  taxGstEnabled: boolean
  taxQstEnabled: boolean
  billFromName?: string | null
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
  cleanerBusinessName?: string | null
  cleanerInvoicePrefix?: string | null
  cleanerTaxHstEnabled?: boolean
  cleanerTaxGstEnabled?: boolean
  cleanerTaxQstEnabled?: boolean
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
  isTaxable: boolean
  createdAt: string
  // Joined data
  propertyName?: string
  propertyAddress?: string
  // Receipt attachment
  receiptId?: string | null
  receiptOriginalName?: string | null
  receiptStoragePath?: string | null
  receiptSignedUrl?: string | null
  receiptMimeType?: string | null
  expenseId?: string | null
  type?: 'cleaning_project' | 'expense' | 'extra_charge'
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

// Available reimbursable expense for invoice generation
export interface AvailableExpense {
  id: string
  propertyId: string | null
  expenseDate: string
  amount: number
  vendorName: string
  description: string | null
  category: string
  receiptId: string | null
  paidById: string
  paidByType: string
  createdAt: string
  propertyName: string | null
  propertyAddress: string | null
  receiptOriginalName: string | null
  receiptStoragePath: string | null
}

// Invoice summary stats
export interface InvoiceSummary {
  total: number
  draft: number
  pending: number
  approved: number
  rejected: number
  paid: number
  archived: number
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
  expenseIds?: string[]  // Optional — reimbursable expense IDs to include
  itemOverrides?: Record<string, { durationMinutes?: number; amount?: number; isTaxable?: boolean }>  // Optional per-project overrides
  taxHstEnabled?: boolean
  taxGstEnabled?: boolean
  taxQstEnabled?: boolean
}

export interface UpdateInvoicePayload {
  periodStart?: string
  periodEnd?: string
  cleanerNotes?: string | null
  pmNotes?: string | null
  invoiceNumber?: string
  billFromName?: string | null
  taxHstEnabled?: boolean
  taxGstEnabled?: boolean
  taxQstEnabled?: boolean
}

export interface UpdateInvoiceItemPayload {
  description?: string
  rateType?: 'flat' | 'hourly' | null
  rateAmount?: number
  durationMinutes?: number
  amount?: number
  notes?: string | null
  receiptId?: string | null
  isTaxable?: boolean
}

export interface AddInvoiceItemPayload {
  description?: string
  amount?: number
  notes?: string | null
  isTaxable?: boolean
  receiptId?: string
  expenseId?: string
}

// Add expense as invoice line item
export interface AddInvoiceExpensePayload {
  expenseId: string
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

export interface AvailableExpensesResponse {
  status: 'success' | 'failed'
  data: AvailableExpense[]
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

// Convert extra charge to expense
export interface ConvertItemToExpensePayload {
  propertyId: string
  amount?: number
  category?: string
  vendorName?: string
  description?: string
  expenseDate?: string
  paymentMethod?: string
  paymentStatus?: string
}

export interface ConvertItemToExpenseResponse {
  status: 'success' | 'failed'
  data: {
    expense: Record<string, unknown>
    invoiceItem: CleanerInvoiceItem
  }
  message?: string
}

// Status display helpers
export const INVOICE_STATUS_INFO: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'gray' },
  pending: { label: 'Pending', color: 'amber' },
  approved: { label: 'Approved', color: 'blue' },
  rejected: { label: 'Rejected', color: 'red' },
  paid: { label: 'Paid', color: 'green' },
  archived: { label: 'Archived', color: 'slate' },
}
