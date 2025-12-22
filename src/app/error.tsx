'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  BugAntIcon
} from '@heroicons/react/24/outline'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Diagonal Lines Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="diag-error" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M-10,10 l20,-20 M0,40 l40,-40 M30,50 l20,-20" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#diag-error)" />
          </svg>
        </div>

        {/* Floating Orbs - Amber/Orange themed */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Error Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="relative mb-8 inline-block"
        >
          <div className="relative w-36 h-36 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-3xl blur-2xl" />
            <div className="relative w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/30">
              <ExclamationTriangleIcon className="w-16 h-16 text-white" />
            </div>
            {/* Bug badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="absolute -bottom-2 -right-2 w-12 h-12 bg-slate-800 border-4 border-slate-900 rounded-xl flex items-center justify-center shadow-lg"
            >
              <BugAntIcon className="w-6 h-6 text-amber-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Something Went Wrong
          </h2>
          <p className="text-lg text-slate-400 max-w-md mx-auto">
            We encountered an unexpected error. Don&apos;t worry, our team has been notified.
          </p>
        </motion.div>

        {/* Error Details (collapsible) */}
        {error.message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-10 mx-auto max-w-lg"
          >
            <details className="bg-slate-800/50 border border-slate-700 backdrop-blur-sm rounded-xl overflow-hidden">
              <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors">
                View error details
              </summary>
              <div className="px-5 py-4 border-t border-slate-700 bg-slate-900/50">
                <code className="text-xs text-amber-400 font-mono break-all">
                  {error.message}
                </code>
                {error.digest && (
                  <p className="mt-2 text-xs text-slate-500">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            </details>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <motion.button
            onClick={reset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Try Again
          </motion.button>
          <motion.button
            onClick={() => router.back()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
          >
            Go Back
          </motion.button>
          <Link href="/">
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
            >
              <HomeIcon className="w-5 h-5" />
              Home
            </motion.span>
          </Link>
        </motion.div>

        {/* Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-slate-500"
        >
          If this keeps happening, please{' '}
          <Link href="/contact" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
            contact support
          </Link>
        </motion.p>

        {/* Decorative Bottom Element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 flex items-center justify-center gap-2 text-slate-600"
        >
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-slate-700" />
          <span className="text-xs font-medium">HostMetrics</span>
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-slate-700" />
        </motion.div>
      </div>
    </div>
  )
}
