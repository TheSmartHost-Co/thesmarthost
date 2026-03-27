// Report Template Types for HostMetrics Frontend

export type ReportFieldFormat = 'currency' | 'numeric' | 'text'

// Section mode types - now includes 'header' for metadata sections
export type SectionMode = 'field' | 'table' | 'header'

// Data source for table sections
export type DataSource = 'booking' | 'expense'

// Header variable types from backend API
export interface HeaderVariableInfo {
  key: string
  label: string
  description: string
}

export interface HeaderVariableCategory {
  category: string
  variables: HeaderVariableInfo[]
}

export interface HeaderVariablesResponse {
  status: 'success' | 'failed'
  message?: string
  data: HeaderVariableCategory[]
}

// Logo is frontend-only, not returned by backend
export const LOGO_VARIABLE: HeaderVariableInfo = {
  key: 'logo',
  label: 'Logo',
  description: 'Display the uploaded company logo',
}

// Table column types for table mode sections
export type ColumnType = 'text' | 'numeric' | 'date' | 'currency' | 'calculated'
export type TotalsFunction = 'SUM' | 'AVG' | 'COUNT' | 'NONE'

// Available booking columns for table mode
export const BOOKING_COLUMNS = {
  currency: [
    'nightlyRate',
    'extraGuestFees',
    'cleaningFee',
    'bedLinenFee',
    'gst',
    'qst',
    'lodgingTax',
    'salesTax',
    'channelFee',
    'stripeFee',
    'mgmtFee',
    'cohostFee',
    'totalPayout',
    'netEarnings',
    'rentCollected',
    'taxesCollected',
  ],
  numeric: [
    'numNights',
    'numGuests',
  ],
  text: ['guestName', 'platform', 'reservationCode', 'listingName'],
  date: ['checkInDate', 'checkOutDate'],
} as const

// Column display names for the UI
export const BOOKING_COLUMN_LABELS: Record<string, string> = {
  nightlyRate: 'Nightly Rate',
  extraGuestFees: 'Extra Guest Fees',
  cleaningFee: 'Cleaning Fee',
  bedLinenFee: 'Bed Linen Fee',
  numNights: 'Number of Nights',
  gst: 'GST',
  qst: 'QST',
  lodgingTax: 'Lodging Tax',
  salesTax: 'Sales Tax',
  channelFee: 'Channel Fee',
  stripeFee: 'Stripe Fee',
  mgmtFee: 'Management Fee',
  cohostFee: 'Co-host Fee',
  totalPayout: 'Total Payout',
  netEarnings: 'Net Earnings',
  rentCollected: 'Rent Collected',
  taxesCollected: 'Taxes Collected',
  guestName: 'Guest Name',
  platform: 'Platform',
  reservationCode: 'Reservation Code',
  listingName: 'Listing Name',
  checkInDate: 'Check-In Date',
  checkOutDate: 'Check-Out Date',
  numGuests: 'Number of Guests',
}

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
  sectionMode: SectionMode  // 'field' (default), 'table', or 'header'
  dataSource?: DataSource   // Only for table sections: 'booking' or 'expense'
  createdAt: string
  updatedAt: string
  fields?: ReportField[]
}

/**
 * Report field within a section
 * In table mode, each field represents a column in the table
 */
export interface ReportField {
  id: string
  sectionId: string
  name: string           // Display name: "Total Revenue"
  logicalName: string    // Logical name for formulas: "total_revenue"
  formula: string
  displayOrder: number
  format: ReportFieldFormat
  // Table mode properties (when parent section is in table mode)
  fieldMode?: 'field' | 'table_column'  // Defaults to 'field'
  columnType?: ColumnType               // text, numeric, date, calculated
  sourceColumn?: string                 // Booking column to display (for non-calculated columns)
  totalsFunction?: TotalsFunction       // SUM, AVG, COUNT, NONE
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
 * Table column type info (used in table-mode validation)
 */
export interface TableColumnTypeInfo {
  name: string
  dbColumn: string
  description: string
}

/**
 * Categorized available columns response from API
 */
export interface CategorizedAvailableColumns {
  functions: string[]  // ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'SUMIF', 'AVGIF', 'COUNTIF', 'MINIF', 'MAXIF']
  bookingColumns: AvailableColumn[]
  calculatedColumns: AvailableColumn[]
  relatedItems: RelatedItem[]
  // Table-mode specific fields from backend
  tableColumnTypes?: {
    numeric: TableColumnTypeInfo[]
    currency: TableColumnTypeInfo[]
    text: TableColumnTypeInfo[]
    date: TableColumnTypeInfo[]
  }
  tableTotalsFunctions?: ('SUM' | 'AVG' | 'COUNT' | 'NONE')[]
  syntaxExamples?: { example: string; description: string }[]
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
 * Request payload for table column validation
 * For table-mode sections: validates bare column names or calculated formulas
 */
export interface ValidateTableColumnPayload {
  formula: string
  columnType: ColumnType
  sectionColumns?: string[]
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
  // Table mode properties
  fieldMode?: 'field' | 'table_column'
  columnType?: ColumnType
  sourceColumn?: string
  totalsFunction?: TotalsFunction
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
  sectionMode?: SectionMode  // 'field' (default), 'table', or 'header'
  dataSource?: DataSource    // Only for table sections: 'booking' or 'expense'
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
  data: FullReportTemplate[]
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

/**
 * Column info from the data source columns endpoint
 */
export interface DataSourceColumn {
  name: string           // Display name: "Check In Date"
  formula: string        // Column key: "checkInDate"
  columnType: ColumnType // 'text' | 'numeric' | 'date' | 'calculated'
  format: ReportFieldFormat
  totalsFunction: TotalsFunction
}

/**
 * Response from the data source columns endpoint
 */
export interface DataSourceColumnsResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    dataSource: DataSource
    columns: DataSourceColumn[]
  }
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
    warnings?: string[]
    fieldReferences: string[]
    suggestions?: string[]  // Suggested fixes for invalid formulas
  }
}

/**
 * Response type for table column validation
 */
export interface ValidateTableColumnResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    valid: boolean
    error?: string
    warnings?: string[]
    dependencies?: string[]
    suggestions?: string[]
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
