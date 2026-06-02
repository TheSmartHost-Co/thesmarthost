import type { Permissions } from '@/constants/permissionTemplates'

// Team member entity - staff managed by PM with page-level permissions
export interface TeamMember {
  id: string
  userId: string            // PM who manages this team member
  authUserId?: string | null // Supabase auth user (for team member login)
  name: string
  email: string
  phone?: string | null
  status: 'invited' | 'active' | 'inactive'
  permissions: Permissions
  // Time-sheet wage settings (added 2026-05)
  hourlyRate?: number | null
  weeklyMaxHours?: number | null
  currency?: string                       // ISO 4217; defaults to 'CAD'
  // Paystub number prefix (e.g. "JS" → "JS-2026-0001"). Falls back to TM-name initials when null.
  invoicePrefix?: string | null
  lastActiveAt?: string | null
  createdAt: string
  updatedAt?: string | null
}

// Create payload - email is required for auth invite
export interface CreateTeamMemberPayload {
  userId: string
  name: string
  email: string
  phone?: string
  permissions: Permissions
  hourlyRate?: number | null
  weeklyMaxHours?: number | null
  currency?: string
}

// Update payload. Wage fields use COALESCE on the backend, so omit to leave
// unchanged. Pass `0` to "clear" a rate. `invoicePrefix` is nullable —
// omit to leave unchanged, pass null to clear back to TM-name initials.
export interface UpdateTeamMemberPayload {
  name?: string
  phone?: string | null
  status?: 'active' | 'inactive'
  permissions?: Permissions
  hourlyRate?: number | null
  weeklyMaxHours?: number | null
  currency?: string
  invoicePrefix?: string | null
}

// API responses
export interface TeamMemberResponse {
  status: 'success' | 'failed'
  data: TeamMember
  message?: string
}

export interface TeamMembersResponse {
  status: 'success' | 'failed'
  data: TeamMember[]
  message?: string
}

export interface DeleteTeamMemberResponse {
  status: 'success' | 'failed'
  message: string
}

// Stats for the management page
export interface TeamMemberStats {
  total: number
  active: number
  inactive: number
  invited: number
}
