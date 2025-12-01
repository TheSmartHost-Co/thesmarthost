// Upload Wizard Types for HostMetrics Booking Import

/**
 * Wizard Step Enumeration
 */
export enum WizardStep {
  UPLOAD = 1,
  VALIDATE = 2,
  PROPERTY_MAPPING = 3,
  PREVIEW = 4,
  PROCESS = 5,
  COMPLETE = 6,
}

/**
 * Step configuration for display
 */
export interface StepConfig {
  step: WizardStep
  label: string
  description?: string
}

/**
 * File upload state and metadata
 */
export interface UploadedFile {
  file: File
  name: string
  size: number
  type: string
  detectedFormat?: 'CSV' | 'Excel' | 'Generic CSV'
  uploadedAt: Date
}

/**
 * CSV column information
 */
export interface CsvColumn {
  index: number
  name: string
  sampleValues: string[]
  dataType: 'string' | 'number' | 'date' | 'boolean'
}

/**
 * Required fields for booking data mapping
 */
export enum RequiredField {
  RESERVATION_ID = 'reservationId',
  GUEST_NAME = 'guestName',
  PROPERTY_NAME = 'propertyName',
  LISTING_NAME = 'listingName',
  CHECK_IN_DATE = 'checkInDate',
  CHECK_OUT_DATE = 'checkOutDate',
  TOTAL_AMOUNT = 'totalAmount',
  PLATFORM = 'platform',
}

/**
 * Optional fields for booking data
 */
export enum OptionalField {
  GUEST_EMAIL = 'guestEmail',
  GUEST_PHONE = 'guestPhone',
  NIGHTS = 'nights',
  ADULTS = 'adults',
  CHILDREN = 'children',
  COMMISSION_RATE = 'commissionRate',
  TAXES = 'taxes',
  FEES = 'fees',
  NET_AMOUNT = 'netAmount',
}

/**
 * All available fields (required + optional)
 */
export type BookingField = RequiredField | OptionalField

/**
 * Column mapping configuration
 */
export interface ColumnMapping {
  field: BookingField
  csvColumnIndex: number | null
  csvColumnName: string | null
  isRequired: boolean
  isMapped: boolean
}

/**
 * Column mapping state for all fields
 */
export type ColumnMappings = {
  [K in BookingField]: ColumnMapping
}

/**
 * Parsed CSV data structure
 */
export interface ParsedCsvData {
  headers: string[]
  columns: CsvColumn[]
  rows: string[][]
  totalRows: number
  previewRows: string[][] // First 5 rows for preview
}

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  severity: ValidationSeverity
  field?: BookingField
  row?: number
  column?: string
  message: string
  description?: string
  suggestion?: string
}

/**
 * Validation results summary
 */
export interface ValidationResults {
  isValid: boolean
  canProceed: boolean
  totalIssues: number
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  infos: ValidationIssue[]
  requiredFieldsMapped: number
  totalRequiredFields: number
}

/**
 * Detected platform information
 */
export interface DetectedPlatform {
  name: string
  confidence: number
  indicators: string[]
}

/**
 * Preview step state
 */
export interface PreviewState {
  file: UploadedFile
  csvData: ParsedCsvData
  columnMappings: ColumnMappings
  detectedPlatforms: DetectedPlatform[]
  dateRange?: {
    start: string
    end: string
  }
}

/**
 * Validation step state
 */
export interface ValidationState {
  results: ValidationResults
  totalBookings: number
  totalProperties: number
  totalPlatforms: number
  totalRevenue: number
  dateRange: {
    start: string
    end: string
  }
  detectedPlatforms: string[]
  uniqueListings?: string[]           // Extracted listing names for property mapping
  bookingCounts?: Record<string, number>  // Count of bookings per listing
  fieldMappings?: any[]              // Field mappings from validation step
  csvData?: any                      // CSV data for preview step
}

/**
 * Processing step states
 */
export enum ProcessingStatus {
  UPLOADING = 'uploading',
  PARSING = 'parsing',
  VALIDATING = 'validating',
  SAVING_TO_DATABASE = 'saving_to_database',
  CALCULATING_METRICS = 'calculating_metrics',
  GENERATING_REPORTS = 'generating_reports',
  COMPLETE = 'complete',
  ERROR = 'error',
}

/**
 * Processing step state
 */
export interface ProcessingState {
  status: ProcessingStatus
  progress: number // 0-100
  currentTask: string
  completedTasks: string[]
  error?: string
}

/**
 * Import statistics for completion
 */
export interface ImportStats {
  bookingsImported: number
  propertiesUpdated: number
  totalRevenue: number
  calculationStatus: string // e.g., "100%"
  dateRange: {
    start: string
    end: string
  }
  platformBreakdown: {
    [platform: string]: number
  }
}

