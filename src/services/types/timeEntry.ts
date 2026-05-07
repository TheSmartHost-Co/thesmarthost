// Time-Sheet types
//
// A TimeEntry is one row per shift. ended_at == null means the team member
// is currently clocked in. Approval workflow drives over-cap requests and
// manual backfills.

export type TimeEntryStatus = 'open' | 'approved' | 'pending' | 'rejected'

export type PendingKind = 'over_cap' | 'backfill'

export interface TimeEntry {
  id: string
  userId: string                          // PM
  teamMemberId: string
  teamMemberName?: string | null
  startedAt: string                       // ISO
  endedAt: string | null                  // ISO; null while open
  hoursWorked: number | null              // null while open
  hourlyRateAtEntry: number | null
  currencyAtEntry: string | null
  status: TimeEntryStatus
  pendingReason: string | null
  pendingKind: PendingKind | null
  notes: string | null
  reviewedByAuthUserId: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string | null
}

// ---- Payloads ---------------------------------------------------------------

export interface ClockOutPayload {
  overCapReason?: string                  // required only when going over cap
}

export interface BackfillTimeEntryPayload {
  startedAt: string                       // ISO
  endedAt: string                         // ISO
  notes?: string
  backfillReason: string                  // required
}

export interface UpdateTimeEntryPayload {
  startedAt?: string
  endedAt?: string | null
  notes?: string | null
  overCapReason?: string
  // PM-only:
  hourlyRateAtEntry?: number | null
  currencyAtEntry?: string | null
}

export interface RejectTimeEntryPayload {
  rejectionReason: string
}

// ---- /me response payload (team member view) --------------------------------

export interface MyTimeMember {
  id: string
  name: string
  email: string
  hourlyRate: number | null
  weeklyMaxHours: number | null
  currency: string
  pmTimezone: string
}

export interface MyTimeEntriesData {
  teamMember: MyTimeMember
  currentOpenEntry: TimeEntry | null
  entries: TimeEntry[]
}

// ---- /summary response payload (admin dashboard) ----------------------------

export interface TeamTimeSummaryRow {
  teamMemberId: string
  teamMemberName: string
  teamMemberEmail: string
  memberStatus: 'invited' | 'active' | 'inactive'
  hourlyRate: number | null
  weeklyMaxHours: number | null
  currency: string
  hoursApproved: number
  hoursPending: number
  hoursRejected: number
  dollarsApproved: number
  pendingEntryCount: number
  isCurrentlyClockedIn: boolean
  isOverCap: boolean
}

export interface TeamTimeSummaryData {
  weekStart: string                       // ISO instant (UTC)
  weekEnd: string
  pmTimezone: string
  rows: TeamTimeSummaryRow[]
}

// ---- API response wrappers --------------------------------------------------

export interface TimeEntryResponse {
  status: 'success' | 'failed'
  data: TimeEntry
  message?: string
}

export interface TimeEntriesResponse {
  status: 'success' | 'failed'
  data: TimeEntry[]
  message?: string
}

export interface MyTimeEntriesResponse {
  status: 'success' | 'failed'
  data: MyTimeEntriesData
  message?: string
}

export interface TeamTimeSummaryResponse {
  status: 'success' | 'failed'
  data: TeamTimeSummaryData
  message?: string
}

export interface DeleteTimeEntryResponse {
  status: 'success' | 'failed'
  message: string
}
