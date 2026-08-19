'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import ImageDropzone, {
  IMAGE_TYPES_WITH_HEIC,
  type ImageDropzoneRejection,
} from '@/components/shared/ImageDropzone'
import FeedbackTagInput, { type FeedbackTagSelection } from './FeedbackTagInput'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  createFeedback,
  getFeedbackTags,
  uploadFeedbackImages,
} from '@/services/feedbackService'
import type { Feedback, FeedbackTag } from '@/services/types/feedback'

interface CreateFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (feedback: Feedback) => void
}

const EMPTY_TAGS: FeedbackTagSelection = { tagIds: [], newTags: [] }

const CreateFeedbackModal: React.FC<CreateFeedbackModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<FeedbackTagSelection>(EMPTY_TAGS)
  const [files, setFiles] = useState<File[]>([])
  const [available, setAvailable] = useState<FeedbackTag[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { t } = useTranslation('feedback')
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Read at submit time, not on open: if the user opens this and then navigates,
  // the page they were on when they submitted is the useful one.
  const pathname = usePathname()

  useEffect(() => {
    if (!isOpen) return

    setTitle('')
    setDescription('')
    setTags(EMPTY_TAGS)
    setFiles([])
    setSubmitting(false)

    getFeedbackTags()
      .then((res) => {
        if (res.status === 'success') setAvailable(res.data)
      })
      .catch(() => {
        // Non-fatal: the user can still type new tags.
        showNotification(t('tagLoadFailed'), 'error')
      })
  }, [isOpen, showNotification, t])

  const handleRejected = (rejections: ImageDropzoneRejection[]) => {
    for (const { file, reason } of rejections) {
      if (reason === 'type') showNotification(t('invalidFileType', { name: file.name }), 'error')
      else if (reason === 'size') showNotification(t('fileTooLarge', { name: file.name }), 'error')
      else showNotification(t('tooManyImages'), 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showNotification(t('titleRequired'), 'error')
      return
    }
    if (!description.trim()) {
      showNotification(t('descriptionRequired'), 'error')
      return
    }

    setSubmitting(true)
    try {
      // Two-request house pattern: create as JSON, then upload files against
      // the returned id.
      const res = await createFeedback({
        title: title.trim(),
        description: description.trim(),
        pagePath: pathname || undefined,
        tagIds: tags.tagIds,
        newTags: tags.newTags,
      })

      if (res.status !== 'success') {
        showNotification(res.message || t('submitFailed'), 'error')
        return
      }

      let created = res.data

      if (files.length > 0) {
        try {
          const uploadRes = await uploadFeedbackImages(created.id, files)
          if (uploadRes.status === 'success') {
            created = uploadRes.data
          } else {
            // The feedback row exists either way — never roll it back over a
            // failed attachment.
            showNotification(t('createdImagesPartial'), 'info')
          }
        } catch {
          showNotification(t('createdImagesPartial'), 'info')
        }
      }

      showNotification(t('submitted'), 'success')
      onCreated?.(created)
      onClose()
    } catch (err) {
      console.error('Error submitting feedback:', err)
      showNotification(err instanceof Error ? err.message : t('submitFailed'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-lg w-11/12 p-6" closable={!submitting}>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
          <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{t('reportAnIssue')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-black">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('title')} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            maxLength={200}
            disabled={submitting}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('description')} *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder={t('descriptionPlaceholder')}
            disabled={submitting}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
          />
        </div>

        <FeedbackTagInput
          available={available}
          value={tags}
          onChange={setTags}
          disabled={submitting}
          label={t('tags')}
        />

        <ImageDropzone
          files={files}
          onChange={setFiles}
          maxFiles={5}
          maxSizeBytes={20 * 1024 * 1024}
          accept={IMAGE_TYPES_WITH_HEIC}
          onRejected={handleRejected}
          disabled={submitting}
          label={t('attachments')}
          helperText={t('attachmentsHint')}
          promptText={t('dragImagesHere')}
          browseLabel={t('browse')}
          accent="amber"
        />

        {/* Shown so it's clear what context is being attached. */}
        {pathname && (
          <p className="text-xs text-gray-400">
            {t('reportingFrom')} <span className="font-mono">{pathname}</span>
          </p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateFeedbackModal
