// Paystub statuses
export type PaystubStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'archived'

// Line item type discriminator
export type PaystubItemType = 'time_entry' | 'expense' | 'extra_charge'

// Main paystub entity
export interface Paystub {
  id: string
  userId: string
  teamMemberId: string
  paystubNumber: string
  periodStart: string | null
  periodEnd: string | null
  payDate: string | null
  status: PaystubStatus
  subtotal: number
  total: number
  currency: string
  payToName?: string | null
  billFromName?: string | null
  // Frozen-at-payment snapshot fields (populated when status='paid')
  totalHoursSnapshot?: number | null
  totalAmountSnapshot?: number | null
  currencyAtPayment?: string | null
  paidByAuthUserId?: string | null
  tmNotes?: string | null
  pmNotes?: string | null
  submittedAt?: string | null
  approvedAt?: string | null
  rejectedAt?: string | null
  paidAt?: string | null
  createdAt: string
  updatedAt?: string | null
  // Joined team-member data
  teamMemberName?: string | null
  teamMemberEmail?: string | null
  teamMemberPhone?: string | null
  teamMemberHourlyRate?: number | null
  teamMemberInvoicePrefix?: string | null
  teamMemberAuthUserId?: string | null
  teamMemberBusinessName?: string | null
  itemCount?: number
  // Populated by GET /paystubs/:id
  items?: PaystubItem[]
}

// Paystub line item
export interface PaystubItem {
  id: string
  paystubId: string
  itemType: PaystubItemType
  timeEntryId?: string | null
  expenseId?: string | null
  receiptId?: string | null
  propertyId?: string | null
  projectDate?: string | null
  description: string
  hoursWorked?: number | null
  hourlyRateAtEntry?: number | null
  currencyAtEntry?: string | null
  amount: number
  isManualOverride: boolean
  originalAmount?: number | null
  originalDurationMinutes?: number | null
  notes?: string | null
  sortOrder: number
  createdAt: string
  // Joined property + receipt data
  propertyName?: string | null
  propertyAddress?: string | null
  receiptOriginalName?: string | null
  receiptStoragePath?: string | null
  receiptMimeType?: string | null
  receiptSignedUrl?: string | null
}

// Available time entry for paystub creation
export interface AvailableTimeEntry {
  id: string
  teamMemberId: string
  startedAt: string
  endedAt: string | null
  hoursWorked: number | null
  hourlyRateAtEntry: number | null
  currencyAtEntry: string | null
  status: string
  notes: string | null
  createdAt: string
}

// Available TM-paid expense for paystub creation
export interface AvailablePaystubExpense {
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
  isReimbursable?: boolean
  createdAt: string
  propertyName: string | null
  propertyAddress: string | null
  receiptOriginalName: string | null
  receiptStoragePath: string | null
}

