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
  ClientPortalReceiptsResponse,
  ClientPortalReceiptResponse,
  ClientPortalExpensesResponse,
  ClientPortalExpenseResponse,
  ClientPortalPropertyWalkthroughTemplateResponse,
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

export function getClientPortalPropertyWalkthroughTemplate(
  propertyId: string,
): Promise<ClientPortalPropertyWalkthroughTemplateResponse> {
  return apiClient<ClientPortalPropertyWalkthroughTemplateResponse>(
    `/client-portal/properties/${propertyId}/walkthrough-template`,
  );
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

export function getClientPortalReceipts(filters?: {
  propertyId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ClientPortalReceiptsResponse> {
  const params = new URLSearchParams();
  if (filters?.propertyId) params.set('propertyId', filters.propertyId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.includeArchived) params.set('includeArchived', 'true');
  if (filters?.limit != null) params.set('limit', String(filters.limit));
  if (filters?.offset != null) params.set('offset', String(filters.offset));
  const qs = params.toString();
  return apiClient<ClientPortalReceiptsResponse>(`/client-portal/receipts${qs ? `?${qs}` : ''}`);
}

export function getClientPortalReceiptById(
  id: string,
  opts?: { includeArchived?: boolean }
): Promise<ClientPortalReceiptResponse> {
  const params = new URLSearchParams();
  if (opts?.includeArchived) params.set('includeArchived', 'true');
  const qs = params.toString();
  return apiClient<ClientPortalReceiptResponse>(`/client-portal/receipts/${id}${qs ? `?${qs}` : ''}`);
}

export function getClientPortalExpenses(filters?: {
  propertyId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ClientPortalExpensesResponse> {
  const params = new URLSearchParams();
  if (filters?.propertyId) params.set('propertyId', filters.propertyId);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.includeArchived) params.set('includeArchived', 'true');
  if (filters?.limit != null) params.set('limit', String(filters.limit));
  if (filters?.offset != null) params.set('offset', String(filters.offset));
  const qs = params.toString();
  return apiClient<ClientPortalExpensesResponse>(`/client-portal/expenses${qs ? `?${qs}` : ''}`);
}

export function getClientPortalExpenseById(
  id: string,
  opts?: { includeArchived?: boolean }
): Promise<ClientPortalExpenseResponse> {
  const params = new URLSearchParams();
  if (opts?.includeArchived) params.set('includeArchived', 'true');
  const qs = params.toString();
  return apiClient<ClientPortalExpenseResponse>(`/client-portal/expenses/${id}${qs ? `?${qs}` : ''}`);
}
