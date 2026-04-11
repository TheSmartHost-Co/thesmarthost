'use client'

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import type { ChecklistProgress, CleaningProjectStatus } from '@/services/types/cleaningProject'
import { formatTime } from '@/services/cleaningProjectService'

interface ChecklistHeaderProps {
  propertyName?: string
  progress: ChecklistProgress | null
  onClose: () => void
  completing: boolean
  projectDate?: string
  projectStartTime?: string | null
  projectEndTime?: string | null
  status?: CleaningProjectStatus
}

const statusConfig: Record<string, { labelKey: string; className: string }> = {
  pending: { labelKey: 'pendingStatus', className: 'bg-gray-400/20 text-gray-200' },
  assigned: { labelKey: 'awaitingResponse', className: 'bg-amber-400/20 text-amber-200' },
  confirmed: { labelKey: 'confirmedStatus', className: 'bg-blue-400/20 text-blue-200' },
  in_progress: { labelKey: 'inProgressStatus', className: 'bg-emerald-400/20 text-emerald-200' },
  completed: { labelKey: 'completedStatus', className: 'bg-green-400/20 text-green-200' },
  cancelled: { labelKey: 'cancelledStatus', className: 'bg-red-400/20 text-red-200' },
}

function formatHeaderDate(dateStr?: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ChecklistHeader({
  propertyName,
  progress,
  onClose,
  completing,
  projectDate,
  projectStartTime,
  projectEndTime,
  status,
}: ChecklistHeaderProps) {
  const { t } = useTranslation('cleanerPortal')
  const completionPct = progress?.completionPercentage ?? 0
  const statusInfo = status ? statusConfig[status] : null

  const dateStr = formatHeaderDate(projectDate)
  const timeStr = [
    projectStartTime ? formatTime(projectStartTime) : '',
    projectEndTime ? formatTime(projectEndTime) : '',
  ].filter(Boolean).join(' - ')
  const dateTimeStr = [dateStr, timeStr].filter(Boolean).join('  ·  ')

  return (
    <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
      <div className="px-3 sm:px-4 pt-2.5 pb-2">
        {/* Line 1: Back arrow + property name */}
        <div className="flex items-start gap-2">
          {!completing && (
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 mt-0.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex-shrink-0"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          )}
          <h2 className="flex-1 text-sm font-semibold text-white line-clamp-2 leading-snug">
            {propertyName || t('checklistTitle')}
          </h2>
        </div>

        {/* Line 2: Date + time range */}
        {dateTimeStr && (
          <p className="text-xs text-purple-200 mt-1 ml-8">
            {dateTimeStr}
          </p>
        )}

        {/* Line 3: Status pill + progress count */}
        <div className="flex items-center gap-2 mt-1.5 ml-8">
          {statusInfo && (
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusInfo.className}`}>
              {t(statusInfo.labelKey)}
            </span>
          )}
          {progress && (
            <span className="text-xs font-medium text-purple-200">
              {progress.completedItems}/{progress.totalItems}
            </span>
          )}
        </div>
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
