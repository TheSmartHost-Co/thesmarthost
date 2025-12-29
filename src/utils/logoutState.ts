// Simple module-level state to track intentional logout
// This prevents the session monitor from treating intentional logout as session expiration

let isIntentionalLogout = false

export function markIntentionalLogout() {
  isIntentionalLogout = true
}

export function clearIntentionalLogout() {
  isIntentionalLogout = false
}

export function isLoggingOut() {
  return isIntentionalLogout
}
