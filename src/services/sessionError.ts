// services/sessionError.ts
// Custom error class for session-related errors.
// When this error is thrown, apiClient has already performed cleanup
// (Supabase signOut + user store clear) and hard-redirected to /login?session=expired.

/**
 * SessionError is thrown when authentication fails terminally:
 * - Refresh token expired/revoked
 * - 401 after a silent-refresh-retry that also failed
 * - Supabase reports no active session and refresh can't recover one
 *
 * Components should check for this error type and silently ignore it —
 * the user is already on their way to /login.
 */
export class SessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionError'
    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SessionError)
    }
  }
}

/**
 * Type guard to check if an error is a SessionError
 * Use this in catch blocks to silently ignore session errors
 *
 * @example
 * ```typescript
 * try {
 *   const res = await apiCall()
 * } catch (err) {
 *   if (isSessionError(err)) return // apiClient has already redirected to /login
 *   showNotification(err.message, 'error')
 * }
 * ```
 */
export function isSessionError(error: unknown): error is SessionError {
  return error instanceof SessionError
}
