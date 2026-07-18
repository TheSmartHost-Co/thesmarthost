'use client'

import { useTranslation } from 'react-i18next'
import { ClockIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { formatProjectDate, formatProjectTime } from '../../utils/formatUtils'
import type { TimeChangeRequestBannerProps } from '../types'

/** Pending time-change request: current vs requested schedule + approve/reject. */
export default function TimeChangeRequestBanner({
  request,
  hasWrite,
  isResolving,
  rejectionNotes,
  onRejectionNotesChange,
  onApprove,
  onReject,
}: TimeChangeRequestBannerProps) {
  const { t } = useTranslation('turnover')
  const notSet = t('notSet')
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ClockIcon className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-800">{t('timeChangeRequested')}</h3>
        {request.cleanerName && (
          <span className="text-sm text-amber-600">{t('byCleanerName', { name: request.cleanerName })}</span>
        )}
      </div>

      {/* Current vs Requested side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">{t('currentSchedule')}</p>
          <p className="text-sm font-medium text-gray-900">{formatProjectDate(request.currentProjectDate)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatProjectTime(request.currentProjectStartTime, notSet)} – {formatProjectTime(request.currentProjectEndTime, notSet)}
          </p>
        </div>
        <div className="bg-amber-100/50 rounded-lg p-3">
          <p className="text-xs font-medium text-amber-700 uppercase mb-1">{t('requestedChanges')}</p>
          <p className="text-sm font-medium text-amber-900">{formatProjectDate(request.requestedProjectDate)}</p>
          <p className="text-xs text-amber-700 mt-0.5">
            {formatProjectTime(request.requestedProjectStartTime, notSet)} – {formatProjectTime(request.requestedProjectEndTime, notSet)}
          </p>
        </div>
      </div>

      {/* Reason */}
      {request.reason && (
        <p className="text-sm text-amber-800 mb-3">
          <span className="font-medium">{t('reasonLabel')}:</span> {request.reason}
        </p>
      )}

      {/* Rejection notes input */}
      {hasWrite && (
        <textarea
          value={rejectionNotes}
          onChange={(e) => onRejectionNotesChange(e.target.value)}
          placeholder={t('rejectionNotesPlaceholder')}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-3"
        />
      )}

      {/* Approve / Reject buttons */}
      {hasWrite && (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            disabled={isResolving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            {isResolving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircleIcon className="w-4 h-4" />
            )}
            {t('approve')}
          </button>
          <button
            onClick={onReject}
            disabled={isResolving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            {isResolving ? (
              <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
            ) : (
              <XMarkIcon className="w-4 h-4" />
            )}
            {t('reject')}
          </button>
        </div>
      )}
    </div>
  )
}
