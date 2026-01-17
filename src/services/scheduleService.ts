// services/scheduleService.ts
import apiClient from './apiClient';
import {
  Schedule,
  ScheduleResponse,
  SchedulesResponse,
  ScheduleRun,
  ScheduleRunsResponse,
  RunDetailsResponse,
  EmailTemplate,
  EmailTemplatesResponse,
  EmailTemplateResponse,
  CreateSchedulePayload,
  UpdateSchedulePayload,
  CreateEmailTemplatePayload,
  UpdateEmailTemplatePayload,
  TestEmailResponse,
  ExecuteResponse,
  ScheduleDelivery,
} from './types/schedule';

const SCHEDULES_ENDPOINT = '/schedules';

// ============ SCHEDULE CRUD ============

/**
 * Get all schedules for the authenticated user
 */
export async function getSchedules(): Promise<SchedulesResponse> {
  return apiClient<SchedulesResponse>(SCHEDULES_ENDPOINT);
}

/**
 * Get a single schedule by ID with full details (properties, recipients)
 */
export async function getScheduleById(scheduleId: string): Promise<ScheduleResponse> {
  return apiClient<ScheduleResponse>(`${SCHEDULES_ENDPOINT}/${scheduleId}`);
}

/**
 * Create a new schedule
 */
export async function createSchedule(payload: CreateSchedulePayload): Promise<ScheduleResponse> {
  return apiClient<ScheduleResponse, CreateSchedulePayload>(SCHEDULES_ENDPOINT, {
    method: 'POST',
    body: payload,
  });
}

/**
 * Update an existing schedule
 */
export async function updateSchedule(
  scheduleId: string,
  payload: Partial<CreateSchedulePayload>
): Promise<ScheduleResponse> {
  return apiClient<ScheduleResponse, Partial<CreateSchedulePayload>>(
    `${SCHEDULES_ENDPOINT}/${scheduleId}`,
    {
      method: 'PUT',
      body: payload,
    }
  );
}

/**
 * Toggle schedule active status
 */
export async function toggleSchedule(scheduleId: string): Promise<ScheduleResponse> {
  return apiClient<ScheduleResponse>(`${SCHEDULES_ENDPOINT}/${scheduleId}/toggle`, {
    method: 'PATCH',
  });
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<{ status: string; message?: string }> {
  return apiClient<{ status: string; message?: string }>(`${SCHEDULES_ENDPOINT}/${scheduleId}`, {
    method: 'DELETE',
  });
}

// ============ EXECUTION ============

/**
 * Manually run a schedule now
 */
export async function runScheduleNow(scheduleId: string): Promise<ExecuteResponse> {
  return apiClient<ExecuteResponse>(`${SCHEDULES_ENDPOINT}/${scheduleId}/run`, {
    method: 'POST',
  });
}

/**
 * Send a test email for a schedule
 */
export async function sendTestEmail(
  scheduleId: string,
  testEmail: string
): Promise<TestEmailResponse> {
  return apiClient<TestEmailResponse, { testEmail: string }>(
    `${SCHEDULES_ENDPOINT}/${scheduleId}/test`,
    {
      method: 'POST',
      body: { testEmail },
    }
  );
}

// ============ RUNS & DELIVERIES ============

/**
 * Get run history for a schedule
 */
export async function getScheduleRuns(
  scheduleId: string,
  limit?: number
): Promise<ScheduleRunsResponse> {
  const queryParams = limit ? `?limit=${limit}` : '';
  return apiClient<ScheduleRunsResponse>(`${SCHEDULES_ENDPOINT}/${scheduleId}/runs${queryParams}`);
}

/**
 * Get detailed information about a specific run including all deliveries
 */
export async function getRunDetails(runId: string): Promise<RunDetailsResponse> {
  return apiClient<RunDetailsResponse>(`${SCHEDULES_ENDPOINT}/runs/${runId}`);
}

// ============ EMAIL TEMPLATES ============

/**
 * Get all email templates for the user (including system templates)
 */
export async function getEmailTemplates(): Promise<EmailTemplatesResponse> {
  return apiClient<EmailTemplatesResponse>(`${SCHEDULES_ENDPOINT}/templates`);
}

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  payload: CreateEmailTemplatePayload
): Promise<EmailTemplateResponse> {
  return apiClient<EmailTemplateResponse, CreateEmailTemplatePayload>(
    `${SCHEDULES_ENDPOINT}/templates`,
    {
      method: 'POST',
      body: payload,
    }
  );
}

/**
 * Update an existing email template
 */
