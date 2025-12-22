"use client"

import Link from 'next/link'
import { ExclamationTriangleIcon, ArrowLeftIcon, HomeIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

import PreNavbar from '@/components/navbar/PreNavbar'
import Footer from '@/components/footer/Footer'

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-white">
      <PreNavbar />

      <div className="pt-20 min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto flex items-center justify-center h-24 w-24 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 mb-8 shadow-lg shadow-red-500/30"
          >
            <ExclamationTriangleIcon className="h-12 w-12 text-white" />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 mb-8 max-w-sm mx-auto">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>

          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
                >
                  <HomeIcon className="h-5 w-5" />
                  Go to Homepage
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Go Back
                </button>
              </motion.div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@thesmarthost.com" className="text-blue-600 hover:text-blue-500 font-medium">
                support@thesmarthost.com
              </a>
            </p>

            <div className="flex items-center justify-center gap-4 text-sm">
              <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign In
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/signup" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign Up
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/contact" className="text-blue-600 hover:text-blue-500 font-medium">
                Contact
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
