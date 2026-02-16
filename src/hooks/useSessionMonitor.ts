'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/component'
import { sessionEvents } from '@/services/apiClient'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useSessionStore } from '@/store/useSessionStore'
import { isLoggingOut, markIntentionalLogout } from '@/utils/logoutState'

export interface SessionStatus {
  isExpired: boolean
  isNearExpiry: boolean
  expiresAt: Date | null
  timeRemaining: number // minutes
}

export function useSessionMonitor() {
  const router = useRouter()
  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])
  const { clearProfile, updateSessionCheck } = useUserStore()
  const showNotification = useNotificationStore(state => state.showNotification)

  // Subscribe to session store for instant modal triggering from apiClient
  const sessionError = useSessionStore(state => state.sessionError)
  const clearSessionError = useSessionStore(state => state.clearSessionError)

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isExpired: false,
    isNearExpiry: false,
    expiresAt: null,
    timeRemaining: 0
  })

  const [showWarningModal, setShowWarningModal] = useState(false)
  const [showExpiredModal, setShowExpiredModal] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const warningShownRef = useRef(false)
  const warningDismissTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const checkSessionStatus = useCallback(async () => {
    // Skip checks if user intentionally logged out
    if (isLoggingOut()) {
      return
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        // Skip if intentional logout (double-check)
        if (isLoggingOut()) {
          return
        }
        setSessionStatus({
          isExpired: true,
          isNearExpiry: false,
          expiresAt: null,
          timeRemaining: 0
        })
        handleSessionExpired()
        return
      }

      const now = new Date().getTime() / 1000

      // Validate expires_at is present and reasonable
      if (!session.expires_at || typeof session.expires_at !== 'number') {
        return
      }

      const expiresAt = new Date(session.expires_at * 1000)
      const timeRemaining = Math.max(0, (session.expires_at - now) / 60) // minutes

      const isExpired = timeRemaining <= 0
      const isNearExpiry = timeRemaining <= 5 && timeRemaining > 0

      setSessionStatus({
        isExpired,
        isNearExpiry,
        expiresAt,
        timeRemaining: Math.round(timeRemaining)
      })

      // Show warning modal once when near expiry
      if (isNearExpiry && !warningShownRef.current && !showWarningModal) {
        warningShownRef.current = true
        setShowWarningModal(true)
      }

      // Immediately sign out if expired
      if (isExpired) {
        handleSessionExpired()
      }

    } catch (error) {
      console.error('Session check failed:', error)
      // Treat check failures as expired sessions for security
      handleSessionExpired()
    }
  // supabase is memoized so supabase.auth is stable
  // Using warningShownRef instead of showWarningModal to avoid re-creating this callback
  }, [supabase])

  const handleSessionExpired = useCallback(async () => {
    // Skip if user intentionally logged out
    if (isLoggingOut()) {
      return
    }

    // STEP 1: Sign out from Supabase first (clear auth state)
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Supabase signout failed:', error)
      // Continue cleanup even if signout fails
    }

    // STEP 2: Clear Zustand store (user profile, tokens, timestamps)
    clearProfile()

    // STEP 3: Clear any existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // STEP 4: Show expired modal (non-dismissible)
    if (!showExpiredModal) {
      setShowExpiredModal(true)
    }
  }, [supabase, clearProfile])

  const handleRefreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error || !data.session) {
        throw new Error(error?.message || 'Failed to refresh session')
      }

      // Reset warning state
      warningShownRef.current = false
      setShowWarningModal(false)

      // Update session status and store timestamp
      updateSessionCheck()
      await checkSessionStatus()

      showNotification('Session refreshed successfully', 'success')

    } catch (error) {
      console.error('Session refresh failed:', error)
      showNotification('Failed to refresh session. Please sign in again.', 'error')
      handleSessionExpired()
    }
  }, [supabase, checkSessionStatus, showNotification, handleSessionExpired, updateSessionCheck])

  const handleSignOut = useCallback(async () => {
    try {
      // Mark as intentional before signing out
      markIntentionalLogout()
      await supabase.auth.signOut()
      clearProfile()
      clearSessionError()
      setShowWarningModal(false)
      setShowExpiredModal(false)
      router.push('/login')
    } catch (error) {
      console.error('Sign out failed:', error)
      // Force logout even if sign out fails
      clearProfile()
      clearSessionError()
      router.push('/login')
    }
  }, [supabase, clearProfile, clearSessionError, router])

  const handleLoginRedirect = useCallback(() => {
    setShowExpiredModal(false)
    // Clear session store error state
    clearSessionError()
    router.push('/login?session=expired')
  }, [router, clearSessionError])

  // Session monitoring setup
  useEffect(() => {
    // Initial check
    checkSessionStatus()

    // Poll every 5 minutes (API calls catch expiry instantly via 401/403)
    timerRef.current = setInterval(checkSessionStatus, 300000)

    // Check when user returns to tab (Page Visibility API)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionStatus()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Listen for API-triggered session events
    const handleApiSessionExpired = () => {
      handleSessionExpired()
    }

    const handleApiSessionInvalid = () => {
      handleSessionExpired()
    }

    sessionEvents.on('session-expired', handleApiSessionExpired)
    sessionEvents.on('session-invalid', handleApiSessionInvalid)

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      sessionEvents.off('session-expired', handleApiSessionExpired)
      sessionEvents.off('session-invalid', handleApiSessionInvalid)
    }
  }, [checkSessionStatus, handleSessionExpired])

  // Supabase auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Intentional logout - just clean up timers, don't show expired modal
        markIntentionalLogout() // Ensure flag is set
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        // Don't call handleSessionExpired - user already logged out
      } else if (event === 'TOKEN_REFRESHED') {
        checkSessionStatus()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, checkSessionStatus])

  // Handle dismiss warning with re-show logic
  const handleDismissWarning = useCallback(() => {
    setShowWarningModal(false)

    // Clear any existing re-show timeout
    if (warningDismissTimeoutRef.current) {
      clearTimeout(warningDismissTimeoutRef.current)
    }

    // Re-enable warning after 1 minute so it can show again
    warningDismissTimeoutRef.current = setTimeout(() => {
      warningShownRef.current = false
      warningDismissTimeoutRef.current = null
    }, 60000) // 1 minute
  }, [])

  // Cleanup dismiss timeout on unmount
  useEffect(() => {
    return () => {
      if (warningDismissTimeoutRef.current) {
        clearTimeout(warningDismissTimeoutRef.current)
      }
    }
  }, [])

  // Watch session store for errors set by apiClient
  // This enables INSTANT modal display when session errors occur
  useEffect(() => {
    if (sessionError && !showExpiredModal && !isLoggingOut()) {
      handleSessionExpired()
    }
  }, [sessionError, showExpiredModal, handleSessionExpired])

  return {
    sessionStatus,
    showWarningModal,
    showExpiredModal,
    onRefreshSession: handleRefreshSession,
    onSignOut: handleSignOut,
    onLoginRedirect: handleLoginRedirect,
    onDismissWarning: handleDismissWarning,
    onDismissExpired: () => setShowExpiredModal(false)
  }
}
