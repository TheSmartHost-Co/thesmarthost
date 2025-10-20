"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { useNotificationStore } from '@/store/useNotificationStore'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

import { createClient } from '@/utils/supabase/component'
import Notification from '@/components/shared/notification'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const notify = useNotificationStore(s => s.showNotification)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    // Check if this is a valid reset password session
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (!session) {
        notify("Invalid or expired reset link", "error")
        router.push('/forgot-password')
      }
    }
    
    checkSession()
  }, [supabase.auth, notify, router])

  async function updatePassword() {
    if (password !== confirmPassword) {
      notify("Passwords don't match", "error")
      return
    }

    if (password.length < 6) {
      notify("Password must be at least 6 characters", "error")
      return
    }

    setIsLoading(true)
    
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    setIsLoading(false)

    if (error) {
      notify(error.message, "error")
    } else {
      notify("Password updated successfully!", "success")
      // Sign out and redirect to login
      await supabase.auth.signOut()
      router.push('/login?message=password-updated')
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Set new password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please enter your new password below
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <form className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-black px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-black px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            <div>
              <button
                type="button"
                onClick={updatePassword}
                disabled={isLoading}
                className="w-full cursor-pointer flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating password...' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <>
      <Notification />
      <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>}>
        <ResetPasswordForm />
      </Suspense>
    </>
  )
}