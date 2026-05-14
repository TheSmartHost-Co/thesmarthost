// store/useSessionStore.ts
// Dedicated store for session error state.
// When set, useSessionMonitor reacts by auto-logging-out and redirecting to /login?session=expired.

import { create } from 'zustand'

interface SessionStore {
  /**
   * Current session error message, or null if no error.
   * When set, useSessionMonitor triggers the auto-logout + redirect flow.
   */
  sessionError: string | null

  /**
   * Set a session error - triggers the auto-logout + redirect flow.
   * Called by apiClient when authentication fails.
   */
  setSessionError: (message: string) => void

  /**
   * Clear the session error - called when modal is dismissed
   */
  clearSessionError: () => void

  /**
   * Flag to track if a session error has been triggered.
   * Prevents duplicate auto-logouts from multiple failed requests firing in parallel.
   */
  hasTriggeredExpiration: boolean

  /**
   * Set the expiration triggered flag
   */
  setHasTriggeredExpiration: (value: boolean) => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionError: null,
  hasTriggeredExpiration: false,

  setSessionError: (message: string) => {
    // Prevent duplicate triggers from concurrent failed requests
    if (get().hasTriggeredExpiration) {
      console.log('🔒 Session error already triggered, skipping duplicate')
      return
    }

    console.log('🔒 Session error set:', message)
    set({
      sessionError: message,
      hasTriggeredExpiration: true,
    })
  },

  clearSessionError: () => {
    console.log('🔓 Session error cleared')
    set({
      sessionError: null,
      hasTriggeredExpiration: false,
    })
  },

  setHasTriggeredExpiration: (value: boolean) => {
    set({ hasTriggeredExpiration: value })
  },
}))

/**
 * Get the store state outside of React components
 * Used by apiClient to set session errors
 */
export const getSessionStore = () => useSessionStore.getState()
