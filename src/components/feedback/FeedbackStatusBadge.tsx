'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { FEEDBACK_STATUS_COLORS, type FeedbackStatus } from '@/services/types/feedback'

/** Maps a status to its i18n key in the `feedback` namespace. */
export function feedbackStatusKey(status: FeedbackStatus): string {
  switch (status) {
    case 'in_review': return 'statusInReview'
    case 'in_progress': return 'statusInProgress'
    case 'open': return 'statusOpen'
    case 'planned': return 'statusPlanned'
    case 'done': return 'statusDone'
    case 'declined': return 'statusDeclined'
    case 'cancelled': return 'statusCancelled'
  }
}

interface FeedbackStatusBadgeProps {
  status: FeedbackStatus
  className?: string
}

const FeedbackStatusBadge: React.FC<FeedbackStatusBadgeProps> = ({ status, className = '' }) => {
  const { t } = useTranslation('feedback')

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${FEEDBACK_STATUS_COLORS[status]} ${className}`}
    >
      {t(feedbackStatusKey(status))}
    </span>
  )
}

export default FeedbackStatusBadge
