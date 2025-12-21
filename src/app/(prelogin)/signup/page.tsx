"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useNotificationStore } from '@/store/useNotificationStore'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

import { createClient } from '@/utils/supabase/component'
import Notification from '@/components/shared/notification'
import PreNavbar from '@/components/navbar/PreNavbar'
import Footer from '@/components/footer/Footer'

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient()
  const notify = useNotificationStore(s => s.showNotification)

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function signUp() {
    if (!fullName.trim()) {
      notify("Full name is required", "error")
      return
    }

    if (fullName.trim().length < 2) {
      notify("Full name must be at least 2 characters", "error")
      return
    }

    if (!role) {
      notify("Please select a role", "error")
      return
    }

    if (password !== confirmPassword) {
      notify("Passwords don't match", "error")
      return
    }

    if (password.length < 6) {
      notify("Password must be at least 6 characters", "error")
      return
    }

    setIsLoading(true)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/confirm`,
        data: {
          fullName: fullName.trim(),
          role: role
        }
      }
    })

    setIsLoading(false)

    if (error) {
      console.log(error)
      notify(error.message, "error")
      return
    }

    if (data.user && !data.user.email_confirmed_at) {
      // Redirect to check email page with email parameter
      router.push(`/check-email?email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <>
      <PreNavbar />
      <Notification />
      <div className="min-h-screen pt-16 bg-white flex items-center justify-center px-3 sm:px-6 lg:px-8 py-6">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Create your account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Join us today and get started
            </p>
          </div>
          
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg border border-gray-200">
            <form className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">Select a Role</option>
                  <option value="PROPERTY-MANAGER">Property Manager</option>
                  <option value="CLIENT">Client</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-black px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your password"
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
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Confirm your password"
                  required
                />
              </div>
              
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={signUp}
                  disabled={isLoading}
                  className="w-full cursor-pointer flex justify-center py-3 sm:py-3 px-4 border border-transparent rounded-lg shadow-sm text-base sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>

          <div className="text-center px-4 sm:px-0">
            <p className="text-xs sm:text-xs text-gray-500 leading-relaxed">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    <Footer />
    </>
  )
}