export async function updateEmailTemplate(
  templateId: string,
  payload: Partial<CreateEmailTemplatePayload>
): Promise<EmailTemplateResponse> {
  return apiClient<EmailTemplateResponse, Partial<CreateEmailTemplatePayload>>(
    `${SCHEDULES_ENDPOINT}/templates/${templateId}`,
    {
      method: 'PUT',
      body: payload,
    }
  );
}

/**
 * Delete an email template
 */
export async function deleteEmailTemplate(
  templateId: string
): Promise<{ status: string; message?: string }> {
  return apiClient<{ status: string; message?: string }>(
    `${SCHEDULES_ENDPOINT}/templates/${templateId}`,
    {
      method: 'DELETE',
    }
  );
}

// ============ HELPER FUNCTIONS ============

/**
 * Format time from 24-hour to 12-hour format
 */
function formatTime12Hour(time24: string): string {
  const [hourStr, minuteStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${hour12}:${minute} ${ampm}`;
}

/**
 * Format schedule frequency for display
 */
export function formatScheduleFrequency(schedule: Schedule): string {
  const { frequency, dayOfMonth, dayOfWeek, timeOfDay } = schedule;
  const time = formatTime12Hour(timeOfDay?.slice(0, 5) || '09:00');

  switch (frequency) {
    case 'daily':
      return `Daily at ${time}`;
    case 'weekly': {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayOfWeek !== null ? days[dayOfWeek] : 'Monday';
      return `Weekly on ${dayName} at ${time}`;
    }
    case 'monthly':
      return `Monthly on day ${dayOfMonth || 1} at ${time}`;
    case 'quarterly':
      return `Quarterly on day ${dayOfMonth || 1} at ${time}`;
    default:
      return frequency;
  }
}

/**
 * Format next run date for display
 */
export function formatNextRun(nextRunAt: string | null): string {
  if (!nextRunAt) return 'Not scheduled';

  const date = new Date(nextRunAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return 'Overdue';
  } else if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `In ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Format date for run history display
 */
export function formatRunDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate success rate from a run
 */
export function calculateRunSuccessRate(run: ScheduleRun): number {
  const total = run.emailsSent + run.emailsFailed;
  if (total === 0) return 0;
  return Math.round((run.emailsSent / total) * 100);
}

/**
 * Get color class for run status badge
 */
export function getRunStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    partial_failure: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || colors.pending;
}

/**
 * Get color class for delivery status badge
 */
export function getDeliveryStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    opened: 'bg-emerald-100 text-emerald-800',
    bounced: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || colors.pending;
}

/**
 * Transform API schedule to form data format
 */
export function scheduleToFormData(schedule: Schedule): {
  name: string;
  frequency: Schedule['frequency'];
  dayOfMonth: number;
  dayOfWeek: number;
  timeOfDay: string;
  timezone: string;
  dateRangeType: Schedule['dateRangeType'];
  customDaysBack: number;
  format: Schedule['format'];
  reportMode: Schedule['reportMode'];
  logoId: string | null;
  propertyIds: string[];
  recipients: Array<{
    id?: string;
    type: 'client' | 'custom';
    clientId?: string;
    email?: string;
    name?: string;
    propertyFilterIds?: string[];
  }>;
  ccSelf: boolean;
  useCustomTemplate: boolean;
  emailSubject: string;
  emailBody: string;
  isActive: boolean;
} {
  return {
    name: schedule.name,
    frequency: schedule.frequency,
    dayOfMonth: schedule.dayOfMonth || 1,
    dayOfWeek: schedule.dayOfWeek || 1,
    timeOfDay: schedule.timeOfDay?.slice(0, 5) || '09:00',
    timezone: schedule.timezone || 'America/Toronto',
    dateRangeType: schedule.dateRangeType,
    customDaysBack: schedule.customDaysBack || 30,
    format: schedule.format,
    reportMode: schedule.reportMode,
    logoId: schedule.logoId,
    propertyIds: schedule.properties?.map((p) => p.propertyId) || [],
    recipients:
      schedule.recipients?.map((r) => ({
        id: r.id,
        type: r.type,
        clientId: r.clientId || undefined,
        email: r.email || undefined,
        name: r.name || undefined,
        propertyFilterIds: r.propertyFilterIds || undefined,
      })) || [],
    ccSelf: schedule.ccSelf,
    useCustomTemplate: !!(schedule.emailSubjectTemplate || schedule.emailBodyTemplate),
    emailSubject: schedule.emailSubjectTemplate || '',
    emailBody: schedule.emailBodyTemplate || '',
    isActive: schedule.isActive,
  };
}
