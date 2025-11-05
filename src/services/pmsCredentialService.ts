import apiClient from './apiClient';
import { PMSCredentialResponse, PMSCredentialsResponse, PMSCredentialsCheckResponse, CreatePMSCredentialPayload, UpdatePMSCredentialPayload } from './types/pmsCredential';

export function getCredentialsByClientId(clientId: string): Promise<PMSCredentialsResponse> {
  return apiClient<PMSCredentialsResponse>(`/pms-credentials/client/${clientId}`);
}

export function checkCredentialsExist(clientId: string): Promise<PMSCredentialsCheckResponse> {
  return apiClient<PMSCredentialsCheckResponse>(`/pms-credentials/check/${clientId}`);
}

export function getCredentialById(id: string): Promise<PMSCredentialResponse> {
  return apiClient<PMSCredentialResponse>(`/pms-credentials/${id}`);
}

export function createCredential(credentialData: CreatePMSCredentialPayload): Promise<PMSCredentialResponse> {
  return apiClient<PMSCredentialResponse>(`/pms-credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: credentialData,
  });
}

export function updateCredential(id: string, updateData: UpdatePMSCredentialPayload): Promise<PMSCredentialResponse> {
  return apiClient<PMSCredentialResponse>(`/pms-credentials/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: updateData,
  });
}

export function deleteCredential(id: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/pms-credentials/${id}`, {
    method: 'DELETE',
  });
}