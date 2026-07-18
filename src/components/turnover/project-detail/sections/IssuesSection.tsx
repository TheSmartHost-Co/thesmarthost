'use client'

import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon, FlagIcon } from '@heroicons/react/24/outline'
import type { IssuesSectionProps } from '../types'

/** Issue-count summary card (opens the issues modal) or empty state. */
export default function IssuesSection({ counts, onView }: IssuesSectionProps) {
  const { t } = useTranslation('turnover')

  if (!counts || counts.total === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <FlagIcon className="w-6 h-6 text-gray-300 mx-auto mb-1" />
        <p className="text-sm text-gray-500">{t('noIssuesForProject')}</p>
      </div>
    )
  }

  return (
    <button
      onClick={onView}
      className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            counts.open > 0 ? 'bg-red-100' : counts.acknowledged > 0 ? 'bg-amber-100' : 'bg-green-100'
          }`}>
            <ExclamationTriangleIcon className={`w-5 h-5 ${
              counts.open > 0 ? 'text-red-600' : counts.acknowledged > 0 ? 'text-amber-600' : 'text-green-600'
            }`} />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {t('issueCountLabel', { count: counts.total })}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {counts.open > 0 && (
                <span className="text-red-600">{t('openIssuesBadge', { count: counts.open })}</span>
              )}
              {counts.acknowledged > 0 && (
                <span className="text-amber-600">{t('acknowledgedIssuesBadge', { count: counts.acknowledged })}</span>
              )}
              {counts.resolved > 0 && (
                <span className="text-green-600">{t('resolvedIssuesBadge', { count: counts.resolved })}</span>
              )}
            </div>
          </div>
        </div>
        <span className="text-sm text-purple-600 font-medium">{t('viewButton')} →</span>
      </div>
    </button>
  )
}
