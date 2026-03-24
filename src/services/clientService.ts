import apiClient from './apiClient';
import {
  ClientResponse,
  ClientsResponse,
  ClientStatsResponse,
  CreateClientPayload,
  UpdateClientPayload,
  BulkImportClientsPayload,
  BulkImportClientsResponse
} from './types/client';

export function getClientsByParentId(parentId: string): Promise<ClientsResponse> {
  return apiClient<ClientsResponse>(`/client/${parentId}`);
}

export function getClientStats(parentId: string): Promise<ClientStatsResponse> {
  return apiClient<ClientStatsResponse>(`/client/stats/${parentId}`);
}

export function searchClients(parentId: string, query: string): Promise<ClientsResponse> {
  return apiClient<ClientsResponse>(`/client/search/${parentId}?query=${encodeURIComponent(query)}`);
}

export function getClientById(id: string): Promise<ClientResponse> {
  return apiClient<ClientResponse>(`/client/detail/${id}`);
}

export function createClient(clientData: CreateClientPayload): Promise<ClientResponse> {
  return apiClient<ClientResponse>(`/client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: clientData,
  });
}

export function updateClient(id: string, updateData: UpdateClientPayload): Promise<ClientResponse> {
  return apiClient<ClientResponse>(`/client/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: updateData,
  });
}

export function deleteClient(id: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/client/${id}`, {
    method: 'DELETE',
  });
}

export function bulkImportClients(
  data: BulkImportClientsPayload
): Promise<BulkImportClientsResponse> {
  return apiClient<BulkImportClientsResponse, BulkImportClientsPayload>(
    '/client/bulk',
    {
      method: 'POST',
      body: data,
    }
  );
}

// Client Portal invitation management (PM-side)
export function inviteClientToPortal(clientId: string): Promise<{ status: string; message: string; data?: { authUserId: string; portalStatus: string } }> {
  return apiClient(`/client/${clientId}/invite`, { method: 'POST' });
}

export function resendClientPortalInvite(clientId: string): Promise<{ status: string; message: string }> {
  return apiClient(`/client/${clientId}/resend-invite`, { method: 'POST' });
}

export function revokeClientPortalAccess(clientId: string): Promise<{ status: string; message: string }> {
  return apiClient(`/client/${clientId}/revoke-access`, { method: 'POST' });
}

export function restoreClientPortalAccess(clientId: string): Promise<{ status: string; message: string }> {
  return apiClient(`/client/${clientId}/restore-access`, { method: 'POST' });
}

// Get client by Supabase auth user ID (used during login flow)
export function getClientByAuthUserId(authUserId: string): Promise<{ status: string; data: { id: string; pmUserId: string; name: string; email: string; portalStatus: string } }> {
  return apiClient(`/client/by-auth-user/${authUserId}`);
}