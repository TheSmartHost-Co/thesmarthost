'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import FeedbackStatusBadge, { feedbackStatusKey } from './FeedbackStatusBadge'
import FeedbackDetailModal from './FeedbackDetailModal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useFeedbackAccess } from '@/hooks/useFeedbackAccess'
import { formatFeedbackAge, getMyFeedback } from '@/services/feedbackService'
import {
  FEEDBACK_STATUSES,
  type Feedback,
  type FeedbackStatus,
} from '@/services/types/feedback'

/**
 * FEEDBACK-001 — "my submissions" list.
 *
 * A component rather than a page so the property-manager and cleaner routes are
 * thin shells over the same list and can't drift. Modelled on
 * app/(user)/client/issues/page.tsx: card list, status filter pills with counts,
 * detail in a modal.
 */
const MyFeedbackView: React.FC = () => {
  const { t } = useTranslation('feedback')
  const showNotification = useNotificationStore((state) => state.showNotification)
  const { canSubmit, isAdmin, loading: accessLoading } = useFeedbackAccess()

  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all')
  const [selected, setSelected] = useState<Feedback | null>(null)

  useEffect(() => {
    if (accessLoading || !canSubmit) {
      if (!accessLoading) setLoading(false)
      return
    }

    let active = true
    getMyFeedback()
      .then((res) => {
        if (!active) return
        if (res.status === 'success') setItems(res.data)
        else showNotification(res.message || t('loadFailed'), 'error')
      })
      .catch(() => {
        if (active) showNotification(t('loadFailed'), 'error')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessLoading, canSubmit, showNotification, t])

  const counts = useMemo(() => {
    const map = new Map<FeedbackStatus, number>()
    for (const item of items) map.set(item.status, (map.get(item.status) || 0) + 1)
    return map
  }, [items])

  const visible = useMemo(
    () => (statusFilter === 'all' ? items : items.filter((i) => i.status === statusFilter)),
    [items, statusFilter]
  )

  const applyUpdate = (updated: Feedback) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    setSelected(updated)
  }

  const applyDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    setSelected(null)
  }

  if (accessLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  if (!canSubmit) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="inline-flex p-3 rounded-xl bg-red-100 text-red-600 mb-4">
          <ShieldExclamationIcon className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('accessDenied')}</h2>
        <p className="text-sm text-gray-500">{t('accessDeniedHint')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
          <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">{t('myFeedback')}</h1>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-amber-100 border-amber-400 text-amber-800'
                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            {t('allStatuses')} ({items.length})
          </button>
          {FEEDBACK_STATUSES.filter((s) => (counts.get(s) || 0) > 0).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'bg-amber-100 border-amber-400 text-amber-800'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {t(feedbackStatusKey(s))} ({counts.get(s)})
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-300 rounded-xl">
          <p className="text-gray-700 font-medium mb-1">{t('empty')}</p>
          <p className="text-sm text-gray-500">{t('emptyHint')}</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-10">{t('emptyFiltered')}</p>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-gray-900 break-words">{item.title}</p>
                <FeedbackStatusBadge status={item.status} className="shrink-0" />
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2 break-words">
                {item.description}
              </p>
              <div className="flex items-center flex-wrap gap-2 mt-3">
                {item.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: `${tag.colorHex}1A`, color: tag.colorHex }}
                  >
                    {tag.name}
                  </span>
                ))}
                {item.images.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <PhotoIcon className="w-3.5 h-3.5" />
                    {item.images.length}
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {formatFeedbackAge(item.createdAt)}
                </span>
              </div>
              {item.pagePath && (
                <p className="text-xs text-gray-400 font-mono mt-2 truncate">{item.pagePath}</p>
              )}
            </button>
          ))}
        </div>
      )}

      <FeedbackDetailModal
        isOpen={Boolean(selected)}
        feedback={selected}
        isAdmin={isAdmin}
        onClose={() => setSelected(null)}
        onUpdated={applyUpdate}
        onDeleted={applyDelete}
      />
    </div>
  )
}

export default MyFeedbackView
