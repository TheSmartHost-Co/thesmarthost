import apiClient from './apiClient'
import type {
  Contractor,
  ContractorResponse,
  ContractorsResponse,
  ContractorStats,
  ContractorStatsResponse,
  CreateContractorPayload,
  UpdateContractorPayload,
  DeleteContractorResponse,
} from './types/contractor'

export function getContractors(userId: string): Promise<ContractorsResponse> {
  return apiClient<ContractorsResponse>(`/contractors?userId=${userId}`)
}

/**
 * Get contractor record by their Supabase auth user ID (for contractor portal)
 * This allows a logged-in contractor to find their contractor record and PM's userId
 */
export function getContractorByAuthUserId(authUserId: string): Promise<ContractorResponse> {
  return apiClient<ContractorResponse>(`/contractors/me?authUserId=${authUserId}`)
}

export function getContractorById(id: string): Promise<ContractorResponse> {
  return apiClient<ContractorResponse>(`/contractors/${id}`)
}

export function getContractorStats(userId: string): Promise<ContractorStatsResponse> {
  return apiClient<ContractorStatsResponse>(`/contractors/stats?userId=${userId}`)
}

export function createContractor(data: CreateContractorPayload): Promise<ContractorResponse> {
  return apiClient<ContractorResponse, CreateContractorPayload>('/contractors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  })
}

export function updateContractor(id: string, data: UpdateContractorPayload): Promise<ContractorResponse> {
  return apiClient<ContractorResponse, UpdateContractorPayload>(`/contractors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  })
}

export function deleteContractor(id: string): Promise<DeleteContractorResponse> {
  return apiClient<DeleteContractorResponse>(`/contractors/${id}`, {
    method: 'DELETE',
  })
}

export function resendContractorInvite(contractorId: string): Promise<{ status: 'success' | 'failed'; message: string }> {
  return apiClient<{ status: 'success' | 'failed'; message: string }>(
    `/contractors/${contractorId}/resend-invite`,
    {
      method: 'POST',
    }
  )
}

// Helper: Calculate stats from contractor list (client-side)
export function calculateContractorStats(contractors: Contractor[]): ContractorStats {
  return {
    total: contractors.length,
    active: contractors.filter(c => c.status === 'active').length,
    inactive: contractors.filter(c => c.status === 'inactive').length,
    invited: contractors.filter(c => c.status === 'invited').length,
  }
}
