// Report Template Service - API calls for report template management

import apiClient from './apiClient'
import type {
  ReportTemplatesResponse,
  ReportTemplateResponse,
  ReportSectionResponse,
  ReportFieldResponse,
  PropertyTemplatesResponse,
  AvailableColumnsResponse,
  DataSourceColumnsResponse,
  DataSource,
  AssignmentResponse,
  ValidateFormulaResponse,
  ValidateTableColumnResponse,
  TemplatePreviewResponse,
  DeleteResponse,
  ReorderResponse,
  CreateReportTemplatePayload,
  UpdateReportTemplatePayload,
  CloneReportTemplatePayload,
  CreateReportSectionPayload,
  UpdateReportSectionPayload,
  ReorderSectionsPayload,
  CreateReportFieldPayload,
  UpdateReportFieldPayload,
  ReorderFieldsPayload,
  CreateAssignmentPayload,
  PreviewTemplatePayload,
  ValidateFormulaPayload,
  ValidateTableColumnPayload,
  BatchSaveTemplatePayload,
} from './types/reportTemplate'

// ============================================
// Template Operations
// ============================================

/**
 * Get all report templates for a user (includes system defaults)
 * @param userId - User ID to fetch templates for
 * @returns Promise with list of templates
 */
export async function getReportTemplates(userId: string): Promise<ReportTemplatesResponse> {
  return apiClient<ReportTemplatesResponse>(`/report-templates?userId=${userId}`)
}

/**
 * Get a single report template with full details (sections and fields)
 * @param id - Template ID
 * @returns Promise with full template details
 */
export async function getReportTemplateById(id: string): Promise<ReportTemplateResponse> {
  return apiClient<ReportTemplateResponse>(`/report-templates/${id}`)
}

/**
 * Get templates assigned to a specific property
 * @param propertyId - Property ID
 * @returns Promise with list of assigned templates
 */
export async function getTemplatesByProperty(propertyId: string): Promise<PropertyTemplatesResponse> {
  return apiClient<PropertyTemplatesResponse>(`/report-templates/by-property/${propertyId}`)
}

/**
 * Get available booking columns for formula building (legacy endpoint)
 * @returns Promise with list of available columns
 * @deprecated Use getDataSourceColumns instead for table sections
 */
export async function getAvailableColumns(): Promise<AvailableColumnsResponse> {
  return apiClient<AvailableColumnsResponse>('/report-templates/available-columns')
}

/**
 * Get available columns for a specific data source (booking or expense)
 * Used for table sections to populate column options
 * @param dataSource - 'booking' or 'expense'
 * @returns Promise with columns for the specified data source
 */
export async function getDataSourceColumns(
  dataSource: DataSource
): Promise<DataSourceColumnsResponse> {
  return apiClient<DataSourceColumnsResponse>(
    `/report-templates/columns?dataSource=${dataSource}`
  )
}

/**
 * Create a new report template
 * @param payload - Template creation data
 * @returns Promise with created template
 */
export async function createReportTemplate(
  payload: CreateReportTemplatePayload
): Promise<ReportTemplateResponse> {
  return apiClient<ReportTemplateResponse, CreateReportTemplatePayload>(
    '/report-templates',
    {
      method: 'POST',
      body: payload,
    }
  )
}

/**
 * Update an existing report template
 * @param id - Template ID to update
 * @param payload - Updated template data
 * @returns Promise with updated template
 */
export async function updateReportTemplate(
  id: string,
  payload: UpdateReportTemplatePayload
): Promise<ReportTemplateResponse> {
  return apiClient<ReportTemplateResponse, UpdateReportTemplatePayload>(
    `/report-templates/${id}`,
    {
      method: 'PUT',
      body: payload,
    }
  )
}

/**
 * Delete a report template
 * @param id - Template ID to delete
 * @param userId - User ID (for authorization)
 * @returns Promise with deletion result
 */
export async function deleteReportTemplate(
  id: string,
  userId: string
): Promise<DeleteResponse> {
  return apiClient<DeleteResponse>(
    `/report-templates/${id}?userId=${userId}`,
    {
      method: 'DELETE',
    }
  )
}

/**
 * Clone an existing template
 * @param id - Template ID to clone
 * @param payload - Clone parameters (new name)
 * @returns Promise with cloned template
 */
export async function cloneReportTemplate(
  id: string,
  payload: CloneReportTemplatePayload
): Promise<ReportTemplateResponse> {
  return apiClient<ReportTemplateResponse, CloneReportTemplatePayload>(
    `/report-templates/${id}/clone`,
    {
      method: 'POST',
      body: payload,
    }
  )
}

/**
 * Batch save template - creates or updates entire template with sections, fields, and property assignments
 * Uses POST to handle both creation and updates in a single endpoint
 * @param payload - Full template state including sections, fields, and propertyIds
 * @returns Promise with saved template
 */
export async function batchSaveTemplate(
  payload: BatchSaveTemplatePayload
): Promise<ReportTemplateResponse> {
  return apiClient<ReportTemplateResponse, BatchSaveTemplatePayload>(
    '/report-templates',
    {
      method: 'POST',
      body: payload,
    }
  )
}

/**
 * Preview a template with evaluated formulas
 * @param id - Template ID to preview
 * @param payload - Preview parameters (property, date range)
 * @returns Promise with evaluated template data
 */
