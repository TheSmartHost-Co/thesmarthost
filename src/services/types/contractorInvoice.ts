// Invoice statuses
export type ContractorInvoiceStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'archived'

// Main invoice entity
export interface ContractorInvoice {
  id: string
  userId: string
  contractorId: string
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
  status: ContractorInvoiceStatus
  contractorNotes?: string | null
  pmNotes?: string | null
  submittedAt?: string | null
  approvedAt?: string | null
  paidAt?: string | null
  createdAt: string
  updatedAt?: string | null
  // Joined data
  contractorName?: string
  contractorEmail?: string
  contractorPhone?: string
  contractorTrade?: string | null
  contractorBusinessName?: string | null
  contractorInvoicePrefix?: string | null
  contractorTaxHstEnabled?: boolean
  contractorTaxGstEnabled?: boolean
  contractorTaxQstEnabled?: boolean
  itemCount?: number
  // Included when fetching single invoice
  items?: ContractorInvoiceItem[]
}

// Invoice line item
export interface ContractorInvoiceItem {
  id: string
  invoiceId: string
  maintenanceTaskId?: string | null
  propertyId?: string | null
  taskDate?: string | null
  description: string
  amount: number
  isManualOverride: boolean
  originalAmount?: number | null
  notes?: string | null
  sortOrder: number
  isTaxable: boolean
  createdAt: string
  // Joined data
  propertyName?: string
  propertyAddress?: string
  type?: 'maintenance_task' | 'extra_charge'
}

// Available (completed, uninvoiced) maintenance task for invoice generation
export interface AvailableTask {
  id: string
  propertyId: string
  title: string
  description?: string | null
  scheduledDate?: string | null
  actualStart?: string | null
  actualEnd?: string | null
  status: string
  pricingType?: string | null
  agreedAmount?: number | null
  pmNotes?: string | null
  contractorNotes?: string | null
  createdAt: string
  propertyName?: string
  propertyAddress?: string
}

// Invoice summary stats
export interface ContractorInvoiceSummary {
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

// Extra item payload for inline charges at creation time (invoice-only rows —
// no expense/receipt integration for contractors)
export interface ContractorExtraItemPayload {
  description: string
  amount: number
  isTaxable?: boolean
  notes?: string
  propertyId?: string
  taskDate?: string
}

// Payloads
export interface CreateContractorInvoicePayload {
  contractorId?: string
  periodStart?: string
  periodEnd?: string
  taskIds?: string[]
  extraItems?: ContractorExtraItemPayload[]
  contractorNotes?: string
  itemOverrides?: Record<string, { amount?: number; isTaxable?: boolean }>
  taxHstEnabled?: boolean
  taxGstEnabled?: boolean
  taxQstEnabled?: boolean
}

export interface UpdateContractorInvoicePayload {
  periodStart?: string
  periodEnd?: string
  contractorNotes?: string | null
  pmNotes?: string | null
  invoiceNumber?: string
  billFromName?: string | null
  taxHstEnabled?: boolean
  taxGstEnabled?: boolean
  taxQstEnabled?: boolean
}

export interface UpdateContractorInvoiceItemPayload {
  description?: string
  amount?: number
  notes?: string | null
  isTaxable?: boolean
  taskDate?: string
}

export interface AddContractorInvoiceItemPayload {
  description: string
  amount: number
  notes?: string | null
  isTaxable?: boolean
  propertyId?: string
  taskDate?: string
}

// API Responses
export interface ContractorInvoiceResponse {
  status: 'success' | 'failed'
  data: ContractorInvoice
  message?: string
}

export interface ContractorInvoicesResponse {
  status: 'success' | 'failed'
  data: ContractorInvoice[]
  message?: string
}

export interface ContractorInvoiceSummaryResponse {
  status: 'success' | 'failed'
  data: ContractorInvoiceSummary
  message?: string
}

export interface AvailableTasksResponse {
  status: 'success' | 'failed'
  data: AvailableTask[]
  message?: string
}

export interface ContractorInvoiceItemResponse {
  status: 'success' | 'failed'
  data: ContractorInvoiceItem
  message?: string
}

export interface DeleteContractorInvoiceResponse {
  status: 'success' | 'failed'
  message: string
}

// Invoice PDF file
export interface ContractorInvoiceFile {
  id: string
  invoiceId: string
  filePath: string
  fileName: string
  fileVersion: number
  isCurrent: boolean
  createdAt: string
}

// Monthly earnings data
export interface ContractorMonthlyEarnings {
  currentMonth: { paid: number; approved: number; pending: number; label: string }
  lastMonth: { paid: number; approved: number; pending: number; label: string }
  allTime: { paid: number; approved: number; pending: number }
}

// PDF generation response
export interface ContractorInvoicePDFResponse {
  status: 'success' | 'failed'
  data?: { fileId: string; fileName: string; fileVersion: number; signedUrl: string | null }
  message?: string
}

export interface ContractorInvoiceFilesResponse {
  status: 'success' | 'failed'
  data: ContractorInvoiceFile[]
  message?: string
}

export interface ContractorInvoiceFileDownloadResponse {
  status: 'success' | 'failed'
  data?: { signedUrl: string; fileName: string }
  message?: string
}

export interface ContractorMonthlyEarningsResponse {
  status: 'success' | 'failed'
  data: ContractorMonthlyEarnings
  message?: string
}

// Status display helpers
export const CONTRACTOR_INVOICE_STATUS_INFO: Record<ContractorInvoiceStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'gray' },
  pending: { label: 'Pending', color: 'amber' },
  approved: { label: 'Approved', color: 'blue' },
  rejected: { label: 'Rejected', color: 'red' },
  paid: { label: 'Paid', color: 'green' },
  archived: { label: 'Archived', color: 'slate' },
}
