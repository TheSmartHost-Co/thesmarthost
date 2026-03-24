'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CameraIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  CheckCircleIcon,
  MagnifyingGlassPlusIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import type { WalkthroughStatus } from '@/services/types/cleaningProject'

interface WalkthroughContentProps {
  projectId: string
  walkthroughStatus: WalkthroughStatus | null
  loading: boolean
  onPhotoUpload: (roomName: string, files: File[]) => void
  onPhotoDelete: (photoId: string) => void
  onViewPhoto: (url: string) => void
  uploadingRooms: Set<string>
  hasChecklist: boolean
}

export default function WalkthroughContent({
  projectId,
  walkthroughStatus,
  loading,
  onPhotoUpload,
  onPhotoDelete,
  onViewPhoto,
  uploadingRooms,
  hasChecklist,
}: WalkthroughContentProps) {
  if (!hasChecklist) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <CameraIcon className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">No checklist assigned</p>
        <p className="text-xs text-gray-400 mt-1">
          A checklist must be assigned to enable walkthrough photos
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!walkthroughStatus) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <CameraIcon className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Could not load walkthrough status</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {!walkthroughStatus.requiresWalkthrough && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Walkthrough photos are optional for this project, but you can still upload them.
          </p>
        </div>
      )}

      {walkthroughStatus.rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CameraIcon className="w-10 h-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No rooms configured for walkthrough</p>
        </div>
      ) : (
        walkthroughStatus.rooms.map(room => (
          <RoomCard
            key={room.roomName}
            roomName={room.roomName}
            photos={room.photos}
            hasPhotos={room.hasPhotos}
            isUploading={uploadingRooms.has(room.roomName)}
            onPhotoUpload={(files) => onPhotoUpload(room.roomName, files)}
            onPhotoDelete={onPhotoDelete}
            onViewPhoto={onViewPhoto}
          />
        ))
      )}
    </div>
  )
}

interface RoomCardProps {
  roomName: string
  photos: WalkthroughStatus['rooms'][0]['photos']
  hasPhotos: boolean
  isUploading: boolean
  onPhotoUpload: (files: File[]) => void
  onPhotoDelete: (photoId: string) => void
  onViewPhoto: (url: string) => void
}

function RoomCard({
  roomName,
  photos,
  hasPhotos,
  isUploading,
  onPhotoUpload,
  onPhotoDelete,
  onViewPhoto,
}: RoomCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
  const MAX_FILE_SIZE = 20 * 1024 * 1024

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
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const validFiles: File[] = []
    for (let i = 0; i < Math.min(fileList.length, 10); i++) {
      const file = fileList[i]
      if (!ALLOWED_TYPES.includes(file.type)) continue
      if (file.size > MAX_FILE_SIZE) continue
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      onPhotoUpload(validFiles)
    }

    // Reset the input so the same file(s) can be selected again
    e.target.value = ''
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {hasPhotos ? (
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
          )}
          <span className="text-sm font-medium text-gray-900">{roomName}</span>
          <span className="text-xs text-gray-400">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Upload button */}
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
                Add Photos
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

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFileChange} className="hidden" />
          <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/heic" multiple onChange={handleFileChange} className="hidden" />
        </div>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="p-3 grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.photoUrl}
                alt={`${roomName} walkthrough`}
                className="aspect-square rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity border border-gray-200"
                onClick={() => onViewPhoto(photo.photoUrl)}
              />
              <div
                className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => onViewPhoto(photo.photoUrl)}
              >
                <MagnifyingGlassPlusIcon className="w-5 h-5 text-white" />
              </div>
              <button
                onClick={() => onPhotoDelete(photo.id)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
