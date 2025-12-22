"use client"

import { useState } from 'react'
import { useNotificationStore } from '@/store/useNotificationStore'
import Link from 'next/link'
import { ArrowLeftIcon, KeyIcon, EnvelopeIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

import { createClient } from '@/utils/supabase/component'
import Notification from '@/components/shared/notification'
import PreNavbar from '@/components/navbar/PreNavbar'
import Footer from '@/components/footer/Footer'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const notify = useNotificationStore(s => s.showNotification)

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function sendResetEmail() {
    if (!email) {
      notify("Please enter your email address", "error")
      return
    }

    setIsLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
    })

    setIsLoading(false)

    if (error) {
      notify(error.message, "error")
    } else {
      setEmailSent(true)
      notify("Password reset email sent!", "success")
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-white">
        <PreNavbar />
        <Notification />
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
                className="mx-auto flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 mb-6 shadow-lg shadow-green-500/30"
              >
                <CheckCircleIcon className="h-10 w-10 text-white" />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Check your email</h2>
              <p className="mt-2 text-gray-600">
                We&apos;ve sent a password reset link to
              </p>
              <p className="mt-1 font-semibold text-blue-600">{email}</p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
              <div className="text-center space-y-5">
                <p className="text-gray-700">
                  Click the link in your email to reset your password. The link will expire in 1 hour.
                </p>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-800">
                    <strong>Can&apos;t find the email?</strong>
                    <br />
                    Check your spam folder or try sending another reset email.
                  </p>
                </div>

                <motion.button
                  type="button"
                  onClick={() => {
                    setEmailSent(false)
                    setEmail('')
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Send another email
                </motion.button>
              </div>
            </div>

            <div className="text-center mt-6">
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to sign in
              </Link>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <PreNavbar />
      <Notification />
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
              <KeyIcon className="h-10 w-10 text-white" />
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Forgot your password?</h2>
            <p className="mt-2 text-gray-600 max-w-sm mx-auto">
              No worries! Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
            <form className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-gray-900 pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <motion.button
                type="button"
                onClick={sendResetEmail}
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
                    Sending...
                  </span>
                ) : (
                  'Send reset email'
                )}
              </motion.button>
            </form>
          </div>

          <div className="text-center mt-6">
            <Link
              href="/login"
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  )
}
