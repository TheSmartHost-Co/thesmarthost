"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { useNotificationStore } from '@/store/useNotificationStore'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

import { createClient } from '@/utils/supabase/component'
import Notification from '@/components/shared/notification'
import PreNavbar from '@/components/navbar/PreNavbar'
import Footer from '@/components/footer/Footer'
import { useUserStore } from '@/store/useUserStore'
import { getUserProfile } from '@/services/profileService'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const notify = useNotificationStore(s => s.showNotification)
  const setProfile = useUserStore(s => s.setProfile)
  const setAccessToken = useUserStore(s => s.setAccessToken)
  const getRedirectPath = useUserStore(s => s.getRedirectPath)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return
    
    const message = searchParams.get('message')
    if (message === 'email-verified') {
      notify("Email verified successfully! You can now sign in.", "success")
    } else if (message === 'verification-error') {
      notify("Email verification failed. Please try again.", "error")
    } else if (message === 'password-updated') {
      notify("Password updated successfully! Please sign in with your new password.", "success")
    }
  }, [searchParams, notify, isClient])

  async function logIn() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      // Check if error is specifically about email not being confirmed
      if (error.message === "Email not confirmed") {
        notify("Please verify your email before signing in", "error")
        router.push(`/check-email?email=${encodeURIComponent(email)}`)
      } else {
        notify("Invalid credentials, please check your email or password", "error")
      }
      return
    }

    // Store access token and fetch user profile
    if (data.user && data.session) {
      // Store access token in Zustand
      setAccessToken(data.session.access_token)
      
      try {
        const profileResponse = await getUserProfile(data.user.id)
        
        if (profileResponse.status === 'success' && profileResponse.data) {
          // Store profile in Zustand
          setProfile({
            id: data.user.id,
            fullName: profileResponse.data.fullName,
            role: profileResponse.data.role,
            email: data.user.email
          })

          notify("You've successfully signed in!", "success")
          
          // Get redirect path based on role
          const redirectPath = getRedirectPath()
          router.push(redirectPath)
        } else {
          notify("Login successful, but couldn't load profile", "error")
        }
      } catch (profileError) {
        console.error('Profile fetch failed:', profileError)
        console.log(profileError)
        notify("Login successful, but couldn't load profile", "error")
      }
    }
  }


  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account or create a new one
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <form className="space-y-6">
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
            
            <div className="space-y-4">
              <button
                type="button"
                onClick={logIn}
                className="w-full cursor-pointer flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-md font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Sign in
              </button>
              
              <div className="text-center">
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                  Forgot your password?
                </Link>
              </div>
            </div>
          </form>
          <div className="text-center">
          <p className="text-md text-gray-600 mt-5">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up here
            </Link>
          </p>
        </div>
        </div>
        

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <>
      <PreNavbar />
      <Notification />
      <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>}>
        <LoginForm />
      </Suspense>
      <Footer />
    </>
  )
}