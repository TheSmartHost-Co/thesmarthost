'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/component'
import { sessionEvents } from '@/services/apiClient'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
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
  const interactionListenerRef = useRef<(() => void) | null>(null)

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
        console.log('🔒 No valid session found, triggering expiration')
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
        console.warn('⚠️ Session expires_at is invalid:', session.expires_at)
        // Don't trigger expiration, but log for debugging
        return
      }

      const expiresAt = new Date(session.expires_at * 1000)
      const timeRemaining = Math.max(0, (session.expires_at - now) / 60) // minutes

      // Log session timing info for debugging
      console.log('📊 Session status:', {
        expiresAt: expiresAt.toISOString(),
        timeRemaining: `${timeRemaining.toFixed(1)} minutes`,
        now: new Date(now * 1000).toISOString()
      })

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
        console.log(`⚠️ Session expiring in ${Math.round(timeRemaining)} minutes, showing warning`)
        warningShownRef.current = true
        setShowWarningModal(true)
      }

      // AGGRESSIVE: Immediately sign out if expired
      if (isExpired) {
        console.log('🔒 Session expired, forcing immediate sign out')
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
      console.log('⏭️ Skipping session expiration handling - intentional logout')
      return
    }

    console.log('🚪 Handling session expiration - full cleanup initiated')

    // STEP 1: Sign out from Supabase first (clear auth state)
    try {
      await supabase.auth.signOut()
      console.log('✅ Supabase session cleared')
    } catch (error) {
      console.error('⚠️ Supabase signout failed:', error)
      // Continue cleanup even if signout fails
    }

    // STEP 2: Clear Zustand store (user profile, tokens, timestamps)
    clearProfile()
    console.log('✅ User store cleared')

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
      setShowWarningModal(false)
      setShowExpiredModal(false)
      router.push('/login')
    } catch (error) {
      console.error('Sign out failed:', error)
      // Force logout even if sign out fails
      clearProfile()
      router.push('/login')
    }
  }, [supabase, clearProfile, router])

  const handleLoginRedirect = useCallback(() => {
    setShowExpiredModal(false)
    console.log('🔄 Redirecting to login with session expired flag')
    router.push('/login?session=expired')
  }, [router])

  // Start AGGRESSIVE session monitoring
  useEffect(() => {
    console.log('🔐 Initializing aggressive session monitoring')

    // Initial check
    checkSessionStatus()

    // AGGRESSIVE: Set up periodic checks every 30 seconds (down from 60s)
    timerRef.current = setInterval(checkSessionStatus, 30000) // 30 seconds
    console.log('✅ 30-second polling enabled')

    // AGGRESSIVE: Check when user returns to tab (Page Visibility API)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Tab became visible, checking session immediately')
        checkSessionStatus()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // AGGRESSIVE: Check on any user interaction (throttled to prevent spam)
    let interactionTimeout: NodeJS.Timeout | null = null
    const handleInteraction = () => {
      if (!interactionTimeout) {
        console.log('🖱️ User interaction detected, checking session')
        checkSessionStatus()
        // Throttle: only check once per 10 seconds from interactions
        interactionTimeout = setTimeout(() => {
          interactionTimeout = null
        }, 10000)
      }
    }
    window.addEventListener('click', handleInteraction, { passive: true })
    window.addEventListener('keypress', handleInteraction, { passive: true })

    // Listen for API-triggered session events
    const handleApiSessionExpired = () => {
      console.log('📡 Session expired event from API call')
      handleSessionExpired()
    }

    const handleApiSessionInvalid = () => {
      console.log('📡 Session invalid event from API call')
      handleSessionExpired()
    }

    sessionEvents.on('session-expired', handleApiSessionExpired)
    sessionEvents.on('session-invalid', handleApiSessionInvalid)

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up session monitoring')
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (interactionTimeout) {
        clearTimeout(interactionTimeout)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keypress', handleInteraction)
      sessionEvents.off('session-expired', handleApiSessionExpired)
      sessionEvents.off('session-invalid', handleApiSessionInvalid)
    }
  }, [checkSessionStatus, handleSessionExpired])

  // Supabase auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Supabase auth state change:', event, session ? 'session exists' : 'no session')

      if (event === 'SIGNED_OUT') {
        // Intentional logout - just clean up timers, don't show expired modal
        console.log('👋 User signed out')
        markIntentionalLogout() // Ensure flag is set
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        // Don't call handleSessionExpired - user already logged out
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed automatically by Supabase')
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
      console.log('🔔 Re-enabling session warning after dismiss timeout')
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