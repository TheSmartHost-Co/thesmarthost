// Types for the per-event x per-channel notification preferences API
// (TICKET-012). The backend owns the event catalog — the frontend never keeps
// its own copy, so adding an event stays a backend change plus locale strings.

export type NotificationChannel = 'email' | 'sms' | 'in_app'

export type PreferenceSubjectType = 'profile' | 'cleaner' | 'team_member' | 'contractor'

export type PreferenceRole = 'pm' | 'team_member' | 'cleaner' | 'contractor'

/** Per-channel booleans, e.g. the default, effective or overridden state of one event. */
export type ChannelFlags = Record<NotificationChannel, boolean>

/** Mode-independent urgency for an (event, role) pair. */
export type NotificationLevel = 'urgent' | 'mail' | 'silent'

/** Named presets for the simplified cleaner/contractor view. */
export type NotificationPresetKey = 'jobs' | 'jobs_and_pay' | 'everything'

export interface NotificationPreset {
  key: NotificationPresetKey
  /** Categories this preset switches on (all of the role's categories for 'everything'). */
  categories: string[]
  /** Rows ready to send straight back through the batched PUT. */
  rows: PreferenceUpdateEntry[]
}

export interface NotificationEventPreference {
  eventType: string
  category: string
  /**
   * Urgency, independent of the legacy/quiet rollout flag. Drives the urgent
   * badge — do NOT derive urgency from `isDefault`, which reads all-true for
   * every event while the app is in legacy mode.
   */
  level: NotificationLevel
  /** What the recommended policy says for this (event, role). */
  isDefault: ChannelFlags
  /** What will actually happen, after master switches and overrides. */
  effective: ChannelFlags
  /** Which cells the user has explicitly set (drives the "changed" dot). */
  overridden: ChannelFlags
}

export interface NotificationMasterSwitches {
  emailEnabled: boolean
  smsEnabled: boolean
  hasPhone: boolean
  hasEmail: boolean
}

export interface NotificationPreferencesData {
  subjectType: PreferenceSubjectType
  role: PreferenceRole
  /** 'legacy' while the quiet defaults are still behind the rollout flag. */
  mode?: 'legacy' | 'quiet'
  categories?: string[]
  master: NotificationMasterSwitches
  events: NotificationEventPreference[]
  /** Raw `eventType:channel` -> boolean map of explicit user assertions. */
  overrides: Record<string, boolean>
  /** Preset definitions for this role; empty for PM/team member. */
  presets?: NotificationPreset[]
  /** The preset matching current state, or null when hand-tuned or fully silent. */
  activePreset?: NotificationPresetKey | null
  /** Number of rows removed, on reset only. */
  cleared?: number
}

export interface NotificationPreferencesResponse {
  status: 'success' | 'failed'
  data?: NotificationPreferencesData
  message?: string
}

export interface PreferenceUpdateEntry {
  eventType: string
  channel: NotificationChannel
  enabled: boolean
}

/**
 * Attention alert thresholds. null on a threshold means "use the backend
 * default" — the UI shows it as a placeholder rather than writing a value in.
 */
export interface AlertSettings {
  unassignedEnabled: boolean
  unassignedLeadDays: number | null
  sameDayUnassignedEnabled: boolean
  unacceptedEnabled: boolean
  unacceptedHours: number | null
  notStartedEnabled: boolean
  notStartedMinutes: number | null
  notCompletedEnabled: boolean
  notCompletedMinutes: number | null
}

export interface AlertSettingsResponse {
  status: 'success' | 'failed'
  data?: AlertSettings
  message?: string
}
