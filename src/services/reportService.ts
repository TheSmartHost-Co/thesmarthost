// Report Service - API calls for report management

import apiClient from './apiClient'
import type {
  ReportsResponse,
  ReportGenerationPayload,
  ReportGenerationResponse,
  ReportPreviewResponse,
  ReportPreviewPayload,
  LogosResponse,
  LogoUploadResponse,
  SingleReportResponse,
  ReportRecipientsResponse,
  SendReportPayload,
  SendReportResponse,
} from './types/report'

/**
 * Get all reports with optional filters
 * @param filters - Optional query parameters for filtering
 * @returns Promise with list of reports
 */
export async function getReports(filters?: {
  propertyId?: string
  startDate?: string
  endDate?: string
  format?: string
}): Promise<ReportsResponse> {
  const params = new URLSearchParams()
  if (filters?.propertyId) params.append('propertyId', filters.propertyId)
  if (filters?.startDate) params.append('startDate', filters.startDate)
  if (filters?.endDate) params.append('endDate', filters.endDate)
  if (filters?.format) params.append('format', filters.format)
  
  const queryString = params.toString()
  const endpoint = queryString ? `/reports?${queryString}` : '/reports'
  
  return apiClient<ReportsResponse>(endpoint)
}

/**
 * Preview report data — returns bookings, expenses, and summary as JSON
 * @param data - Filter parameters (no format/logo/template)
 * @returns Promise with preview data
 */
export async function previewReport(
  data: ReportPreviewPayload
): Promise<ReportPreviewResponse> {
  return apiClient<ReportPreviewResponse, ReportPreviewPayload>(
    '/reports/preview',
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Generate and save a report
 * @param data - Report generation parameters
 * @returns Promise with saved report details
 */
export async function generateReport(
  data: ReportGenerationPayload
): Promise<ReportGenerationResponse> {
  return apiClient<ReportGenerationResponse, ReportGenerationPayload>(
    '/reports/generate',
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Delete a report
 * @param reportId - ID of the report to delete
 * @returns Promise with deletion result
 */
export async function deleteReport(reportId: string): Promise<{ status: 'success' | 'failed', message?: string }> {
  return apiClient<{ status: 'success' | 'failed', message?: string }>(
    `/reports/${reportId}`,
    {
      method: 'DELETE',
    }
  )
}

/**
 * Get all available logos
 * @returns Promise with list of logos
 */
export async function getLogos(): Promise<LogosResponse> {
  return apiClient<LogosResponse>('/reports/logos')
}

/**
 * Upload a new logo
 * @param logoFile - Logo file to upload
 * @returns Promise with uploaded logo details
 */
export async function uploadLogo(logoFile: File): Promise<LogoUploadResponse> {
  // Route through apiClient so the request carries the auth header — the backend
  // now scopes logos to the uploading user. apiClient detects FormData and lets
  // the browser set the multipart Content-Type boundary.
  const formData = new FormData()
  formData.append('logo', logoFile)

  return apiClient<LogoUploadResponse, FormData>('/reports/upload-logo', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Delete a logo
 * @param logoId - ID of the logo to delete
 * @returns Promise with deletion result
 */
export async function deleteLogo(logoId: string): Promise<{ status: 'success' | 'failed', message?: string }> {
  return apiClient<{ status: 'success' | 'failed', message?: string }>(
    `/reports/logos/${logoId}`,
    {
      method: 'DELETE',
    }
  )
}

/**
 * Get a single report with file details
 * @param reportId - ID of the report to fetch
 * @returns Promise with report details and files
 */
export async function getSingleReport(reportId: string): Promise<SingleReportResponse> {
  return apiClient<SingleReportResponse>(`/reports/${reportId}`)
}

/**
 * Delete a report file
 * @param fileId - ID of the file to delete
 * @returns Promise with deletion result
 */
export async function deleteReportFile(fileId: string): Promise<{ status: 'success' | 'failed', message?: string }> {
  return apiClient<{ status: 'success' | 'failed', message?: string }>(
    `/reports/files/${fileId}`,
    {
      method: 'DELETE',
    }
  )
}

/**
 * Get potential recipients for sending a report (property owners)
 */
export async function getReportRecipients(reportId: string): Promise<ReportRecipientsResponse> {
  return apiClient<ReportRecipientsResponse>(`/reports/${reportId}/recipients`)
}

/**
 * Send a report to client(s) via email and/or portal
 */
export async function sendReport(reportId: string, data: SendReportPayload): Promise<SendReportResponse> {
  return apiClient<SendReportResponse, SendReportPayload>(
    `/reports/${reportId}/send`,
    {
      method: 'POST',
      body: data,
    }
  )
}

