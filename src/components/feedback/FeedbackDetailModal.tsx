'use client'

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrashIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import FeedbackStatusBadge, { feedbackStatusKey } from './FeedbackStatusBadge'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  deleteFeedback,
  formatFeedbackAge,
  updateFeedback,
  updateFeedbackStatus,
} from '@/services/feedbackService'
import {
  FEEDBACK_STATUSES,
  type Feedback,
  type FeedbackStatus,
} from '@/services/types/feedback'

interface FeedbackDetailModalProps {
  isOpen: boolean
  feedback: Feedback | null
  /** True when the viewer can triage (admin). Drives status + notes controls. */
  isAdmin: boolean
  onClose: () => void
  onUpdated: (feedback: Feedback) => void
  onDeleted: (id: string) => void
}

const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({
  isOpen,
  feedback,
  isAdmin,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const { t } = useTranslation('feedback')
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<FeedbackStatus>('open')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !feedback) return
    setEditing(false)
    setTitle(feedback.title)
    setDescription(feedback.description)
    setStatus(feedback.status)
    setAdminNotes(feedback.adminNotes || '')
    setConfirmDelete(false)
    setLightbox(null)
  }, [isOpen, feedback])

  if (!feedback) return null

  // Authors may revise only while untriaged; admins always. Mirrors the
  // server-side rule in controllers/feedback.controller.js.
  const canEdit = isAdmin || feedback.status === 'open'

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      showNotification(t(!title.trim() ? 'titleRequired' : 'descriptionRequired'), 'error')
      return
    }

    setSaving(true)
    try {
      const res = await updateFeedback(feedback.id, {
        title: title.trim(),
        description: description.trim(),
      })
      if (res.status === 'success') {
        showNotification(t('updated'), 'success')
        onUpdated(res.data)
        setEditing(false)
      } else {
        showNotification(res.message || t('updateFailed'), 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : t('updateFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTriage = async () => {
    setSaving(true)
    try {
      const res = await updateFeedbackStatus(feedback.id, status, adminNotes.trim() || null)
      if (res.status === 'success') {
        showNotification(t('statusUpdated'), 'success')
        onUpdated(res.data)
      } else {
        showNotification(res.message || t('updateFailed'), 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : t('updateFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      const res = await deleteFeedback(feedback.id)
      if (res.status === 'success') {
        showNotification(t('deleted'), 'success')
        onDeleted(feedback.id)
        onClose()
      } else {
        showNotification(res.message || t('deleteFailed'), 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : t('deleteFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} style="max-w-2xl w-11/12 p-6" closable={!saving}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900 break-words">{feedback.title}</h2>
            )}
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <FeedbackStatusBadge status={feedback.status} />
              {feedback.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: `${tag.colorHex}1A`, color: tag.colorHex }}
                >
                  {tag.name}
                </span>
              ))}
              <span className="text-xs text-gray-400">
                {formatFeedbackAge(feedback.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {feedback.authorName && (
          <p className="text-xs text-gray-500 mb-3">
            {t('submittedBy')} <span className="font-medium">{feedback.authorName}</span>
            {feedback.authorRole && <span className="text-gray-400"> · {feedback.authorRole}</span>}
          </p>
        )}

        <div className="mb-4">
          {editing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
              {feedback.description}
            </p>
          )}
        </div>

        {feedback.pagePath && (
          <p className="text-xs text-gray-400 mb-4">
            {t('pageReported')} <span className="font-mono">{feedback.pagePath}</span>
          </p>
        )}

        {feedback.images.length > 0 && (
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">{t('attachments')}</p>
            <div className="flex flex-wrap gap-2">
              {feedback.images.map((image) => (
                <button
                  key={image.path}
                  type="button"
                  onClick={() => image.url && setLightbox(image.url)}
                  className="cursor-pointer"
                  aria-label={t('viewImage')}
                >
                  {/* The signed URL comes from the API — the bucket is private,
                      so a URL is never constructed client-side. */}
                  {image.url ? (
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400 px-2 text-center">
                      {image.name}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('changeStatus')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {FEEDBACK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(feedbackStatusKey(s))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('adminNotes')}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder={t('adminNotesPlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={handleTriage}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t">
          <div className="flex gap-2">
            {canEdit && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {t('edit')}
              </button>
            )}
            {editing && (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? t('saving') : t('save')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                aria-label={t('delete')}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </Modal>

      {/* Confirm before destroying anything. */}
      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} style="max-w-sm w-11/12 p-6">
        <p className="text-sm text-gray-700 mb-5">{t('deleteConfirm')}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 cursor-pointer disabled:opacity-50"
          >
            {t('delete')}
          </button>
        </div>
      </Modal>

      {lightbox && (
        <Modal isOpen onClose={() => setLightbox(null)} style="max-w-4xl w-11/12 p-2">
          <img src={lightbox} alt="" className="w-full h-auto rounded-lg" />
        </Modal>
      )}
    </>
  )
}

export default FeedbackDetailModal
