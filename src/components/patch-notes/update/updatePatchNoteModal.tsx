'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import { updatePatchNote, uploadPatchNoteImage } from '@/services/patchNoteService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { PatchNote, PatchNoteImage } from '@/services/types/patchNote'
import ImageDropzone, {
  IMAGE_TYPES,
  type ImageDropzoneRejection,
} from '@/components/shared/ImageDropzone'

interface UpdatePatchNoteModalProps {
  isOpen: boolean
  note: PatchNote
  onClose: () => void
  onUpdated: () => void
}

const ALL_ROLES = [
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'team_member', label: 'Team Member' },
  { value: 'client', label: 'Client' },
  { value: 'cleaner', label: 'Cleaner' },
]

const UpdatePatchNoteModal: React.FC<UpdatePatchNoteModalProps> = ({
  isOpen,
  note,
  onClose,
  onUpdated,
}) => {
  const [title, setTitle] = useState('')
  const [version, setVersion] = useState('')
  const [content, setContent] = useState('')
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<PatchNoteImage[]>([])
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { t } = useTranslation('common')
  const showNotification = useNotificationStore((state) => state.showNotification)

  useEffect(() => {
    if (isOpen && note) {
      setTitle(note.title)
      setVersion(note.version || '')
      setContent(note.content)
      setTargetRoles([...note.targetRoles])
      setExistingImages(note.images || [])
      setPendingImages([])
    }
  }, [isOpen, note])

  const toggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  // ImageDropzone owns previews, validation and the combined cap: it counts
  // existingImages + pending against maxFiles, so the old manual
  // `5 - existingImages.length` arithmetic is no longer needed.
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
      // Step 1: Update text fields + existing images (removed images won't be included)
      const res = await updatePatchNote(note.id, {
        title: title.trim(),
        content: content.trim(),
        version: version.trim() || undefined,
        targetRoles,
        images: existingImages,
      })

      if (res.status !== 'success') {
        showNotification(res.message || 'Failed to update patch note', 'error')
        return
      }

      // Step 2: Upload new images
      if (pendingImages.length > 0) {
        let uploadFailed = false
        for (const img of pendingImages) {
          try {
            await uploadPatchNoteImage(note.id, img)
          } catch {
            uploadFailed = true
          }
        }
        if (uploadFailed) {
          showNotification('Note updated but some images failed to upload', 'info')
        } else {
          showNotification('Patch note updated with images', 'success')
        }
      } else {
        showNotification('Patch note updated successfully', 'success')
      }

      onUpdated()
    } catch (err) {
      console.error('Error updating patch note:', err)
      showNotification(
        err instanceof Error ? err.message : 'Error updating patch note',
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-lg w-11/12 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {t('editPatchNote')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5 text-black">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
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
          <label className="block text-sm font-medium mb-1">Version</label>
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
            Target Roles *
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
          <label className="block text-sm font-medium mb-1">Content *</label>
          <p className="text-xs text-gray-500 mb-1">
            Supports Markdown formatting
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium mb-1">Screenshots</label>
          <p className="text-xs text-gray-500 mb-2">Up to 5 images (JPG, PNG, GIF, WEBP). Max 5MB each.</p>

          <ImageDropzone
            files={pendingImages}
            onChange={setPendingImages}
            maxFiles={5}
            maxSizeBytes={5 * 1024 * 1024}
            accept={IMAGE_TYPES}
            onRejected={handleRejected}
            disabled={submitting}
            variant="button"
            browseLabel="Add Screenshots"
            existingImages={existingImages.map((img, i) => ({
              id: String(i),
              // patch-note-images is a PUBLIC bucket, so the URL is built here
              // and passed in already resolved.
              url: `${supabaseUrl}/storage/v1/object/public/patch-note-images/${img.url}`,
              name: img.caption,
            }))}
            onRemoveExisting={(image) =>
              setExistingImages((prev) => prev.filter((_, i) => String(i) !== image.id))
            }
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
            {submitting ? t('saving') : t('saveChanges')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UpdatePatchNoteModal
