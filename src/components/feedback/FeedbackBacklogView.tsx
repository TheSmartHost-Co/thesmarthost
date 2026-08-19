'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  InboxStackIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import FeedbackStatusBadge, { feedbackStatusKey } from './FeedbackStatusBadge'
import FeedbackDetailModal from './FeedbackDetailModal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useFeedbackAccess } from '@/hooks/useFeedbackAccess'
import {
  collectFeedbackTags,
  formatFeedbackAge,
  getFeedbackBacklog,
} from '@/services/feedbackService'
import {
  FEEDBACK_STATUSES,
  type Feedback,
  type FeedbackStatus,
} from '@/services/types/feedback'

/**
 * FEEDBACK-001 — admin triage backlog.
 *
 * Grouped list rather than a drag-and-drop kanban for v1: triage volume is a
 * handful of cards and status changes go through the detail modal. Filtering is
 * client-side because the whole backlog arrives in one request.
 */
const FeedbackBacklogView: React.FC = () => {
  const { t } = useTranslation('feedback')
  const showNotification = useNotificationStore((state) => state.showNotification)
  const { isAdmin, loading: accessLoading } = useFeedbackAccess()

  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<Feedback | null>(null)

  useEffect(() => {
    if (accessLoading || !isAdmin) {
      if (!accessLoading) setLoading(false)
      return
    }

    let active = true
    getFeedbackBacklog()
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
  }, [accessLoading, isAdmin, showNotification, t])

  const allTags = useMemo(() => collectFeedbackTags(items), [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (tagFilter && !item.tags.some((tag) => tag.id === tagFilter)) return false
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.authorName || '').toLowerCase().includes(q)
      )
    })
  }, [items, search, tagFilter])

  /** One group per status, in board order, empty groups omitted. */
  const grouped = useMemo(
    () =>
      FEEDBACK_STATUSES.map((status) => ({
        status,
        items: filtered.filter((item) => item.status === status),
      })).filter((group) => group.items.length > 0),
    [filtered]
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

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="inline-flex p-3 rounded-xl bg-red-100 text-red-600 mb-4">
          <ShieldExclamationIcon className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('accessDenied')}</h2>
        <p className="text-sm text-gray-500">{t('adminOnly')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
          <InboxStackIcon className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">{t('feedbackBacklog')}</h1>
        <span className="text-sm text-gray-400">({items.length})</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              tagFilter === null
                ? 'bg-amber-100 border-amber-400 text-amber-800'
                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            {t('allStatuses')}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer"
              style={
                tagFilter === tag.id
                  ? { backgroundColor: `${tag.colorHex}26`, borderColor: tag.colorHex, color: tag.colorHex }
                  : { borderColor: '#D1D5DB', color: tag.colorHex }
              }
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-300 rounded-xl">
          <p className="text-gray-700 font-medium">{t('emptyBacklog')}</p>
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-10">{t('emptyFiltered')}</p>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.status}>
              <div className="flex items-center gap-2 mb-2">
                <FeedbackStatusBadge status={group.status} />
                <span className="text-xs text-gray-400">{group.items.length}</span>
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-gray-900 break-words">{item.title}</p>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatFeedbackAge(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2 break-words">
                      {item.description}
                    </p>
                    <div className="flex items-center flex-wrap gap-2 mt-3">
                      {item.authorName && (
                        <span className="text-xs text-gray-500">
                          {item.authorName}
                          {item.authorRole && (
                            <span className="text-gray-400"> · {item.authorRole}</span>
                          )}
                        </span>
                      )}
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
                    </div>
                    {item.pagePath && (
                      <p className="text-xs text-gray-400 font-mono mt-2 truncate">
                        {item.pagePath}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <FeedbackDetailModal
        isOpen={Boolean(selected)}
        feedback={selected}
        isAdmin
        onClose={() => setSelected(null)}
        onUpdated={applyUpdate}
        onDeleted={applyDelete}
      />
    </div>
  )
}

export default FeedbackBacklogView
