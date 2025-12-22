"use client"

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowUpTrayIcon,
  SparklesIcon,
  ShieldCheckIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import UploadWizard from '@/components/upload-wizard/UploadWizard'

export default function UploadBookingsPage() {
  const router = useRouter()

  const handleWizardComplete = () => {
    router.push('/property-manager/bookings')
  }

  const handleWizardCancel = () => {
    router.push('/property-manager/bookings')
  }

  const features = [
    {
      icon: BoltIcon,
      label: 'Smart Detection',
      description: 'Auto-detects columns'
    },
    {
      icon: ShieldCheckIcon,
      label: 'Validation',
      description: 'Catches errors early'
    },
    {
      icon: SparklesIcon,
      label: 'Multi-Property',
      description: 'Batch import support'
    }
  ]

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Hero Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl mb-8"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />

        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative px-8 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Title & Description */}
            <div className="flex items-start gap-5">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl"
              >
                <ArrowUpTrayIcon className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-white tracking-tight font-[var(--font-outfit)]"
                >
                  Import Bookings
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-blue-100/80 mt-1.5 text-lg font-[var(--font-manrope)]"
                >
                  Upload CSV exports from your property management system
                </motion.p>
              </div>
            </div>

            {/* Right: Feature Pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors"
                >
                  <feature.icon className="w-4 h-4 text-blue-300" />
                  <div>
                    <span className="text-sm font-semibold text-white">{feature.label}</span>
                    <span className="text-xs text-blue-200/70 ml-1.5 hidden sm:inline">· {feature.description}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Upload Wizard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <UploadWizard
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      </motion.div>
    </div>
  )
}
