import apiClient from './apiClient';
import { 
  HostawayConnectionResponse, 
  HostawayConnectionsResponse, 
  CreateHostawayConnectionPayload, 
  UpdateHostawayConnectionPayload,
  TestCredentialsPayload,
  TestCredentialsResponse,
  GetAccessTokenPayload,
  GetAccessTokenResponse
} from './types/hostawayConnection';

export function getConnectionByUserId(userId: string): Promise<HostawayConnectionResponse> {
  return apiClient<HostawayConnectionResponse>(`/hostaway-connections/${userId}`);
}

export function getAllConnections(): Promise<HostawayConnectionsResponse> {
  return apiClient<HostawayConnectionsResponse>('/hostaway-connections');
}

export function createConnection(connectionData: CreateHostawayConnectionPayload): Promise<HostawayConnectionResponse> {
  return apiClient<HostawayConnectionResponse>('/hostaway-connections', {
    method: 'POST',
    body: connectionData,
  });
}

export function updateConnection(connectionId: string, connectionData: UpdateHostawayConnectionPayload): Promise<HostawayConnectionResponse> {
  return apiClient<HostawayConnectionResponse>(`/hostaway-connections/${connectionId}`, {
    method: 'PUT',
    body: connectionData,
  });
}

export function deleteConnection(connectionId: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/hostaway-connections/${connectionId}`, {
    method: 'DELETE',
  });
}

export function testCredentials(credentialsData: TestCredentialsPayload): Promise<TestCredentialsResponse> {
  return apiClient<TestCredentialsResponse>('/hostaway-connections/test-credentials', {
    method: 'POST',
    body: credentialsData,
  });
}

export function getAccessToken(credentialsData: GetAccessTokenPayload): Promise<GetAccessTokenResponse> {
  return apiClient<GetAccessTokenResponse>('/hostaway-connections/get-access-token', {
    method: 'POST',
    body: credentialsData,
  });
}

export function disconnectHostaway(connectionId: string): Promise<{ status: string; message: string; warnings?: string[] }> {
  return apiClient<{ status: string; message: string; warnings?: string[] }>(`/hostaway-connections/${connectionId}/disconnect`, {
    method: 'POST',
  });
}