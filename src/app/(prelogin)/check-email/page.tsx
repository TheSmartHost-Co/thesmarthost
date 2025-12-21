"use client"

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useNotificationStore } from '@/store/useNotificationStore'
import Link from 'next/link'
import { EnvelopeIcon, ArrowPathIcon, InboxIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

import { createClient } from '@/utils/supabase/component'
import Notification from '@/components/shared/notification'
import PreNavbar from '@/components/navbar/PreNavbar'
import Footer from '@/components/footer/Footer'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const supabase = createClient()
  const notify = useNotificationStore(s => s.showNotification)

  const [isResending, setIsResending] = useState(false)

  async function resendVerification() {
    if (!email) {
      notify("Email not found. Please sign up again.", "error")
      return
    }

    setIsResending(true)

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/confirm`
      }
    })

    setIsResending(false)

    if (error) {
      notify(error.message, "error")
    } else {
      notify("Verification email sent!", "success")
    }
  }

  return (
    <div className="pt-20 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mb-6 shadow-lg shadow-blue-500/30"
          >
            <EnvelopeIcon className="h-10 w-10 text-white" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-2 text-gray-600">
            We&apos;ve sent a verification link to
          </p>
          {email && (
            <p className="mt-1 font-semibold text-blue-600">{email}</p>
          )}
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center space-y-5">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <InboxIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800 text-left">
                Click the link in your email to verify your account and complete registration.
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-3">
                <strong className="text-gray-800">Can&apos;t find the email?</strong>
                <br />
                Check your spam folder or try resending.
              </p>

              <motion.button
                type="button"
                onClick={resendVerification}
                disabled={isResending || !email}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isResending ? (
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                ) : (
                  <EnvelopeIcon className="-ml-1 mr-2 h-4 w-4" />
                )}
                {isResending ? 'Sending...' : 'Resend verification email'}
              </motion.button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 space-y-3">
          <p className="text-gray-600">
            Already verified?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>

          <Link
            href="/signup"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to sign up
          </Link>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Having trouble? Contact our support team at support@thesmarthost.com
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-white">
      <PreNavbar />
      <Notification />
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </div>
        </div>
      }>
        <CheckEmailContent />
      </Suspense>
      <Footer />
    </div>
  )
}
