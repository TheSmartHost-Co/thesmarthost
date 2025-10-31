import apiClient from './apiClient';
import { StatusCodeResponse, StatusCodesResponse, CreateStatusCodePayload, UpdateStatusCodePayload } from './types/clientCode';

export function getStatusCodesByUserId(userId: string): Promise<StatusCodesResponse> {
  return apiClient<StatusCodesResponse>(`/client-status/${userId}`);
}

export function getDefaultStatusByUserId(userId: string): Promise<StatusCodeResponse> {
  return apiClient<StatusCodeResponse>(`/client-status/default/${userId}`);
}

export function getStatusCodeById(id: string): Promise<StatusCodeResponse> {
  return apiClient<StatusCodeResponse>(`/client-status/detail/${id}`);
}

export function createStatusCode(statusData: CreateStatusCodePayload): Promise<StatusCodeResponse> {
  return apiClient<StatusCodeResponse>(`/client-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: statusData,
  });
}

export function updateStatusCode(id: string, updateData: UpdateStatusCodePayload): Promise<StatusCodeResponse> {
  return apiClient<StatusCodeResponse>(`/client-status/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: updateData,
  });
}

export function deleteStatusCode(id: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/client-status/${id}`, {
    method: 'DELETE',
  });
}