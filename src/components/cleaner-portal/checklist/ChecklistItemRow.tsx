'use client'

import { useState, useRef, useEffect } from 'react'
import {
  CheckCircleIcon,
  CameraIcon,
  TrashIcon,
  MagnifyingGlassPlusIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import type { ProjectChecklistItem } from '@/services/types/cleaningProject'

interface ChecklistItemRowProps {
  item: ProjectChecklistItem
  onToggle: () => void
  onUploadPhoto: (file: File) => void
  onDeletePhoto: () => void
  onViewPhoto: (url: string) => void
  isUploading: boolean
  isToggling: boolean
  readOnly?: boolean
}

export default function ChecklistItemRow({
  item,
  onToggle,
  onUploadPhoto,
  onDeletePhoto,
  onViewPhoto,
  isUploading,
  isToggling,
  readOnly,
}: ChecklistItemRowProps) {
  const [imageError, setImageError] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openDropdown = () => {
    if (isUploading) return
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
    const file = e.target.files?.[0]
    if (file) {
      onUploadPhoto(file)
    }
  }

  const canToggle = !readOnly && !isToggling

  return (
    <div className={`
      flex items-start gap-0 border-b border-gray-50 last:border-b-0
      ${item.isCompleted ? 'bg-green-50/50' : ''}
    `}>
      {/* Zone A: Tappable area — toggles checkbox */}
      <div
        onClick={canToggle ? onToggle : undefined}
        className={`
          flex-1 min-w-0 flex items-start gap-3 p-4
          ${canToggle ? 'cursor-pointer active:bg-gray-100' : ''}
          ${canToggle && item.isCompleted ? 'active:bg-green-100' : ''}
        `}
      >
        {/* Checkbox visual */}
        <div className={`
          flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all
          ${item.isCompleted
            ? 'bg-green-500 border-green-500 text-white'
            : readOnly ? 'border-gray-200' : 'border-gray-300'
          }
          ${isToggling ? 'opacity-50' : ''}
          ${readOnly && !item.isCompleted ? 'opacity-50' : ''}
        `}>
          {isToggling ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : item.isCompleted ? (
            <CheckCircleIcon className="w-4 h-4" />
          ) : null}
        </div>

        {/* Task description */}
        <p className={`text-sm pt-1 ${item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
          {item.taskDescription}
        </p>
      </div>

      {/* Zone B: Photo area — does NOT toggle */}
      {item.requiresPhoto && (
        <div className="flex-shrink-0 p-4 pl-0" onClick={(e) => e.stopPropagation()}>
          {item.photoUrl ? (
            <div className="inline-flex flex-col gap-1">
              <div className="relative inline-flex items-end gap-2">
                <div className="relative group">
                  {imageError ? (
                    <div className="w-20 h-20 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-400">
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      <span className="text-[10px] mt-0.5">Failed</span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={item.photoUrl}
                        alt="Uploaded photo"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => onViewPhoto(item.photoUrl!)}
                        onError={() => setImageError(true)}
                      />
                      <div
                        className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        onClick={() => onViewPhoto(item.photoUrl!)}
                      >
                        <MagnifyingGlassPlusIcon className="w-6 h-6 text-white" />
                      </div>
                    </>
                  )}
                </div>
                {!readOnly && (
                  <button
                    onClick={onDeletePhoto}
                    disabled={isUploading}
                    className="p-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
                    title="Delete photo"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              {(item.photoTakenAt || item.photoUploadedAt) && (
                <span className="text-xs text-gray-500">
                  {item.photoTakenAt
                    ? `Taken ${new Date(item.photoTakenAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                    : `Uploaded ${new Date(item.photoUploadedAt!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                  }
                </span>
              )}
            </div>
          ) : readOnly ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-400">
              <CameraIcon className="w-3.5 h-3.5" />
              Photo Required
            </span>
          ) : (
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                onClick={openDropdown}
                disabled={isUploading}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer
                  ${isUploading
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }
                `}
              >
                {isUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CameraIcon className="w-3.5 h-3.5" />
                    Add Photo
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
                      Choose Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect(fileInputRef)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
                    >
                      <ArrowUpTrayIcon className="w-4 h-4" />
                      Upload File
                    </button>
                  </motion.div>
                </AnimatePresence>,
                document.body
              )}

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
              <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/heic" onChange={handleFileChange} className="hidden" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