// Summary stats
export interface PaystubSummary {
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

// Monthly earnings (TM dashboard)
export interface MonthlyEarnings {
  currentMonth: { paid: number; approved: number; pending: number; label: string }
  lastMonth: { paid: number; approved: number; pending: number; label: string }
  allTime: { paid: number; approved: number; pending: number }
}

// Extra item payload at creation time
export interface PaystubExtraItemPayload {
  description: string
  amount: number
  propertyId: string
  category?: string
  vendorName?: string
  expenseDate?: string
  paymentMethod?: string
  subtotal?: number
  taxGst?: number
  taxPst?: number
  taxHst?: number
  taxQst?: number
  taxTotal?: number
}

// ---- Payloads --------------------------------------------------------------

export interface CreatePaystubPayload {
  teamMemberId?: string                 // PM-only; ignored for TMs
  periodStart?: string
  periodEnd?: string
  payDate?: string
  timeEntryIds?: string[]
  expenseIds?: string[]
  receiptIds?: string[]
  extraItems?: PaystubExtraItemPayload[]
}

export interface UpdatePaystubPayload {
  periodStart?: string
  periodEnd?: string
  payDate?: string
  tmNotes?: string | null
  pmNotes?: string | null
  paystubNumber?: string
  payToName?: string | null
  billFromName?: string | null
}

export interface UpdatePaystubItemPayload {
  description?: string
  hoursWorked?: number | null
  hourlyRateAtEntry?: number | null
  amount?: number
  notes?: string | null
}

// Flow A: extra-charge add. Flow B: pass expenseId to link. Flow C: pass receiptId to convert.
export interface AddPaystubItemPayload {
  description?: string
  amount?: number
  notes?: string | null
  propertyId?: string
  expenseDate?: string
  expenseId?: string
  receiptId?: string
  category?: string
  vendorName?: string
  paymentMethod?: string
  subtotal?: number
  taxGst?: number
  taxPst?: number
  taxHst?: number
  taxQst?: number
  taxTotal?: number
}

export interface AddPaystubExpensePayload {
  expenseId: string
}

// Convert an extra_charge item to a tracked expense
export interface ConvertPaystubItemToExpensePayload {
  propertyId: string
  amount?: number
  category?: string
  vendorName?: string
  description?: string
  expenseDate?: string
  paymentMethod?: string
  paymentStatus?: string
  isReimbursable?: boolean
  isTaxDeductible?: boolean
  paidById?: string
  paidByType?: string
  currency?: string
  subtotal?: number
  taxGst?: number
  taxPst?: number
  taxHst?: number
  taxQst?: number
  taxTotal?: number
}

// PDF file
export interface PaystubFile {
  id: string
  paystubId: string
  filePath: string
  fileName: string
  fileVersion: number
  isCurrent: boolean
  createdAt: string
}

// ---- API Responses ---------------------------------------------------------

export interface PaystubResponse {
  status: 'success' | 'failed'
  data: Paystub
  message?: string
}

export interface PaystubsResponse {
  status: 'success' | 'failed'
  data: Paystub[]
  message?: string
}

export interface PaystubSummaryResponse {
  status: 'success' | 'failed'
  data: PaystubSummary
  message?: string
}

export interface AvailableTimeEntriesResponse {
  status: 'success' | 'failed'
  data: AvailableTimeEntry[]
  message?: string
}

export interface AvailablePaystubExpensesResponse {
  status: 'success' | 'failed'
  data: AvailablePaystubExpense[]
  message?: string
}

export interface PaystubItemResponse {
  status: 'success' | 'failed'
  data: PaystubItem
  message?: string
}

export interface DeletePaystubResponse {
  status: 'success' | 'failed'
  message: string
}

export interface PaystubPDFResponse {
  status: 'success' | 'failed'
  data?: { fileId: string; fileName: string; fileVersion: number; signedUrl: string | null }
  message?: string
}

export interface PaystubFilesResponse {
  status: 'success' | 'failed'
  data: PaystubFile[]
  message?: string
}

export interface PaystubFileDownloadResponse {
  status: 'success' | 'failed'
  data?: { signedUrl: string; fileName: string }
  message?: string
}

export interface MonthlyEarningsResponse {
  status: 'success' | 'failed'
  data: MonthlyEarnings
  message?: string
}

export interface ConvertPaystubItemToExpenseResponse {
  status: 'success' | 'failed'
  data: {
    expense: Record<string, unknown>
    paystubItem: PaystubItem
  }
  message?: string
}

// Status display info: label + Tailwind classes for pill and banner.
// Classes are spelled out (not interpolated) so the JIT compiler keeps them.
export interface PaystubStatusVisual {
  label: string
  color: 'gray' | 'amber' | 'blue' | 'red' | 'green' | 'slate'
  pill: string
  banner: string
}

export const PAYSTUB_STATUS_INFO: Record<PaystubStatus, PaystubStatusVisual> = {
  draft:    { label: 'Draft',    color: 'gray',  pill: 'bg-gray-100 text-gray-700',   banner: 'bg-gray-50 border-gray-200 text-gray-800' },
  pending:  { label: 'Pending',  color: 'amber', pill: 'bg-amber-100 text-amber-700', banner: 'bg-amber-50 border-amber-200 text-amber-800' },
  approved: { label: 'Approved', color: 'blue',  pill: 'bg-blue-100 text-blue-700',   banner: 'bg-blue-50 border-blue-200 text-blue-800' },
  rejected: { label: 'Rejected', color: 'red',   pill: 'bg-red-100 text-red-700',     banner: 'bg-red-50 border-red-200 text-red-800' },
  paid:     { label: 'Paid',     color: 'green', pill: 'bg-green-100 text-green-700', banner: 'bg-green-50 border-green-200 text-green-800' },
  archived: { label: 'Archived', color: 'slate', pill: 'bg-slate-100 text-slate-700', banner: 'bg-slate-50 border-slate-200 text-slate-800' },
}

// Statuses where a time entry is locked from editing/deletion
export const LOCKED_PAYSTUB_STATUSES: PaystubStatus[] = ['pending', 'approved', 'paid', 'archived']
