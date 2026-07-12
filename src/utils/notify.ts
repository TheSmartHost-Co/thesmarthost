// utils/notify.ts
//
// Central error-message formatting + notification helper. The backend already
// returns a descriptive message on failure (apiClient stores it on
// BackendError.message); historically call sites swallowed it and showed a
// generic "Error doing X". formatError surfaces the real message, with graceful
// handling for offline / network / validation cases. Pass an i18n fallback for
// the case where nothing better is available.

import { isBackendError } from '@/services/backendError'
import { isValidationError } from '@/services/validationError'
import { useNotificationStore } from '@/store/useNotificationStore'

const OFFLINE_MESSAGE = "You appear to be offline. Check your connection and try again."
const UNREACHABLE_MESSAGE = "Couldn't reach the server. Please try again in a moment."

/**
 * Turn any caught error into the most useful user-facing message.
 *
 * Precedence:
 *   1. Offline (navigator.onLine === false) — most actionable.
 *   2. ValidationError — the backend's list of field errors.
 *   3. BackendError — the backend's res.message (what we were swallowing).
 *   4. A network-layer fetch failure (TypeError).
 *   5. SessionError — skip (apiClient has already redirected to login).
 *   6. A generic Error with a message.
 *   7. The provided fallback.
 *
 * Returns '' only for SessionError (caller should not show a toast).
 */
export function formatError(err: unknown, fallback: string): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return OFFLINE_MESSAGE
  }
  if (isValidationError(err)) {
    return err.errors && err.errors.length > 0 ? err.errors.join(' ') : (err.message || fallback)
  }
  if (isBackendError(err)) {
    return err.message || fallback
  }
  // A failed fetch (server unreachable, CORS, DNS) surfaces as a TypeError.
  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) {
    return UNREACHABLE_MESSAGE
  }
  // Session expiry is already handled by a redirect in apiClient — don't toast.
  if (err instanceof Error && err.name === 'SessionError') {
    return ''
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return fallback
}

/**
 * Show an error toast with the best available message. No-ops for SessionError
 * (the user is being redirected to login anyway).
 */
export function notifyError(err: unknown, fallback: string): void {
  const message = formatError(err, fallback)
  if (!message) return
  useNotificationStore.getState().showNotification(message, 'error')
}
