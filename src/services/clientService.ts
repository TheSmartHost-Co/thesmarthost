import apiClient from './apiClient';
import { ClientResponse, ClientsResponse, ClientStatsResponse, CreateClientPayload, UpdateClientPayload } from './types/client';

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