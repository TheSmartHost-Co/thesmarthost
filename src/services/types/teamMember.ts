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
}

// Update payload
export interface UpdateTeamMemberPayload {
  name?: string
  phone?: string | null
  status?: 'active' | 'inactive'
  permissions?: Permissions
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
