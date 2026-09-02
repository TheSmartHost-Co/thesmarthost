import apiClient from './apiClient'
import {
  AlertSettings,
  AlertSettingsResponse,
  NotificationPreferencesResponse,
  PreferenceUpdateEntry,
} from './types/notificationPreferences'

const BASE = '/notification-preferences'

/** Catalog + recommended defaults + this user's overrides, in one call. */
export function getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  return apiClient(BASE, { method: 'GET' })
}

/**
 * Batched save. The backend rejects the whole batch if any entry is invalid —
 * a half-applied settings save is worse than a failed one.
 */
export function updateNotificationPreferences(
  preferences: PreferenceUpdateEntry[],
  master?: { emailEnabled?: boolean; smsEnabled?: boolean }
): Promise<NotificationPreferencesResponse> {
  // `master` carries the two account-wide switches. The server writes them and
  // the per-event rows in one transaction, so a single Save cannot half-apply.
  return apiClient(BASE, { method: 'PUT', body: { preferences, ...(master ? { master } : {}) } })
}

/**
 * Reset to recommended defaults. Deletes the user's override rows; absence of
 * a row means "use the default", so this is the whole reset.
 */
export function resetNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  return apiClient(BASE, { method: 'DELETE' })
}

export function getAlertSettings(): Promise<AlertSettingsResponse> {
  return apiClient(`${BASE}/alerts`, { method: 'GET' })
}

export function updateAlertSettings(
  settings: Partial<AlertSettings>
): Promise<AlertSettingsResponse> {
  return apiClient(`${BASE}/alerts`, { method: 'PUT', body: settings })
}
