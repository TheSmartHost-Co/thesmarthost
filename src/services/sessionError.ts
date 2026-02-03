// services/sessionError.ts
// Custom error class for session-related errors
// When this error is thrown, the SessionExpiredModal will appear automatically

/**
 * SessionError is thrown when authentication fails due to:
 * - Expired session (access token expired)
 * - Missing session (no active login)
 * - Invalid session (token validation failed)
 * - 401/403 responses from the backend
 *
 * Components should check for this error type and silently ignore it,
 * as the SessionExpiredModal will appear automatically via the session store.
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
 *   if (isSessionError(err)) return // Modal will appear automatically
 *   showNotification(err.message, 'error')
 * }
 * ```
 */
export function isSessionError(error: unknown): error is SessionError {
  return error instanceof SessionError
}
