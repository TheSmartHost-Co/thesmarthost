// services/backendError.ts
// Custom error class for backend failures that preserves the full response body.
// Thrown by apiClient when the backend returns a non-2xx response that isn't a
// SessionError (401) or ValidationError (errors array). Call sites can read
// `.body` to access structured error payloads like { missingGroups: [...] }.

export class BackendError extends Error {
  status: number
  body: Record<string, unknown> | null

  constructor(message: string, status: number, body: Record<string, unknown> | null) {
    super(message)
    this.name = 'BackendError'
    this.status = status
    this.body = body
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BackendError)
    }
  }
}

export function isBackendError(error: unknown): error is BackendError {
  return error instanceof BackendError
}
