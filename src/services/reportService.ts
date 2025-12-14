// Report Service - API calls for report management

import apiClient from './apiClient'
import type {
  ReportsResponse,
  ReportGenerationPayload,
  ReportGenerationResponse,
  ReportPreviewResponse,
  LogosResponse,
  LogoUploadResponse,
  SingleReportResponse,
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
 * Preview a report without saving (returns PDF as base64 or data table)
 * @param data - Report generation parameters
 * @returns Promise with preview data
 */
export async function previewReport(
  data: ReportGenerationPayload
): Promise<ReportPreviewResponse> {
  return apiClient<ReportPreviewResponse, ReportGenerationPayload>(
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
  const formData = new FormData()
  formData.append('logo', logoFile)
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/reports/upload-logo`, {
    method: 'POST',
    body: formData,
    // No Content-Type header - let browser set it with boundary
    // Include any auth headers if needed in the future
  })

  if (!response.ok) {
    let errorMessage = `Upload failed: ${response.statusText}`
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.message || errorMessage
    } catch {
      // If JSON parsing fails, use the default error message
    }
    throw new Error(errorMessage)
  }

  return response.json() as Promise<LogoUploadResponse>
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