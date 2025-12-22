import apiClient from './apiClient';
import {
  GuestyConnectionResponse,
  GuestyConnectionsResponse,
  CreateGuestyConnectionPayload,
  UpdateGuestyConnectionPayload,
  TestGuestyCredentialsPayload,
  TestGuestyCredentialsResponse,
  GetGuestyAccessTokenPayload,
  GetGuestyAccessTokenResponse
} from './types/guestyConnection';

export function getConnectionByUserId(userId: string): Promise<GuestyConnectionResponse> {
  return apiClient<GuestyConnectionResponse>(`/guesty-connections/${userId}`);
}

export function getAllConnections(): Promise<GuestyConnectionsResponse> {
  return apiClient<GuestyConnectionsResponse>('/guesty-connections');
}

export function createConnection(connectionData: CreateGuestyConnectionPayload): Promise<GuestyConnectionResponse> {
  return apiClient<GuestyConnectionResponse>('/guesty-connections', {
    method: 'POST',
    body: connectionData,
  });
}

export function updateConnection(connectionId: string, connectionData: UpdateGuestyConnectionPayload): Promise<GuestyConnectionResponse> {
  return apiClient<GuestyConnectionResponse>(`/guesty-connections/${connectionId}`, {
    method: 'PUT',
    body: connectionData,
  });
}

export function deleteConnection(connectionId: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/guesty-connections/${connectionId}`, {
    method: 'DELETE',
  });
}

export function testCredentials(credentialsData: TestGuestyCredentialsPayload): Promise<TestGuestyCredentialsResponse> {
  return apiClient<TestGuestyCredentialsResponse>('/guesty-connections/test-credentials', {
    method: 'POST',
    body: credentialsData,
  });
}

export function getAccessToken(credentialsData: GetGuestyAccessTokenPayload): Promise<GetGuestyAccessTokenResponse> {
  return apiClient<GetGuestyAccessTokenResponse>('/guesty-connections/get-access-token', {
    method: 'POST',
    body: credentialsData,
  });
}

export function disconnectGuesty(connectionId: string): Promise<{ status: string; message: string; warnings?: string[] }> {
  return apiClient<{ status: string; message: string; warnings?: string[] }>(`/guesty-connections/${connectionId}/disconnect`, {
    method: 'POST',
  });
}
