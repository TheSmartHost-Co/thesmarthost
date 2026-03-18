'use client'

import { motion } from 'framer-motion'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import type { ChecklistProgress } from '@/services/types/cleaningProject'

interface ChecklistHeaderProps {
  propertyName?: string
  progress: ChecklistProgress | null
  onClose: () => void
  completing: boolean
}

export default function ChecklistHeader({
  propertyName,
  progress,
  onClose,
  completing,
}: ChecklistHeaderProps) {
  const completionPct = progress?.completionPercentage ?? 0

  return (
    <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
      <div className="flex items-center h-12 sm:h-13 px-3 sm:px-4">
        {/* Back button */}
        {!completing && (
          <button
            onClick={onClose}
            className="p-1.5 -ml-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}

        {/* Property name */}
        <h2 className="flex-1 text-sm font-semibold text-white truncate mx-3">
          {propertyName || 'Checklist'}
        </h2>

        {/* Completion count */}
        {progress && (
          <span className="text-sm font-medium text-purple-100 flex-shrink-0">
            {progress.completedItems}/{progress.totalItems}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-purple-300/40">
        <motion.div
          className="h-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${completionPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}
