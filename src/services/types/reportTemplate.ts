// Report Template Types for HostMetrics Frontend

export type ReportFieldFormat = 'currency' | 'percentage' | 'number' | 'text'

/**
 * Report template entity
 */
export interface ReportTemplate {
  id: string
  userId: string | null  // null for system templates
  name: string
  description: string | null
  isSystemDefault: boolean
  isSystemTemplate: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Report section within a template
 */
export interface ReportSection {
  id: string
  templateId: string
  name: string           // Display name: "Invoice Summary"
  logicalName: string    // Logical name for formulas: "invoice_summary"
  displayOrder: number
  createdAt: string
  updatedAt: string
  fields?: ReportField[]
}

/**
 * Report field within a section
 */
export interface ReportField {
  id: string
  sectionId: string
  name: string           // Display name: "Total Revenue"
  logicalName: string    // Logical name for formulas: "total_revenue"
  formula: string
  displayOrder: number
  format: ReportFieldFormat
  createdAt: string
  updatedAt: string
}

/**
 * Assigned property info returned with template
 */
export interface AssignedProperty {
  assignmentId: string
  propertyId: string
  listingName: string
  internalName: string
  externalName: string
  assignedAt: string
}

/**
 * Full template with sections and fields
 */
export interface FullReportTemplate extends ReportTemplate {
  sections: (ReportSection & { fields: ReportField[] })[]
  assignedProperties?: AssignedProperty[]
}

/**
 * Property-template assignment
 */
export interface PropertyReportTemplate {
  id: string
  propertyId: string
  templateId: string
  createdAt: string
}

/**
 * Available booking column for formulas
 */
export interface AvailableColumn {
  name: string
  description: string
  type: 'number' | 'string'
}

/**
 * Related item (e.g. expenses) that supports aggregate functions
 */
export interface RelatedItem {
  name: string
  description: string
  supportedAggregates: ('SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX')[]
}

/**
 * Categorized available columns response from API
 */
export interface CategorizedAvailableColumns {
  functions: string[]  // ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'SUMIF', 'AVGIF', 'COUNTIF', 'MINIF', 'MAXIF']
  bookingColumns: AvailableColumn[]
  calculatedColumns: AvailableColumn[]
  relatedItems: RelatedItem[]
}

/**
 * For cross-section field references in formula builder
 */
export interface SectionFieldReference {
  sectionId: string
  sectionName: string        // Display name
  sectionLogicalName: string // Logical name for formulas
  fields: {
    id: string
    name: string             // Display name
    logicalName: string      // Logical name for formulas
  }[]
}

// ============================================
// Request Payloads
// ============================================

export interface CreateReportTemplatePayload {
  userId: string
  name: string
  description?: string
}

export interface UpdateReportTemplatePayload {
  userId: string
  name: string
  description?: string
}

export interface CloneReportTemplatePayload {
  userId: string
  name: string
}

export interface CreateReportSectionPayload {
  templateId: string
  name: string
  logicalName?: string  // Auto-generated if not provided
  userId: string
}

export interface UpdateReportSectionPayload {
  name: string
  logicalName?: string
  userId: string
}

export interface ReorderSectionsPayload {
  userId: string
  sectionIds: string[]
}

export interface CreateReportFieldPayload {
  sectionId: string
  name: string
  logicalName?: string  // Auto-generated if not provided
  formula: string
  format?: ReportFieldFormat
  userId: string
}

export interface UpdateReportFieldPayload {
  name: string
  logicalName?: string
  formula: string
  format?: ReportFieldFormat
  userId: string
}

export interface ReorderFieldsPayload {
  userId: string
  fieldIds: string[]
}

export interface CreateAssignmentPayload {
  propertyId: string
  templateId: string
  userId: string
}

export interface PreviewTemplatePayload {
  propertyId: string
  startDate: string
  endDate: string
  userId: string
}

export interface ValidateFormulaPayload {
  formula: string
}

/**
 * Batch update field payload (for batch save)
 */
export interface BatchUpdateFieldPayload {
  id?: string              // Existing field ID, or undefined for new
  name: string
  logicalName: string
  formula: string
  format: ReportFieldFormat
  displayOrder: number
  _delete?: boolean        // Mark for deletion
}

/**
 * Batch update section payload (for batch save)
 */
export interface BatchUpdateSectionPayload {
  id?: string              // Existing section ID, or undefined for new
  name: string
  logicalName: string
  displayOrder: number
  _delete?: boolean        // Mark for deletion
  fields: BatchUpdateFieldPayload[]
}

/**
 * Batch save template payload - creates or updates entire template in one request
 */
export interface BatchSaveTemplatePayload {
  userId: string
  id?: string              // Template ID - if provided, update; if not, create new
  name: string
  description?: string
  sections: BatchUpdateSectionPayload[]
  propertyIds?: string[]   // Property IDs to assign to this template (syncs assignments)
}

// ============================================
// Response Types
// ============================================

/**
 * Standard API response wrapper
 */
export interface ReportTemplatesResponse {
  status: 'success' | 'failed'
  message?: string
  data: ReportTemplate[]
}

export interface ReportTemplateResponse {
  status: 'success' | 'failed'
  message?: string
  data: FullReportTemplate
}

export interface ReportSectionResponse {
  status: 'success' | 'failed'
  message?: string
  data: ReportSection
}

export interface ReportFieldResponse {
  status: 'success' | 'failed'
  message?: string
  data: ReportField
}

export interface PropertyTemplatesResponse {
  status: 'success' | 'failed'
  message?: string
  data: ReportTemplate[]
}

export interface AvailableColumnsResponse {
  status: 'success' | 'failed'
  message?: string
  data: CategorizedAvailableColumns
}

export interface AssignmentResponse {
  status: 'success' | 'failed'
  message?: string
  data: PropertyReportTemplate
}

export interface ValidateFormulaResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    valid: boolean
    error?: string
    fieldReferences: string[]
  }
}

/**
 * Evaluated field in preview
 */
export interface EvaluatedField {
  name: string
  formula: string
  format: ReportFieldFormat
  displayOrder: number
  value: number | null
  formattedValue: string
  error: string | null
}

/**
 * Evaluated section in preview
 */
export interface EvaluatedSection {
  displayOrder: number
  fields: EvaluatedField[]
}

/**
 * Template preview response
 */
export interface TemplatePreviewResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    template: {
      id: string
      name: string
      description: string | null
    }
    bookingSummary: {
      totalBookings: number
      dateRange: {
        startDate: string
        endDate: string
      }
    }
    evaluatedSections: Record<string, EvaluatedSection>
  }
}

export interface DeleteResponse {
  status: 'success' | 'failed'
  message?: string
}

export interface ReorderResponse {
  status: 'success' | 'failed'
  message?: string
}
