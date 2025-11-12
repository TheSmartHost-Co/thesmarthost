// Upload Wizard Types for HostMetrics Booking Import

/**
 * Wizard Step Enumeration
 */
export enum WizardStep {
  UPLOAD = 1,
  VALIDATE = 2,
  PREVIEW = 3,
  PROCESS = 4,
  COMPLETE = 5,
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
 * Complete wizard state
 */
export interface WizardState {
  currentStep: WizardStep
  completedSteps: WizardStep[]
  canGoBack: boolean
  canGoNext: boolean
  
  // Step-specific states
  selectedProperty?: any // Property object from property service
  uploadedFile?: UploadedFile
  previewState?: PreviewState
  validationState?: ValidationState
  processingState?: ProcessingState
  completionState?: CompletionState
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
  SET_PREVIEW_STATE = 'SET_PREVIEW_STATE',
  SET_VALIDATION_STATE = 'SET_VALIDATION_STATE',
  SET_PROCESSING_STATE = 'SET_PROCESSING_STATE',
  SET_COMPLETION_STATE = 'SET_COMPLETION_STATE',
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
  | { type: WizardActionType.SET_PREVIEW_STATE; payload: PreviewState }
  | { type: WizardActionType.SET_VALIDATION_STATE; payload: ValidationState }
  | { type: WizardActionType.SET_PROCESSING_STATE; payload: ProcessingState }
  | { type: WizardActionType.SET_COMPLETION_STATE; payload: CompletionState }
  | { type: WizardActionType.RESET_WIZARD }

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