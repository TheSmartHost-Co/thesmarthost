"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { useNotificationStore } from '@/store/useNotificationStore'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon, LockClosedIcon, ChartBarIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

import { useTranslation } from 'react-i18next'
import { createClient } from '@/utils/supabase/component'
import Notification from '@/components/shared/notification'
import PreNavbar from '@/components/navbar/PreNavbar'
import Footer from '@/components/footer/Footer'
import { useUserStore } from '@/store/useUserStore'
import { getUserProfile } from '@/services/profileService'
import { getTeamMemberByAuthUserId } from '@/services/teamMemberService'
import { getClientByAuthUserId } from '@/services/clientService'
import { getCleanerByAuthUserId } from '@/services/cleanerService'

function LoginForm() {
  const { t } = useTranslation('auth')
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
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        let redirectPath = getRedirectPath()
        if (redirectPath === '/login') {
          try {
            const profileResponse = await getUserProfile(session.user.id)
            if (profileResponse.status === 'success' && profileResponse.data) {
              setProfile({ ...profileResponse.data, id: session.user.id, email: session.user.email })
              redirectPath = getRedirectPath()
            }
          } catch {
            setIsCheckingSession(false)
            return
          }
        }
        router.replace(redirectPath)
      } else {
        setIsCheckingSession(false)
      }
    }
    checkExistingSession()
  }, [])

  useEffect(() => {
    if (!isClient) return

    const message = searchParams.get('message')
    const session = searchParams.get('session')

    if (message === 'email-verified') {
      notify(t('emailVerifiedSuccess'), "success")
    } else if (message === 'verification-error') {
      notify(t('emailVerificationFailed'), "error")
    } else if (message === 'password-updated') {
      notify(t('passwordUpdatedSuccess'), "success")
    } else if (session === 'expired') {
      notify(t('sessionExpired'), "error")
    }
  }, [searchParams, notify, isClient])

  async function logIn() {
    setIsLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setIsLoading(false)

    if (error) {
      if (error.message === "Email not confirmed") {
        notify(t('pleaseVerifyEmail'), "error")
        router.push(`/check-email?email=${encodeURIComponent(email)}`)
      } else {
        notify(t('invalidCredentials'), "error")
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
          const profileData = { ...profileResponse.data, id: data.user.id, email: data.user.email }

          // If team member, fetch their team member record for pmUserId + permissions
          if (profileData.role === 'TEAM_MEMBER') {
            try {
              const tmResponse = await getTeamMemberByAuthUserId(data.user.id)
              if (tmResponse.status === 'success' && tmResponse.data) {
                profileData.pmUserId = tmResponse.data.userId
                profileData.permissions = tmResponse.data.permissions
              }
            } catch (tmError) {
              console.error('Failed to fetch team member data:', tmError)
            }
          }

          // If client (property owner), fetch their client record for pmUserId
          if (profileData.role === 'CLIENT') {
            try {
              const clientResponse = await getClientByAuthUserId(data.user.id)
              if (clientResponse.status === 'success' && clientResponse.data) {
                profileData.pmUserId = clientResponse.data.pmUserId
              }
            } catch (clientError) {
              console.error('Failed to fetch client data:', clientError)
            }
          }

          // If cleaner, fetch their cleaner record for pmUserId
          if (profileData.role === 'CLEANER') {
            try {
              const cleanerResponse = await getCleanerByAuthUserId(data.user.id)
              if (cleanerResponse.status === 'success' && cleanerResponse.data) {
                profileData.pmUserId = cleanerResponse.data.userId
              }
            } catch (cleanerError) {
              console.error('Failed to fetch cleaner data:', cleanerError)
            }
          }

          setProfile(profileData)

          notify(t('signInSuccess'), "success");

          console.log(`auth token: ${data.session.access_token}`)

          // Get redirect path based on role
          const redirectPath = getRedirectPath()
          router.push(redirectPath)
        } else {
          notify(t('loginSuccessProfileFailed'), "error")
        }
      } catch (profileError) {
        console.error('Profile fetch failed:', profileError)
        notify(t('loginSuccessProfileFailed'), "error")
      }
    }
  }

  const features = [
    {
      icon: ClockIcon,
      title: t('featureTimeSaved'),
      description: t('featureTimeSavedDesc')
    },
    {
      icon: ChartBarIcon,
      title: t('featureAnalytics'),
      description: t('featureAnalyticsDesc')
    },
    {
      icon: DocumentTextIcon,
      title: t('featureReports'),
      description: t('featureReportsDesc')
    },
  ]

  if (isCheckingSession) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 min-h-screen flex">
      {/* Left Side - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6">
              {t('welcomeBackTo')}
              <br />
              <span className="text-blue-200">TheSmartHost</span>
            </h1>
            <p className="text-blue-100 text-lg mb-10 max-w-md">
              {t('accessDashboard')}
            </p>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-blue-200" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                    <p className="text-blue-200 text-sm">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 mb-4">
              <LockClosedIcon className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('welcomeBack')}</h2>
            <p className="mt-2 text-gray-600">
              {t('signInToContinue')}
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
            <form className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('emailAddress')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder={t('enterEmail')}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-gray-900 px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder={t('enterPassword')}
                    required
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

              <div className="flex items-center justify-end">
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                  {t('forgotPassword')}
                </Link>
              </div>

              <motion.button
                type="button"
                onClick={logIn}
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full flex justify-center py-3.5 px-4 rounded-xl text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('signingIn')}
                  </span>
                ) : (
                  t('signIn')
                )}
              </motion.button>
            </form>
          </div>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              {t('dontHaveAccount')}{' '}
              <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-500">
                {t('signUpHere')}
              </Link>
            </p>
          </div>

          <div className="text-center mt-4">
            <p className="text-xs text-gray-500">
              {t('agreeToTermsSignIn')}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { t } = useTranslation('common')
  return (
    <div className="min-h-screen bg-white">
      <PreNavbar />
      <Notification />
      <Suspense fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('loading')}
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
      <Footer />
    </div>
  )
}
