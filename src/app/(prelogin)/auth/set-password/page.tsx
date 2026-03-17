'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { EyeIcon, EyeSlashIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/utils/supabase/component'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getOrCreateCleanerProfile } from '@/services/profileService'
import PreNavbar from '@/components/navbar/PreNavbar'
import Notification from '@/components/shared/notification'

/**
 * Set Password Page
 *
 * Shown to cleaners after clicking their invite link.
 * Supabase creates a session but doesn't set a password - we handle that here.
 *
 * Flow:
 * 1. User clicks invite link → Supabase verifies token, creates session
 * 2. Redirected here with active session
 * 3. User sets their password
 * 4. We call supabase.auth.updateUser({ password })
 * 5. Create profile and redirect to dashboard
 */
export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const setProfile = useUserStore(s => s.setProfile)
  const notify = useNotificationStore(s => s.showNotification)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')

  // Password validation
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        notify('Please use the invite link from your email', 'error')
        router.push('/login')
        return
      }

      const user = session.user
      setUserId(user.id)
      setUserEmail(user.email || '')
      setUserName(user.user_metadata?.fullName || user.email?.split('@')[0] || 'User')
      setIsCheckingSession(false)
    }

    checkSession()
  }, [supabase.auth, router, notify])

  async function handleSetPassword() {
    if (!isPasswordValid) {
      notify('Please meet all password requirements', 'error')
      return
    }

    setIsLoading(true)

    try {
      // Update the user's password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        notify(updateError.message || 'Failed to set password', 'error')
        setIsLoading(false)
        return
      }

      // Create the cleaner profile
      const profileResponse = await getOrCreateCleanerProfile(userId, userName)

      if (profileResponse.status === 'success' && profileResponse.data) {
        setProfile({
          ...profileResponse.data,
          id: userId,
          role: 'CLEANER',
          email: userEmail,
        })

        notify('Account setup complete! Welcome to TheSmartHost.', 'success')
        router.push('/cleaner/dashboard')
      } else {
        console.error('Profile creation error:', profileResponse.message)
        notify(profileResponse.message || 'Failed to create profile', 'error')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Set password error:', error)
      notify(error instanceof Error ? error.message : 'Something went wrong', 'error')
      setIsLoading(false)
    }
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <svg className="animate-spin h-5 w-5 text-purple-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PreNavbar />
      <Notification />

      <div className="pt-20 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-100 mb-4">
              <LockClosedIcon className="w-7 h-7 text-purple-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Create Your Password
            </h1>
            <p className="mt-2 text-gray-600">
              Welcome, {userName}! Set a password to secure your account.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="space-y-5">
              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full text-gray-500 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-gray-900 px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-gray-900 px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
                <PasswordRequirement met={hasMinLength} text="At least 8 characters" />
                <PasswordRequirement met={hasUppercase} text="One uppercase letter" />
                <PasswordRequirement met={hasLowercase} text="One lowercase letter" />
                <PasswordRequirement met={hasNumber} text="One number" />
                <PasswordRequirement met={passwordsMatch} text="Passwords match" />
              </div>

              {/* Submit Button */}
              <motion.button
                type="button"
                onClick={handleSetPassword}
                disabled={isLoading || !isPasswordValid}
                whileHover={{ scale: isPasswordValid ? 1.01 : 1 }}
                whileTap={{ scale: isPasswordValid ? 0.99 : 1 }}
                className="w-full flex justify-center py-3.5 px-4 rounded-xl text-base font-semibold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-lg shadow-purple-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Setting up your account...
                  </span>
                ) : (
                  'Complete Setup'
                )}
              </motion.button>
            </div>
          </div>

          <p className="text-center mt-6 text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircleIcon
        className={`h-4 w-4 ${met ? 'text-green-500' : 'text-gray-300'}`}
      />
      <span className={`text-sm ${met ? 'text-green-700' : 'text-gray-500'}`}>
        {text}
      </span>
    </div>
  )
}
