'use client'

import React, { useState, useEffect, useRef } from 'react'
import Modal from '@/components/shared/modal'
import { createPatchNote, uploadPatchNoteImage } from '@/services/patchNoteService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'

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

interface PendingImage {
  file: File
  preview: string
}

const CreatePatchNoteModal: React.FC<CreatePatchNoteModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('')
  const [version, setVersion] = useState('')
  const [content, setContent] = useState('')
  const [targetRoles, setTargetRoles] = useState<string[]>(['property_manager'])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingImages.forEach(img => URL.revokeObjectURL(img.preview))
    }
  }, [pendingImages])

  const toggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: PendingImage[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setPendingImages(prev => [...prev, ...newImages].slice(0, 5))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    setPendingImages(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
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
            await uploadPatchNoteImage(res.data.id, img.file)
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
        Create Patch Note
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
            placeholder={CONTENT_PLACEHOLDER}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium mb-1">Screenshots</label>
          <p className="text-xs text-gray-500 mb-2">Up to 5 images (JPG, PNG, GIF, WEBP). Max 5MB each.</p>

          {/* Image previews */}
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {pendingImages.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-amber-400 hover:text-amber-700 transition-colors"
            >
              <PhotoIcon className="w-4 h-4" />
              Add Screenshots
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={handleAddImages}
            className="hidden"
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer px-4 py-2 text-white rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Note'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreatePatchNoteModal
