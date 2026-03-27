import apiClient from './apiClient';
import {
  ClientPortalMeResponse,
  ClientPortalDashboardResponse,
  ClientPortalPropertiesResponse,
  ClientPortalPropertyResponse,
  ClientPortalBookingsResponse,
  ClientPortalCleaningProjectsResponse,
  ClientPortalChecklistsResponse,
  ClientPortalChecklistResponse,
  ClientPortalIssuesResponse,
  ClientPortalProjectDetailResponse,
  ClientPortalReportsResponse,
} from './types/clientPortal';

// No userId parameter needed — the backend determines scoping from the JWT + auth middleware

export function getClientPortalMe(): Promise<ClientPortalMeResponse> {
  return apiClient<ClientPortalMeResponse>('/client-portal/me');
}

export function getClientPortalDashboard(): Promise<ClientPortalDashboardResponse> {
  return apiClient<ClientPortalDashboardResponse>('/client-portal/dashboard');
}

export function getClientPortalProperties(): Promise<ClientPortalPropertiesResponse> {
  return apiClient<ClientPortalPropertiesResponse>('/client-portal/properties');
}

export function getClientPortalPropertyById(id: string): Promise<ClientPortalPropertyResponse> {
  return apiClient<ClientPortalPropertyResponse>(`/client-portal/properties/${id}`);
}

export function getClientPortalBookings(filters?: { startDate?: string; endDate?: string }): Promise<ClientPortalBookingsResponse> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return apiClient<ClientPortalBookingsResponse>(`/client-portal/bookings${qs ? `?${qs}` : ''}`);
}

export function getClientPortalCleaningProjects(filters?: { startDate?: string; endDate?: string }): Promise<ClientPortalCleaningProjectsResponse> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return apiClient<ClientPortalCleaningProjectsResponse>(`/client-portal/cleaning-projects${qs ? `?${qs}` : ''}`);
}

export function getClientPortalChecklists(): Promise<ClientPortalChecklistsResponse> {
  return apiClient<ClientPortalChecklistsResponse>('/client-portal/checklists');
}

export function getClientPortalChecklistById(id: string): Promise<ClientPortalChecklistResponse> {
  return apiClient<ClientPortalChecklistResponse>(`/client-portal/checklists/${id}`);
}

export function getClientPortalIssues(): Promise<ClientPortalIssuesResponse> {
  return apiClient<ClientPortalIssuesResponse>('/client-portal/issues');
}

export function getClientPortalProjectById(id: string): Promise<ClientPortalProjectDetailResponse> {
  return apiClient<ClientPortalProjectDetailResponse>(`/client-portal/cleaning-projects/${id}`);
}

export function getClientPortalReports(filters?: {
  propertyId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ClientPortalReportsResponse> {
  const params = new URLSearchParams();
  if (filters?.propertyId) params.set('propertyId', filters.propertyId);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return apiClient<ClientPortalReportsResponse>(`/client-portal/reports${qs ? `?${qs}` : ''}`);
}
