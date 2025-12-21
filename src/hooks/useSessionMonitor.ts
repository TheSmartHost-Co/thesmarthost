'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/component'
import { sessionEvents } from '@/services/apiClient'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'

export interface SessionStatus {
  isExpired: boolean
  isNearExpiry: boolean
  expiresAt: Date | null
  timeRemaining: number // minutes
}

export function useSessionMonitor() {
  const router = useRouter()
  const supabase = createClient()
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

  const checkSessionStatus = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        setSessionStatus({
          isExpired: true,
          isNearExpiry: false,
          expiresAt: null,
          timeRemaining: 0
        })
        return
      }

      const now = new Date().getTime() / 1000
      const expiresAt = new Date(session.expires_at! * 1000)
      const timeRemaining = Math.max(0, (session.expires_at! - now) / 60) // minutes
      
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
      
      // Auto-logout if expired and no modal interaction
      if (isExpired) {
        handleSessionExpired()
      }
      
    } catch (error) {
      console.error('Session check failed:', error)
    }
  }, [supabase.auth, showWarningModal])

  const handleSessionExpired = useCallback(() => {
    // Clear user data
    clearProfile()
    
    // Clear any existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    // Show expired modal if not already showing
    if (!showExpiredModal) {
      setShowExpiredModal(true)
    }
  }, [clearProfile, showExpiredModal])

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
  }, [supabase.auth, checkSessionStatus, showNotification, handleSessionExpired])

  const handleSignOut = useCallback(async () => {
    try {
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
  }, [supabase.auth, clearProfile, router])

  const handleLoginRedirect = useCallback(() => {
    setShowExpiredModal(false)
    router.push('/login')
  }, [router])

  // Start session monitoring
  useEffect(() => {
    // Initial check
    checkSessionStatus()
    
    // Set up periodic checks every minute
    timerRef.current = setInterval(checkSessionStatus, 60000) // 1 minute
    
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
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      sessionEvents.off('session-expired', handleApiSessionExpired)
      sessionEvents.off('session-invalid', handleApiSessionInvalid)
    }
  }, [checkSessionStatus, handleSessionExpired])

  // Supabase auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Supabase auth state change:', event, session ? 'session exists' : 'no session')
      
      if (event === 'SIGNED_OUT' || !session) {
        handleSessionExpired()
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed automatically by Supabase')
        checkSessionStatus()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, handleSessionExpired, checkSessionStatus])

  return {
    sessionStatus,
    showWarningModal,
    showExpiredModal,
    onRefreshSession: handleRefreshSession,
    onSignOut: handleSignOut,
    onLoginRedirect: handleLoginRedirect,
    onDismissWarning: () => setShowWarningModal(false),
    onDismissExpired: () => setShowExpiredModal(false)
  }
}