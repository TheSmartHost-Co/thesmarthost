'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/utils/supabase/component'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getUserProfile } from '@/services/profileService'

/**
 * Auth Callback Page
 *
 * Handles Supabase authentication redirects after invite/magic link clicks.
 *
 * Flow for cleaners (via inviteUserByEmail):
 * 1. PM invites cleaner → Supabase sends invite email
 * 2. Cleaner clicks link → Supabase verifies token, creates session
 * 3. Redirected here → we check if they have a profile
 * 4. No profile (first time) → redirect to /auth/set-password
 * 5. Has profile (returning) → redirect to /cleaner/dashboard
 */
export default function AuthCallbackPage() {
  const { t } = useTranslation('auth')
  const router = useRouter()
  const supabase = createClient()
  const setProfile = useUserStore(s => s.setProfile)
  const setAccessToken = useUserStore(s => s.setAccessToken)
  const getRedirectPath = useUserStore(s => s.getRedirectPath)
  const notify = useNotificationStore(s => s.showNotification)

  const [status, setStatus] = useState<'processing' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        // Get session - Supabase should have set it after verifying the invite token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          console.error('No session found:', sessionError)
          setStatus('error')
          setErrorMessage('No authentication session found')
          setTimeout(() => router.push('/login?message=auth-error'), 2000)
          return
        }

        const user = session.user
        setAccessToken(session.access_token)

        const role = user.user_metadata?.role

        if (role === 'CLEANER') {
          // Check if cleaner has a profile (determines if first-time or returning)
          let hasProfile = false
          try {
            const profileResponse = await getUserProfile(user.id)
            hasProfile = profileResponse.status === 'success' && !!profileResponse.data

            if (hasProfile) {
              // Returning user - set profile and go to dashboard
              setProfile({
                ...profileResponse.data!,
                id: user.id,
                role: 'CLEANER',
                email: user.email,
              })
            }
          } catch {
            // 404 = no profile = first time user
            hasProfile = false
          }

          if (hasProfile) {
            notify(t('welcomeBack'), 'success')
            router.push('/cleaner/dashboard')
          } else {
            // First-time user - need to set password and create profile
            router.push('/auth/set-password')
          }
        } else {
          // Standard flow for other roles
          try {
            const profileResponse = await getUserProfile(user.id)

            if (profileResponse.status === 'success' && profileResponse.data) {
              setProfile({
                ...profileResponse.data,
                id: user.id,
                email: user.email,
              })

              notify(t('signInSuccess'), 'success')
              const redirectPath = getRedirectPath()
              router.push(redirectPath)
            } else {
              throw new Error('Profile not found')
            }
          } catch (error) {
            console.error('Profile fetch error:', error)
            setStatus('error')
            setErrorMessage('Could not load your profile')
            setTimeout(() => router.push('/login?message=profile-error'), 2000)
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed')
        setTimeout(() => router.push('/login?message=auth-error'), 2000)
      }
    }

    handleAuthCallback()
  }, [router, supabase.auth, setProfile, setAccessToken, getRedirectPath, notify])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md w-full mx-4">
        {status === 'processing' ? (
          <>
            <div className="mb-6">
              <svg
                className="animate-spin h-12 w-12 text-purple-600 mx-auto"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('settingUpAccount')}
            </h2>
            <p className="text-gray-600">
              {t('pleaseWaitSignIn')}
            </p>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('authenticationError')}
            </h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <p className="text-sm text-gray-500">{t('redirectingToLogin')}</p>
          </>
        )}
      </div>
    </div>
  )
}
