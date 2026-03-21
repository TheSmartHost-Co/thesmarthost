'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, ExclamationTriangleIcon, ArrowTopRightOnSquareIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface ImagePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  title?: string
  photoTakenAt?: string | null
  photoUploadedAt?: string | null
  onDownloadWatermarked?: () => Promise<void>
}

export default function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  photoTakenAt,
  photoUploadedAt,
  onDownloadWatermarked,
}: ImagePreviewModalProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleImageLoad = () => {
    console.log('[ImagePreview] Image loaded successfully:', imageUrl)
    setIsLoading(false)
    setImageError(false)
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('[ImagePreview] Failed to load image:', {
      url: imageUrl,
      error: e,
      naturalWidth: e.currentTarget.naturalWidth,
      naturalHeight: e.currentTarget.naturalHeight,
    })
    setIsLoading(false)
    setImageError(true)
  }

  const handleDownloadWatermarked = async () => {
    if (!onDownloadWatermarked || isDownloading) return
    setIsDownloading(true)
    try {
      await onDownloadWatermarked()
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  // Reset state when modal opens with new image
  const handleClose = () => {
    setImageError(false)
    setIsLoading(true)
    setIsDownloading(false)
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/10" onClick={handleClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-11/12 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 truncate pr-4">
            {title || 'Image Preview'}
          </h3>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container — scrollable */}
        <div className="flex-1 overflow-y-auto relative bg-gray-100 min-h-[200px] flex items-center justify-center">
          {isLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Loading image...</p>
              </div>
            </div>
          )}

          {imageError ? (
            <div className="flex flex-col items-center gap-3 p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Failed to load image</p>
                <p className="text-sm text-gray-500 mt-1">The image may have expired or been deleted</p>
              </div>
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                Try opening directly
              </a>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={title || 'Preview'}
              className={`max-w-full max-h-[70vh] object-contain ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>

        {/* Timestamps */}
        {(photoTakenAt || photoUploadedAt) && (
          <div className="flex-shrink-0 px-4 py-2 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {photoTakenAt && (
              <span>Photo taken: {new Date(photoTakenAt).toLocaleString('en-US', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })} ET</span>
            )}
            {photoUploadedAt && (
              <span>Uploaded: {new Date(photoUploadedAt).toLocaleString('en-US', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })} ET</span>
            )}
          </div>
        )}

        {/* Footer — always visible */}
        <div className={`flex-shrink-0 px-4 py-3 ${!(photoTakenAt || photoUploadedAt) ? 'border-t border-gray-100' : ''} flex items-center justify-between bg-gray-50 rounded-b-xl`}>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            {onDownloadWatermarked && (
              <button
                onClick={handleDownloadWatermarked}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDownloading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="w-4 h-4" />
                )}
                Download with Timestamp
              </button>
            )}
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              Open in new tab
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
