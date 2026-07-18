'use client'

import { useTranslation } from 'react-i18next'
import { UserCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { formatDuration } from '@/services/cleaningProjectService'
import { formatProjectTime } from '../../utils/formatUtils'
import type { CleanerCardProps } from '../types'

/** Assigned cleaner (or assignment dropdown) + schedule times/duration. */
export default function CleanerCard({
  project,
  cleaners,
  hasWrite,
  selectedCleanerId,
  onSelectedCleanerIdChange,
  isAssigning,
  onAssign,
}: CleanerCardProps) {
  const { t } = useTranslation('turnover')
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${project.cleanerId ? 'bg-green-100' : 'bg-amber-100'}`}>
          <UserCircleIcon className={`w-4.5 h-4.5 ${project.cleanerId ? 'text-green-600' : 'text-amber-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('assignedCleanerLabel')}</p>
          {project.cleanerId ? (
            <div className="mt-0.5">
              <p className="font-semibold text-gray-900">{project.cleanerName}</p>
              <p className="text-sm text-gray-500">{project.cleanerEmail || project.cleanerPhone || t('noContact')}</p>
            </div>
          ) : hasWrite ? (
            <div className="mt-2">
              <select
                value={selectedCleanerId}
                onChange={(e) => onSelectedCleanerIdChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">{t('selectCleanerPlaceholder')}</option>
                {cleaners.filter(c => c.status !== 'inactive').map(cleaner => (
                  <option key={cleaner.id} value={cleaner.id}>
                    {cleaner.name}
                  </option>
                ))}
              </select>
              <button
                onClick={onAssign}
                disabled={!selectedCleanerId || isAssigning}
                className="mt-2 w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                {isAssigning ? t('assigningCleaner') : t('assignCleaner')}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-1">{t('noCleanerAssigned')}</p>
          )}
        </div>
      </div>

      {/* Time — single line */}
      <div className="flex items-center gap-2">
        <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-900">
          {formatProjectTime(project.projectStartTime, t('notSet'))}
          {' – '}
          {project.projectEndTime ? formatProjectTime(project.projectEndTime, t('notSet')) : t('tbd')}
        </span>
      </div>

      {/* Duration & Guests — inline */}
      <div className="flex items-center gap-4 flex-wrap">
        {project.estimatedDurationMinutes && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <ClockIcon className="w-4 h-4 text-gray-400" />
            <span>Est. {formatDuration(project.estimatedDurationMinutes)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