export async function previewTemplate(
  id: string,
  payload: PreviewTemplatePayload
): Promise<TemplatePreviewResponse> {
  return apiClient<TemplatePreviewResponse, PreviewTemplatePayload>(
    `/report-templates/${id}/preview`,
    {
      method: 'POST',
      body: payload,
    }
  )
}

/**
 * Validate a formula syntax
 * @param formula - Formula string to validate
 * @returns Promise with validation result
 */
export async function validateFormula(
  formula: string
): Promise<ValidateFormulaResponse> {
  return apiClient<ValidateFormulaResponse, ValidateFormulaPayload>(
    '/report-templates/validate-formula',
    {
      method: 'POST',
      body: { formula },
    }
  )
}

/**
 * Validate a table column formula/source
 * For table-mode sections: validates bare column names or calculated formulas
 * @param payload - Column validation data (formula, columnType, sectionColumns)
 * @returns Promise with validation result
 */
export async function validateTableColumn(
  payload: ValidateTableColumnPayload
): Promise<ValidateTableColumnResponse> {
  return apiClient<ValidateTableColumnResponse, ValidateTableColumnPayload>(
    '/report-templates/validate-table-column',
    {
      method: 'POST',
      body: payload,
    }
  )
}

// ============================================
// Section Operations
// ============================================

/**
 * Create a new section in a template
 * @param payload - Section creation data
 * @returns Promise with created section
 */
export async function createReportSection(
  payload: CreateReportSectionPayload
): Promise<ReportSectionResponse> {
  return apiClient<ReportSectionResponse, CreateReportSectionPayload>(
    '/report-templates/sections',
    {
      method: 'POST',
      body: payload,
    }
  )
}

/**
 * Update an existing section
 * @param id - Section ID to update
 * @param payload - Updated section data
 * @returns Promise with updated section
 */
export async function updateReportSection(
  id: string,
  payload: UpdateReportSectionPayload
): Promise<ReportSectionResponse> {
  return apiClient<ReportSectionResponse, UpdateReportSectionPayload>(
    `/report-templates/sections/${id}`,
    {
      method: 'PUT',
      body: payload,
    }
  )
}

/**
 * Delete a section from a template
 * @param id - Section ID to delete
 * @param userId - User ID (for authorization)
 * @returns Promise with deletion result
 */
export async function deleteReportSection(
  id: string,
  userId: string
): Promise<DeleteResponse> {
  return apiClient<DeleteResponse>(
    `/report-templates/sections/${id}?userId=${userId}`,
    {
      method: 'DELETE',
    }
  )
}

/**
 * Reorder sections within a template
 * @param templateId - Template ID
 * @param payload - New section order
 * @returns Promise with reorder result
 */
export async function reorderSections(
  templateId: string,
  payload: ReorderSectionsPayload
): Promise<ReorderResponse> {
  return apiClient<ReorderResponse, ReorderSectionsPayload>(
    `/report-templates/sections/reorder/${templateId}`,
    {
      method: 'PUT',
      body: payload,
    }
  )
}

// ============================================
// Field Operations
// ============================================

/**
 * Create a new field in a section
 * @param payload - Field creation data
 * @returns Promise with created field
 */
export async function createReportField(
  payload: CreateReportFieldPayload
): Promise<ReportFieldResponse> {
  return apiClient<ReportFieldResponse, CreateReportFieldPayload>(
    '/report-templates/fields',
    {
      method: 'POST',
      body: payload,
    }
  )
}

/**
 * Update an existing field
 * @param id - Field ID to update
 * @param payload - Updated field data
 * @returns Promise with updated field
 */
export async function updateReportField(
  id: string,
  payload: UpdateReportFieldPayload
): Promise<ReportFieldResponse> {
  return apiClient<ReportFieldResponse, UpdateReportFieldPayload>(
    `/report-templates/fields/${id}`,
    {
      method: 'PUT',
      body: payload,
    }
  )
}

/**
 * Delete a field from a section
 * @param id - Field ID to delete
 * @param userId - User ID (for authorization)
 * @returns Promise with deletion result
 */
export async function deleteReportField(
  id: string,
  userId: string
): Promise<DeleteResponse> {
  return apiClient<DeleteResponse>(
    `/report-templates/fields/${id}?userId=${userId}`,
    {
      method: 'DELETE',
    }
  )
}

/**
 * Reorder fields within a section
 * @param sectionId - Section ID
 * @param payload - New field order
 * @returns Promise with reorder result
 */
export async function reorderFields(
  sectionId: string,
  payload: ReorderFieldsPayload
): Promise<ReorderResponse> {
  return apiClient<ReorderResponse, ReorderFieldsPayload>(
    `/report-templates/fields/reorder/${sectionId}`,
    {
      method: 'PUT',
      body: payload,
    }
  )
}

// ============================================
// Assignment Operations
// ============================================

/**
 * Assign a template to a property
 * @param payload - Assignment data
 * @returns Promise with assignment result
 */
export async function assignTemplateToProperty(
  payload: CreateAssignmentPayload
): Promise<AssignmentResponse> {
  return apiClient<AssignmentResponse, CreateAssignmentPayload>(
    '/report-templates/assignments',
    {
      method: 'POST',
      body: payload,
    }
  )
}

/**
 * Remove a template assignment from a property
 * @param id - Assignment ID to remove
 * @returns Promise with deletion result
 */
export async function unassignTemplateFromProperty(
  id: string
): Promise<DeleteResponse> {
  return apiClient<DeleteResponse>(
    `/report-templates/assignments/${id}`,
    {
      method: 'DELETE',
    }
  )
}
