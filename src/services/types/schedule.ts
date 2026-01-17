// Schedule Types for Scheduled Reports Feature

// ============ ENUMS ============

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type DateRangeType =
  | 'previous_month'
  | 'previous_week'
  | 'month_to_date'
  | 'year_to_date'
  | 'custom_days_back';

export type ReportFormat = 'pdf' | 'csv' | 'excel';

export type ReportMode = 'per_property' | 'combined_portfolio';

export type RecipientType = 'client' | 'custom';

export type DeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'bounced'
  | 'failed';

export type RunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'partial_failure'
  | 'failed';

// ============ CORE ENTITIES (camelCase from backend transform) ============

export interface Schedule {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  frequency: ScheduleFrequency;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  timeOfDay: string;
  timezone: string;
  dateRangeType: DateRangeType;
  customDaysBack: number | null;
  format: ReportFormat;
  reportMode: ReportMode;
  logoId: string | null;
  logoName?: string;
  emailSubjectTemplate: string | null;
  emailBodyTemplate: string | null;
  ccSelf: boolean;
  isActive: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed/enriched fields
  properties?: ScheduleProperty[];
  recipients?: ScheduleRecipient[];
  propertyCount?: number;
  recipientCount?: number;
}

export interface ScheduleProperty {
  id: string;
  propertyId: string;
  listingName?: string;
  listingId?: string;
  address?: string;
  status?: string;
}

export interface ScheduleRecipient {
  id: string;
  type: RecipientType;
  clientId: string | null;
  email: string | null;
  name: string | null;
  propertyFilterIds: string[] | null;
}

export interface ScheduleRun {
  id: string;
  scheduleId: string;
  scheduleName?: string;
  startedAt: string;
  completedAt: string | null;
  status: RunStatus;
  errorMessage: string | null;
  reportsGenerated: number;
  emailsSent: number;
  emailsFailed: number;
  reportStartDate?: string;
  reportEndDate?: string;
  triggerType: 'scheduled' | 'manual' | 'test';
  // Enriched
  deliveries?: ScheduleDelivery[];
}

export interface ScheduleDelivery {
  id: string;
  runId: string;
  recipientEmail: string;
  recipientName: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
  reportId?: string | null;
  resendEmailId: string | null;
  status: DeliveryStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  downloadedAt: string | null;
  downloadCount?: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  userId: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  isSystem: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ PAYLOADS (camelCase for backend) ============

export interface CreateSchedulePayload {
  name: string;
  description?: string | null;
  frequency: ScheduleFrequency;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  timeOfDay: string;
  timezone?: string;
  dateRangeType: DateRangeType;
  customDaysBack?: number | null;
  format: ReportFormat;
  reportMode: ReportMode;
  logoId?: string | null;
  emailSubjectTemplate?: string | null;
  emailBodyTemplate?: string | null;
  ccSelf?: boolean;
  isActive?: boolean;
  propertyIds: string[];
  recipients: CreateRecipientPayload[];
}

export interface UpdateSchedulePayload extends Partial<CreateSchedulePayload> {
  id: string;
}

export interface CreateRecipientPayload {
  type: RecipientType;
  clientId?: string | null;
  email?: string | null;
  name?: string | null;
  propertyFilterIds?: string[] | null;
}

export interface CreateEmailTemplatePayload {
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  isDefault?: boolean;
}

export interface UpdateEmailTemplatePayload extends Partial<CreateEmailTemplatePayload> {
  id: string;
}

// ============ API RESPONSES ============

export interface SchedulesResponse {
  status: 'success' | 'failed';
  data?: Schedule[];
  message?: string;
}

export interface ScheduleResponse {
  status: 'success' | 'failed';
  data?: Schedule;
  message?: string;
}

export interface ScheduleRunsResponse {
  status: 'success' | 'failed';
  data?: ScheduleRun[];
  message?: string;
}

export interface RunDetailsResponse {
  status: 'success' | 'failed';
  data?: {
    run: ScheduleRun;
    deliveries: ScheduleDelivery[];
  };
  message?: string;
}

export interface EmailTemplatesResponse {
  status: 'success' | 'failed';
  data?: EmailTemplate[];
  message?: string;
}

export interface EmailTemplateResponse {
  status: 'success' | 'failed';
  data?: EmailTemplate;
  message?: string;
}

export interface TestEmailResponse {
  status: 'success' | 'failed';
  message?: string;
}

export interface ExecuteResponse {
  status: 'success' | 'failed';
  data?: {
    run: ScheduleRun;
  };
  message?: string;
}

// ============ UI HELPERS ============

export interface ScheduleFormData {
  // Basic Info
  name: string;

  // Timing
  frequency: ScheduleFrequency;
  dayOfMonth: number;
  dayOfWeek: number;
  timeOfDay: string;
  timezone: string;

  // Report Config
  dateRangeType: DateRangeType;
  customDaysBack: number;
  format: ReportFormat;
  reportMode: ReportMode;
  logoId: string | null;

  // Properties
  propertyIds: string[];

  // Recipients
  recipients: RecipientFormData[];
  ccSelf: boolean;

  // Email Template
  useCustomTemplate: boolean;
  emailSubject: string;
  emailBody: string;

  // Status
  isActive: boolean;
}

export interface RecipientFormData {
  id?: string;
  type: RecipientType;
  clientId?: string;
  email?: string;
  name?: string;
  propertyFilterIds?: string[];
}

// Default form values
export const DEFAULT_SCHEDULE_FORM: ScheduleFormData = {
  name: '',
  frequency: 'monthly',
  dayOfMonth: 1,
  dayOfWeek: 1,
  timeOfDay: '09:00',
  timezone: 'America/Toronto',
  dateRangeType: 'previous_month',
  customDaysBack: 30,
  format: 'pdf',
  reportMode: 'per_property',
  logoId: null,
  propertyIds: [],
  recipients: [],
  ccSelf: false,
  useCustomTemplate: false,
  emailSubject: '',
  emailBody: '',
  isActive: true,
};

// Frequency display labels
export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

// Date range display labels
export const DATE_RANGE_LABELS: Record<DateRangeType, string> = {
  previous_month: 'Previous Month',
  previous_week: 'Previous Week',
  month_to_date: 'Month to Date',
  year_to_date: 'Year to Date',
  custom_days_back: 'Custom Days Back',
};

// Format display labels
export const FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  excel: 'Excel',
};

// Report mode display labels
export const REPORT_MODE_LABELS: Record<ReportMode, string> = {
  per_property: 'Per Property',
  combined_portfolio: 'Combined Portfolio',
};

// Delivery status display
export const DELIVERY_STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'gray' },
  sent: { label: 'Sent', color: 'blue' },
  delivered: { label: 'Delivered', color: 'green' },
  opened: { label: 'Opened', color: 'emerald' },
  bounced: { label: 'Bounced', color: 'red' },
  failed: { label: 'Failed', color: 'red' },
};

// Run status display
export const RUN_STATUS_CONFIG: Record<RunStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'gray' },
  running: { label: 'Running', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  partial_failure: { label: 'Partial Failure', color: 'yellow' },
  failed: { label: 'Failed', color: 'red' },
};

// Days of week for UI
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// Common timezones
export const TIMEZONES = [
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
  { value: 'UTC', label: 'UTC' },
];

// Time options in 15-minute intervals
export const TIME_OPTIONS = (() => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const label = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
})();
