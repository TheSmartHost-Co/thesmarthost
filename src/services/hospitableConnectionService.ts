import apiClient from './apiClient';
import {
  HospitableConnectionResponse,
  HospitableConnectionsResponse,
  CreateHospitableConnectionPayload,
  UpdateHospitableConnectionPayload,
  TestCredentialsPayload,
  TestCredentialsResponse,
  FetchReservationsResponse
} from './types/hospitableConnection';

export function getConnectionByUserId(userId: string): Promise<HospitableConnectionResponse> {
  return apiClient<HospitableConnectionResponse>(`/hospitable-connections/${userId}`);
}

export function getAllConnections(): Promise<HospitableConnectionsResponse> {
  return apiClient<HospitableConnectionsResponse>('/hospitable-connections');
}

export function createConnection(connectionData: CreateHospitableConnectionPayload): Promise<HospitableConnectionResponse> {
  return apiClient<HospitableConnectionResponse>('/hospitable-connections', {
    method: 'POST',
    body: connectionData,
  });
}

export function updateConnection(connectionId: string, connectionData: UpdateHospitableConnectionPayload): Promise<HospitableConnectionResponse> {
  return apiClient<HospitableConnectionResponse>(`/hospitable-connections/${connectionId}`, {
    method: 'PUT',
    body: connectionData,
  });
}

export function deleteConnection(connectionId: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/hospitable-connections/${connectionId}`, {
    method: 'DELETE',
  });
}

export function testCredentials(credentialsData: TestCredentialsPayload): Promise<TestCredentialsResponse> {
  return apiClient<TestCredentialsResponse>('/hospitable-connections/test-credentials', {
    method: 'POST',
    body: credentialsData,
  });
}

export function disconnectHospitable(connectionId: string): Promise<{ status: string; message: string; warnings?: string[] }> {
  return apiClient<{ status: string; message: string; warnings?: string[] }>(`/hospitable-connections/${connectionId}/disconnect`, {
    method: 'POST',
  });
}

/**
 * Fetch reservations from Hospitable API for a given date range
 */
export function fetchReservations(
  connectionId: string,
  startDate: string,
  endDate: string
): Promise<FetchReservationsResponse> {
  const params = new URLSearchParams({
    startDate,
    endDate
  });
  return apiClient<FetchReservationsResponse>(
    `/hospitable-connections/${connectionId}/reservations?${params.toString()}`
  );
}

/**
 * Generate the webhook URL for a user's Hospitable connection
 * This URL should be configured in the Hospitable dashboard
 */
export function getWebhookUrl(userId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000';
  return `${baseUrl}/api/webhooks/hospitable/${userId}`;
}
