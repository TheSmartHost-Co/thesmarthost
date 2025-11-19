// Report Service - API calls for report generation

import apiClient from './apiClient'
import type {
  ReportGenerationPayload,
  ReportGenerationResponse,
} from './types/report'

/**
 * Generate property report in CSV format
 * @param data - Property ID and date range
 * @returns Promise with download URL and report details
 */
export async function generatePropertyReportCSV(
  data: ReportGenerationPayload
): Promise<ReportGenerationResponse> {
  return apiClient<ReportGenerationResponse, ReportGenerationPayload>(
    '/reports/property/csv',
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Generate property report in Excel format
 * @param data - Property ID and date range
 * @returns Promise with download URL and report details
 */
export async function generatePropertyReportExcel(
  data: ReportGenerationPayload
): Promise<ReportGenerationResponse> {
  return apiClient<ReportGenerationResponse, ReportGenerationPayload>(
    '/reports/property/excel',
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Generate property report in PDF format
 * @param data - Property ID and date range
 * @returns Promise with download URL and report details
 */
export async function generatePropertyReportPDF(
  data: ReportGenerationPayload
): Promise<ReportGenerationResponse> {
  return apiClient<ReportGenerationResponse, ReportGenerationPayload>(
    '/reports/property/pdf',
    {
      method: 'POST',
      body: data,
    }
  )
}