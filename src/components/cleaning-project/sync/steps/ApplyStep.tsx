'use client'

import { motion } from 'framer-motion'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

interface ApplyStepProps {
  progress: { done: number; total: number }
}

const ApplyStep: React.FC<ApplyStepProps> = ({ progress }) => {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="px-6 py-12 flex flex-col items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4"
      >
        <ArrowPathIcon className="w-6 h-6 text-white" />
      </motion.div>

      <p className="text-sm font-medium text-gray-900">Creating cleaning projects…</p>
      <p className="text-xs text-gray-500 mt-1">
        {progress.done} of {progress.total} done
      </p>

      <div className="w-full max-w-md mt-6">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-right">{pct}%</p>
      </div>

      <p className="text-[11px] text-gray-400 mt-6 max-w-md text-center">
        Each cleaning project is created with the property’s default cleaner, checklist, and times where configured.
      </p>
    </div>
  )
}

export default ApplyStep
