'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import { createPatchNote, uploadPatchNoteImage } from '@/services/patchNoteService'
import { useNotificationStore } from '@/store/useNotificationStore'
import ImageDropzone, {
  IMAGE_TYPES,
  type ImageDropzoneRejection,
} from '@/components/shared/ImageDropzone'

interface CreatePatchNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

const ALL_ROLES = [
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'team_member', label: 'Team Member' },
  { value: 'client', label: 'Client' },
  { value: 'cleaner', label: 'Cleaner' },
]

const CONTENT_PLACEHOLDER = `## What's New

- **Feature Name** - Brief description of what was added

## Improvements

- Improved performance of dashboard loading
- Updated styling for mobile views

## Bug Fixes

- Fixed an issue where reports would not generate correctly`

const CreatePatchNoteModal: React.FC<CreatePatchNoteModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('')
  const [version, setVersion] = useState('')
  const [content, setContent] = useState('')
  const [targetRoles, setTargetRoles] = useState<string[]>(['property_manager'])
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { t } = useTranslation('common')
  const showNotification = useNotificationStore((state) => state.showNotification)

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setVersion('')
      setContent('')
      setTargetRoles(['property_manager'])
      setPendingImages([])
    }
  }, [isOpen])

  // Preview lifecycle, the 5-image cap and per-file validation now live in
  // ImageDropzone. Limits mirror routes/patch-notes.routes.js (5MB, no HEIC) —
  // previously nothing was validated client-side despite the copy saying so,
  // so oversized or HEIC files only failed at the server.
  const toggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const handleRejected = (rejections: ImageDropzoneRejection[]) => {
    for (const { file, reason } of rejections) {
      const message =
        reason === 'type'
          ? `${file.name}: unsupported format`
          : reason === 'size'
            ? `${file.name} is larger than 5MB`
            : 'Maximum 5 screenshots'
      showNotification(message, 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showNotification('Title is required', 'error')
      return
    }

    if (!content.trim()) {
      showNotification('Content is required', 'error')
      return
    }

    if (targetRoles.length === 0) {
      showNotification('Select at least one target role', 'error')
      return
    }

    setSubmitting(true)
    try {
      // Step 1: Create the note
      const res = await createPatchNote({
        title: title.trim(),
        content: content.trim(),
        version: version.trim() || undefined,
        targetRoles,
      })

      if (res.status !== 'success') {
        showNotification(res.message || 'Failed to create patch note', 'error')
        return
      }

      // Step 2: Upload images to the created note
      if (pendingImages.length > 0) {
        let uploadFailed = false
        for (const img of pendingImages) {
          try {
            await uploadPatchNoteImage(res.data.id, img)
          } catch {
            uploadFailed = true
          }
        }
        if (uploadFailed) {
          showNotification('Note created but some images failed to upload', 'info')
        } else {
          showNotification('Patch note created with images', 'success')
        }
      } else {
        showNotification('Patch note created successfully', 'success')
      }

      onCreated()
    } catch (err) {
      console.error('Error creating patch note:', err)
      showNotification(
        err instanceof Error ? err.message : 'Error creating patch note',
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-lg w-11/12 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {t('createPatchNote')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5 text-black">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('patchNoteTitle')} *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. January 2026 Updates"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Version */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('patchNoteVersion')}</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g. v2.5"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Target Roles */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('targetRoles')} *
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((role) => {
              const isSelected = targetRoles.includes(role.value)
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleRole(role.value)}
                  className={`cursor-pointer px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-amber-100 border-amber-400 text-amber-800'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {role.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('patchNoteContent')} *</label>
          <p className="text-xs text-gray-500 mb-1">
            {t('supportsMarkdown')}
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder={CONTENT_PLACEHOLDER}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('screenshots')}</label>
          <p className="text-xs text-gray-500 mb-2">{t('screenshotLimits')}</p>

          <ImageDropzone
            files={pendingImages}
            onChange={setPendingImages}
            maxFiles={5}
            maxSizeBytes={5 * 1024 * 1024}
            accept={IMAGE_TYPES}
            onRejected={handleRejected}
            disabled={submitting}
            variant="button"
            browseLabel={t('addScreenshots')}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer px-4 py-2 text-white rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? t('creating') : t('createNote')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreatePatchNoteModal
