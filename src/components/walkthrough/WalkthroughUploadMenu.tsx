'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CameraIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'

export const ALLOWED_PHOTO_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]
export const MAX_PHOTO_SIZE = 20 * 1024 * 1024
export const MAX_PHOTOS_PER_UPLOAD = 10

interface WalkthroughUploadMenuProps {
  onSelect: (files: File[]) => void
  isUploading: boolean
  disabled?: boolean
  // Visual size + color of the button
  variant?: 'primary' | 'secondary'
  label?: string
}

/**
 * Dropdown upload menu for walkthrough photos. Offers three input methods:
 *   - Take Photo (camera, rear-facing via `capture="environment"`)
 *   - Choose Photos (gallery picker)
 *   - Upload Files (file browser with explicit accept list)
 *
 * Client-side validates file type and size; silently drops invalid files and
 * caps at MAX_PHOTOS_PER_UPLOAD. Accepts HEIC — the backend converts to JPEG.
 */
export default function WalkthroughUploadMenu({
  onSelect,
  isUploading,
  disabled = false,
  variant = 'primary',
  label = 'Add Photos',
}: WalkthroughUploadMenuProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openDropdown = () => {
    if (isUploading || disabled) return
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setIsDropdownOpen(prev => !prev)
  }

  useEffect(() => {
    if (!isDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isDropdownOpen])

  const handleOptionSelect = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    setIsDropdownOpen(false)
    setTimeout(() => inputRef.current?.click(), 50)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const validFiles: File[] = []
    for (let i = 0; i < Math.min(fileList.length, MAX_PHOTOS_PER_UPLOAD); i++) {
      const file = fileList[i]
      // Some browsers return empty mime type for HEIC — fall back to extension check
      const isAllowedType =
        ALLOWED_PHOTO_TYPES.includes(file.type) ||
        /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name)
      if (!isAllowedType) continue
      if (file.size > MAX_PHOTO_SIZE) continue
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      onSelect(validFiles)
    }

    // Reset the input so the same file(s) can be selected again
    e.target.value = ''
  }

  const buttonClasses =
    variant === 'primary'
      ? isUploading || disabled
        ? 'bg-gray-100 text-gray-400'
        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
      : isUploading || disabled
        ? 'bg-gray-50 text-gray-400 border border-gray-200'
        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        disabled={isUploading || disabled}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${buttonClasses}`}
      >
        {isUploading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <CameraIcon className="w-3.5 h-3.5" />
            {label}
          </>
        )}
      </button>

      {isDropdownOpen && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
            className="z-[9999] w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 origin-top-right"
          >
            <button
              type="button"
              onClick={() => handleOptionSelect(cameraInputRef)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
            >
              <CameraIcon className="w-4 h-4" />
              Take Photo
            </button>
            <button
              type="button"
              onClick={() => handleOptionSelect(galleryInputRef)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
            >
              <PhotoIcon className="w-4 h-4" />
              Choose Photos
            </button>
            <button
              type="button"
              onClick={() => handleOptionSelect(fileInputRef)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Upload Files
            </button>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
