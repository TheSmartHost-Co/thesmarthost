import apiClient from './apiClient'
import type {
  TeamMember,
  TeamMemberResponse,
  TeamMembersResponse,
  TeamMemberStats,
  CreateTeamMemberPayload,
  UpdateTeamMemberPayload,
  DeleteTeamMemberResponse,
} from './types/teamMember'

export function getTeamMembers(userId: string): Promise<TeamMembersResponse> {
  return apiClient<TeamMembersResponse>(`/team-members?userId=${userId}`)
}

export function getTeamMember(id: string): Promise<TeamMemberResponse> {
  return apiClient<TeamMemberResponse>(`/team-members/${id}`)
}

/**
 * Get team member record by their Supabase auth user ID (for team member portal)
 * This allows a logged-in team member to find their record and PM's userId
 */
export function getTeamMemberByAuthUserId(authUserId: string): Promise<TeamMemberResponse> {
  return apiClient<TeamMemberResponse>(`/team-members/me?authUserId=${authUserId}`)
}

export function createTeamMember(data: CreateTeamMemberPayload): Promise<TeamMemberResponse> {
  return apiClient<TeamMemberResponse, CreateTeamMemberPayload>('/team-members', {
    method: 'POST',
    body: data,
  })
}

export function updateTeamMember(id: string, data: UpdateTeamMemberPayload): Promise<TeamMemberResponse> {
  return apiClient<TeamMemberResponse, UpdateTeamMemberPayload>(`/team-members/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export function deleteTeamMember(id: string): Promise<DeleteTeamMemberResponse> {
  return apiClient<DeleteTeamMemberResponse>(`/team-members/${id}`, {
    method: 'DELETE',
  })
}

export function resendTeamMemberInvite(id: string): Promise<{ status: 'success' | 'failed'; message: string }> {
  return apiClient<{ status: 'success' | 'failed'; message: string }>(
    `/team-members/${id}/resend-invite`,
    { method: 'POST' }
  )
}

// Helper: Calculate stats from team member list (client-side)
export function calculateTeamMemberStats(members: TeamMember[]): TeamMemberStats {
  return {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    inactive: members.filter(m => m.status === 'inactive').length,
    invited: members.filter(m => m.status === 'invited').length,
  }
}