/**
 * Completion step state
 */
export interface CompletionState {
  isSuccess: boolean
  stats: ImportStats
  nextActions: {
    viewDashboard: boolean
    uploadAnother: boolean
    generateReports: boolean
  }
  automatedActions: string[]
}

/**
 * Property mapping for multi-property uploads
 */
export interface PropertyMapping {
  listingName: string               // "Casa Madera"
  propertyId: string | null         // Selected existing property ID
  isNewProperty?: boolean           // Creating new property flag
  newPropertyData?: {               // New property details
    name: string
    listingId: string
    externalName?: string
    internalName?: string
    address: string
    postalCode: string
    province: string
    propertyType: 'STR' | 'LTR'
    commissionRate: number
    clientId: string
    newClientData?: {               // For inline client creation
      name: string
      email: string
    }
  }
  bookingCount?: number            // How many bookings for this listing
}

/**
 * Complete wizard state
 */
export interface WizardState {
  currentStep: WizardStep
  completedSteps: WizardStep[]
  canGoBack: boolean
  canGoNext: boolean
  
  // Step-specific states
  selectedProperty?: any // Property object from property service (legacy - for backwards compatibility)
  uploadedFile?: UploadedFile
  validationState?: ValidationState
  propertyMappingState?: PropertyMappingState
  previewState?: PreviewState
  processingState?: ProcessingState
  completionState?: CompletionState
  
  // Field mappings to persist between steps
  fieldMappings?: any[] // Persisted field mappings from validation step (legacy)
  completeFieldMappingState?: any // Complete field mapping state including formulas
  
  // Property mappings to persist between steps
  propertyMappings?: PropertyMapping[] // Persisted property mappings from property mapping step
}

/**
 * Wizard action types for state management
 */
export enum WizardActionType {
  SET_STEP = 'SET_STEP',
  NEXT_STEP = 'NEXT_STEP',
  PREV_STEP = 'PREV_STEP',
  SET_SELECTED_PROPERTY = 'SET_SELECTED_PROPERTY',
  SET_UPLOADED_FILE = 'SET_UPLOADED_FILE',
  SET_VALIDATION_STATE = 'SET_VALIDATION_STATE',
  SET_PROPERTY_MAPPING_STATE = 'SET_PROPERTY_MAPPING_STATE',
  SET_PREVIEW_STATE = 'SET_PREVIEW_STATE',
  SET_PROCESSING_STATE = 'SET_PROCESSING_STATE',
  SET_COMPLETION_STATE = 'SET_COMPLETION_STATE',
  SET_FIELD_MAPPINGS = 'SET_FIELD_MAPPINGS',
  SET_COMPLETE_FIELD_MAPPING_STATE = 'SET_COMPLETE_FIELD_MAPPING_STATE',
  SET_PROPERTY_MAPPINGS = 'SET_PROPERTY_MAPPINGS',
  RESET_WIZARD = 'RESET_WIZARD',
}

/**
 * Wizard actions for state updates
 */
export type WizardAction =
  | { type: WizardActionType.SET_STEP; payload: WizardStep }
  | { type: WizardActionType.NEXT_STEP }
  | { type: WizardActionType.PREV_STEP }
  | { type: WizardActionType.SET_SELECTED_PROPERTY; payload: any }
  | { type: WizardActionType.SET_UPLOADED_FILE; payload: UploadedFile }
  | { type: WizardActionType.SET_VALIDATION_STATE; payload: ValidationState }
  | { type: WizardActionType.SET_PROPERTY_MAPPING_STATE; payload: PropertyMappingState }
  | { type: WizardActionType.SET_PREVIEW_STATE; payload: PreviewState }
  | { type: WizardActionType.SET_PROCESSING_STATE; payload: ProcessingState }
  | { type: WizardActionType.SET_COMPLETION_STATE; payload: CompletionState }
  | { type: WizardActionType.SET_FIELD_MAPPINGS; payload: any[] }
  | { type: WizardActionType.SET_COMPLETE_FIELD_MAPPING_STATE; payload: any }
  | { type: WizardActionType.SET_PROPERTY_MAPPINGS; payload: PropertyMapping[] }
  | { type: WizardActionType.RESET_WIZARD }

/**
 * Property mapping step state
 */
export interface PropertyMappingState {
  uniqueListings: string[]         // Extracted from CSV listing_name column
  propertyMappings: PropertyMapping[]
  isValid: boolean                 // All mappings complete and valid
  totalBookings: number           // Total bookings across all properties
}

/**
 * Wizard configuration
 */
export interface WizardConfig {
  maxFileSize: number // bytes
  allowedFileTypes: string[]
  supportedPlatforms: string[]
  requiredFields: RequiredField[]
  optionalFields: OptionalField[]
}