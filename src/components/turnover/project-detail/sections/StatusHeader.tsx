'use client'

import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon, BoltIcon } from '@heroicons/react/24/outline'
import { getStatusBadgeClasses } from '../../utils/formatUtils'
import type { StatusHeaderProps } from '../types'

/** Status / overdue / same-day / override / source badge row. */
export default function StatusHeader({ project, statusLabel, statusColor, overdue, overdueLabel }: StatusHeaderProps) {
  const { t } = useTranslation('turnover')
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center px-2 py-0.5 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-semibold rounded-lg border ${getStatusBadgeClasses(statusColor, overdue)}`}>
        {overdue ? t('overdue') : statusLabel}
      </span>
      {overdue && overdueLabel && (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-semibold bg-red-100 text-red-700 rounded-lg border border-red-200">
          <ExclamationTriangleIcon className="w-4 h-4" />
          {overdueLabel}
        </span>
      )}
      {project.isSameDayTurnover && (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-semibold bg-amber-100 text-amber-700 rounded-lg border border-amber-200">
          <ExclamationTriangleIcon className="w-4 h-4" />
          {t('sameDayTurnover')}
        </span>
      )}
      {project.pmOverride && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-orange-100 text-orange-700 rounded-lg border border-orange-200">
          <BoltIcon className="w-3.5 h-3.5" />
          {t('overrideActive')}
        </span>
      )}
      {project.source !== 'manual' && (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg">
          via {project.source === 'hostaway' ? 'Hostaway' : 'iCal'}
        </span>
      )}
    </div>
  )
}
