// store/useSessionStore.ts
// Vestigial store: kept as a trace point for debugging session-failure paths.
// apiClient still writes here at terminal-failure spots before performing the
// auth cleanup + hard redirect itself. No active UI subscriber after the
// useSessionMonitor hook was removed in favor of trusting Supabase auto-refresh.

import { create } from 'zustand'

interface SessionStore {
  /**
   * Most recent session error message, or null if none.
   * Set by apiClient when a terminal auth failure occurs; not read by any UI.
   */
  sessionError: string | null

  /**
   * Record a session error. apiClient sets this just before its hard redirect
   * to /login?session=expired so the failure mode is visible in devtools/store.
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
