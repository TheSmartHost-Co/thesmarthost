// services/validationError.ts
// Custom error class for validation errors that carry an array of error messages.
// Thrown by apiClient when the backend returns { status: 'failed', errors: [...] }

export class ValidationError extends Error {
  errors: string[]

  constructor(message: string, errors: string[]) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError)
    }
  }
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}
