'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  MapIcon
} from '@heroicons/react/24/outline'

export default function NotFound() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(15)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsRedirecting(true)
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  const quickLinks = [
    { name: 'Dashboard', href: '/property-manager/dashboard', icon: HomeIcon },
    { name: 'Properties', href: '/property-manager/properties', icon: MapIcon },
    { name: 'Bookings', href: '/property-manager/bookings', icon: MagnifyingGlassIcon },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-404" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-404)" />
          </svg>
        </div>

        {/* Floating Orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -30, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* 404 Number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="relative mb-8"
        >
          <h1 className="text-[12rem] sm:text-[16rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400 leading-none select-none">
            404
          </h1>
          {/* Glowing effect behind the number */}
          <div className="absolute inset-0 text-[12rem] sm:text-[16rem] font-black text-blue-500/20 blur-2xl leading-none select-none">
            404
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
            Page Not Found
          </h2>
          <p className="text-lg text-slate-400 max-w-md mx-auto">
            Oops! The page you&apos;re looking for seems to have wandered off.
            Let&apos;s get you back on track.
          </p>
        </motion.div>

        {/* Countdown Timer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
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
                  className="text-blue-400"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "113 113" }}
                  animate={{ strokeDasharray: `${(countdown / 15) * 113} 113` }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                {countdown}
              </span>
            </div>
            <span className="text-slate-400 text-sm">
              {isRedirecting ? 'Redirecting...' : 'Redirecting to home in'}
            </span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
          <Link href="/">
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all cursor-pointer"
            >
              <HomeIcon className="w-5 h-5" />
              Back to Home
            </motion.span>
          </Link>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-sm text-slate-500 mb-4">Or try one of these pages:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {quickLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-700/50 hover:text-white hover:border-slate-600 transition-all"
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Decorative Bottom Element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 flex items-center justify-center gap-2 text-slate-600"
        >
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-slate-700" />
          <span className="text-xs font-medium">TheSmartHost</span>
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-slate-700" />
        </motion.div>
      </div>
    </div>
  )
}
