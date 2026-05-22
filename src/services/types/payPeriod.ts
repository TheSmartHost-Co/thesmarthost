// Pay-Schedule / Pay-Period types
//
// Per-PM payroll schedule on top of the time-sheet system. Configuration
// (cadence + anchor + pay-date offset) seeds rolling `pay_periods` whose
// totals accumulate from `time_entries` falling inside their window.

import type { TimeEntry } from './timeEntry'

export type Cadence = 'weekly' | 'biweekly' | 'monthly'
export type PayPeriodStatus = 'open' | 'paid'

// ---- Settings -------------------------------------------------------------

export interface PayScheduleSettings {
  userId: string
  cadence: Cadence
  anchorDate: string                  // YYYY-MM-DD
  payDateOffsetDays: number           // 0-30
  currency: string                    // ISO, default 'CAD'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PayScheduleSettingsPayload {
  cadence: Cadence
  anchorDate: string
  payDateOffsetDays?: number
  currency?: string
  isActive?: boolean
}

// ---- Period totals --------------------------------------------------------

export interface PayPeriodTotals {
  hoursApproved: number
  hoursPending: number
  amountApproved: number
  amountPending: number
  pendingEntryCount: number
  approvedEntryCount: number
  hasPending: boolean
  currency?: string                   // present only on detail response
}

// ---- Period ---------------------------------------------------------------

export interface PayPeriod {
  id: string
  userId: string
  teamMemberId: string
  teamMemberName: string | null
  teamMemberEmail: string | null
  periodYear: number
  periodNumber: number
  startDate: string                   // YYYY-MM-DD
  endDate: string
  payDate: string
  periodLengthDays: number
  cadenceAtCreation: Cadence
  status: PayPeriodStatus
  totalHoursSnapshot: number | null
  totalAmountSnapshot: number | null
  currencyAtPayment: string | null
  paidAt: string | null
  paidByAuthUserId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// List row includes live totals.
export interface PayPeriodRow extends PayPeriod {
  totals: PayPeriodTotals
}

// ---- Detail response ------------------------------------------------------
// A period belongs to exactly one team member; member identity is on the
// period row itself (teamMemberId / teamMemberName / teamMemberEmail).

export interface PayPeriodDetail {
  period: PayPeriod
  totals: PayPeriodTotals
  entries: TimeEntry[]
}

// ---- Payloads -------------------------------------------------------------

export interface CreatePayPeriodPayload {
  teamMemberId: string                // required — periods are per-member
  startDate: string
  endDate: string
  payDate?: string                    // omit → backend derives from offset
  notes?: string
}

export interface UpdatePayPeriodPayload {
  startDate?: string
  endDate?: string
  payDate?: string
  notes?: string
}

// ---- Response envelopes --------------------------------------------------

export interface PayScheduleSettingsResponse {
  status: 'success' | 'failed'
  data: PayScheduleSettings | null
  message?: string
}

export interface PayPeriodResponse {
  status: 'success' | 'failed'
  data: PayPeriod
  message?: string
}

export interface PayPeriodListResponse {
  status: 'success' | 'failed'
  data: PayPeriodRow[]
  message?: string
}

export interface PayPeriodDetailResponse {
  status: 'success' | 'failed'
  data: PayPeriodDetail
  message?: string
}

export interface ApproveAllResponse {
  status: 'success' | 'failed'
  data: {
    approvedCount: number
    approvedIds: string[]
  }
  message?: string
}

export interface DeletePayPeriodResponse {
  status: 'success' | 'failed'
  message: string
}
