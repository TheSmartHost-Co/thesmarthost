'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  ArrowLeftIcon,
  ShieldExclamationIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

export default function ForbiddenPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(10)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsRedirecting(true)
          router.push('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-950 via-slate-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Hexagon Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hex-403" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <polygon points="25,0 50,14.4 50,43.4 25,57.7 0,43.4 0,14.4" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hex-403)" />
          </svg>
        </div>

        {/* Floating Orbs - Red/Rose themed */}
        <motion.div
          className="absolute top-1/3 left-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Shield Icon with Lock */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="relative mb-8 inline-block"
        >
          {/* Main Shield */}
          <div className="relative w-40 h-40 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-red-600/20 rounded-3xl blur-2xl" />
            <div className="relative w-full h-full bg-gradient-to-br from-rose-500 to-red-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-500/30">
              <ShieldExclamationIcon className="w-20 h-20 text-white" />
            </div>
            {/* Lock badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="absolute -bottom-2 -right-2 w-14 h-14 bg-slate-800 border-4 border-slate-900 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <LockClosedIcon className="w-7 h-7 text-rose-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* 403 Number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <span className="text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-400 to-orange-400">
            403
          </span>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4 mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Access Forbidden
          </h2>
          <p className="text-lg text-slate-400 max-w-md mx-auto">
            You don&apos;t have permission to access this page.
            Please sign in with an authorized account or contact support.
          </p>
        </motion.div>

        {/* Warning Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-10 mx-auto max-w-md"
        >
          <div className="bg-rose-500/10 border border-rose-500/20 backdrop-blur-sm rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                <LockClosedIcon className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-rose-300 mb-1">Why am I seeing this?</h4>
                <p className="text-sm text-rose-200/70">
                  This page requires special permissions. If you believe you should have access, please log in again or contact your administrator.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Countdown Timer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
            <div className="relative">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-slate-700"
                />
                <motion.circle
                  cx="20"
                  cy="20"
                  r="18"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-rose-400"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "113 113" }}
                  animate={{ strokeDasharray: `${(countdown / 10) * 113} 113` }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                {countdown}
              </span>
            </div>
            <span className="text-slate-400 text-sm">
              {isRedirecting ? 'Redirecting...' : 'Redirecting to login in'}
            </span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <motion.button
            onClick={() => router.back()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Go Back
          </motion.button>
          <Link href="/login">
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 transition-all cursor-pointer"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              Sign In
            </motion.span>
          </Link>
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

        {/* Decorative Bottom Element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex items-center justify-center gap-2 text-slate-600"
        >
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-slate-700" />
          <span className="text-xs font-medium">HostMetrics</span>
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-slate-700" />
        </motion.div>
      </div>
    </div>
  )
}
