'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CloudArrowUpIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'

/**
 * Shared image picker: drag-and-drop or browse, with thumbnails and per-file
 * validation.
 *
 * Extracted because several create-modals each had their own copy of this, and
 * the copies had drifted in ways that mattered:
 *  - ReportIssueModal computed a 5-file cap but never applied it, so one
 *    multi-select of 9 files sailed past the client and died at multer.
 *  - ReportIssueModal also called URL.createObjectURL() inline in JSX with no
 *    revoke, minting a fresh blob per photo on every keystroke-triggered
 *    re-render.
 *
 * Both are structurally impossible here: the cap is applied on every add path,
 * and object URLs are owned by this component and revoked on removal and on
 * unmount.
 *
 * Deliberately i18n-free — all user-facing copy arrives via props, so this
 * works under the `turnover`, `common` and `feedback` namespaces alike.
 */

export type ImageDropzoneAccent = 'amber' | 'blue' | 'purple'
export type ImageDropzoneRejectReason = 'type' | 'size' | 'count'

export interface ImageDropzoneRejection {
  file: File
  reason: ImageDropzoneRejectReason
}

export interface ImageDropzoneExistingImage {
  /** Stable identity — a storage path, an id, or a stringified index. */
  id: string
  /** Already-resolved URL (signed or public). */
  url: string
  name?: string
}

export interface ImageDropzoneProps {
  /** Controlled list of newly-selected files. */
  files: File[]
  onChange: (files: File[]) => void

  /** Hard cap across existing + pending. Enforced, not advisory. */
  maxFiles?: number
  maxSizeBytes?: number
  accept?: string[]

  /** Already-uploaded images, rendered before the pending ones. */
  existingImages?: ImageDropzoneExistingImage[]
  /** Omit to render existing images as non-removable. */
  onRemoveExisting?: (image: ImageDropzoneExistingImage) => void

  /** Everything filtered out, so the caller can toast in its own namespace. */
  onRejected?: (rejections: ImageDropzoneRejection[]) => void

  disabled?: boolean
  label?: string
  helperText?: string
  browseLabel?: string
  promptText?: string
  /** 'dropzone' = full drag-and-drop panel, 'button' = compact add button. */
  variant?: 'dropzone' | 'button'
  accent?: ImageDropzoneAccent
  className?: string
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const IMAGE_TYPES_WITH_HEIC = [...IMAGE_TYPES, 'image/heic', 'image/heif']

const ACCENT: Record<ImageDropzoneAccent, { drag: string; text: string; icon: string }> = {
  amber: { drag: 'border-amber-400 bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
  blue: { drag: 'border-blue-400 bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' },
  purple: { drag: 'border-purple-400 bg-purple-50', text: 'text-purple-600', icon: 'text-purple-500' },
}

const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  files,
  onChange,
  maxFiles = 5,
  maxSizeBytes = 20 * 1024 * 1024,
  accept = IMAGE_TYPES_WITH_HEIC,
  existingImages = [],
  onRemoveExisting,
  onRejected,
  disabled = false,
  label,
  helperText,
  browseLabel = 'browse',
  promptText = 'Drag photos here or',
  variant = 'dropzone',
  accent = 'amber',
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Object URLs are keyed by File identity so a re-render reuses the existing
  // URL rather than minting a new one.
  const [previews, setPreviews] = useState<Map<File, string>>(new Map())

  useEffect(() => {
    setPreviews((prev) => {
      const next = new Map<File, string>()
      for (const file of files) {
        next.set(file, prev.get(file) ?? URL.createObjectURL(file))
      }
      // Revoke any URL whose file is no longer selected.
      for (const [file, url] of prev) {
        if (!next.has(file)) URL.revokeObjectURL(url)
      }
      return next
    })
  }, [files])

  // Revoke everything still outstanding when the component goes away.
  const previewsRef = useRef(previews)
  previewsRef.current = previews
  useEffect(() => {
    return () => {
      for (const url of previewsRef.current.values()) URL.revokeObjectURL(url)
    }
  }, [])

  const remaining = Math.max(0, maxFiles - existingImages.length - files.length)

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      if (disabled) return

      const rejections: ImageDropzoneRejection[] = []
      const accepted: File[] = []

      for (const file of Array.from(incoming)) {
        if (!accept.includes(file.type)) {
          rejections.push({ file, reason: 'type' })
          continue
        }
        if (file.size > maxSizeBytes) {
          rejections.push({ file, reason: 'size' })
          continue
        }
        accepted.push(file)
      }

      // The cap is applied here, on every path into the component — this is
      // the fix for the silently-ignored limit in the old copies.
      const withinCap = accepted.slice(0, remaining)
      for (const file of accepted.slice(remaining)) {
        rejections.push({ file, reason: 'count' })
      }

      if (rejections.length > 0) onRejected?.(rejections)
      if (withinCap.length > 0) onChange([...files, ...withinCap])
    },
    [accept, disabled, files, maxSizeBytes, onChange, onRejected, remaining]
  )

  const removeFile = (target: File) => {
    onChange(files.filter((f) => f !== target))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    // Reset so re-picking the same file still fires a change event.
    e.target.value = ''
  }

  // Derived from the prop so the native picker and the JS check can't drift.
  const acceptAttr = useMemo(() => accept.join(','), [accept])
  const tone = ACCENT[accent]
  const isFull = remaining === 0

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      accept={acceptAttr}
      multiple={maxFiles > 1}
      disabled={disabled}
      onChange={handleInputChange}
    />
  )

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      )}

      {(existingImages.length > 0 || files.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {existingImages.map((image) => (
            <div key={image.id} className="relative group">
              <img
                src={image.url}
                alt={image.name || 'Attachment'}
                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
              />
              {onRemoveExisting && !disabled && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(image)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Remove image"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {files.map((file, index) => {
            const preview = previews.get(file)
            return (
              <div key={`${file.name}-${file.size}-${index}`} className="relative group">
                {preview && (
                  <img
                    src={preview}
                    alt={file.name}
                    /* Dashed ring marks not-yet-uploaded files apart from
                       existing ones, matching updatePatchNoteModal. */
                    className={`w-20 h-20 object-cover rounded-lg border ${
                      existingImages.length > 0 ? 'border-dashed border-amber-300' : 'border-gray-200'
                    }`}
                  />
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeFile(file)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label="Remove image"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!isFull && variant === 'button' && (
        <label
          className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer hover:border-amber-400 hover:${tone.text}`
          }`}
        >
          <PhotoIcon className="w-4 h-4" />
          {browseLabel}
          {hiddenInput}
        </label>
      )}

      {!isFull && variant === 'dropzone' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled) setIsDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragOver(false)
          }}
          className={`
            border-2 border-dashed rounded-xl p-6 text-center transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isDragOver ? tone.drag : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <div className="flex flex-col items-center gap-2">
            {isDragOver ? (
              <PhotoIcon className={`w-10 h-10 ${tone.icon}`} />
            ) : (
              <CloudArrowUpIcon className="w-10 h-10 text-gray-400" />
            )}
            <p className="text-sm text-gray-600">
              {promptText}{' '}
              <label
                className={`font-medium ${tone.text} ${
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:underline'
                }`}
              >
                {browseLabel}
                {hiddenInput}
              </label>
            </p>
            {helperText && <p className="text-xs text-gray-400">{helperText}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageDropzone
