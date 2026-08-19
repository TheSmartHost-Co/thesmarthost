'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircleIcon,
  CameraIcon,
  TrashIcon,
  MagnifyingGlassPlusIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getTaskChecklist,
  updateTaskChecklistItem,
  uploadTaskChecklistItemPhoto,
  deleteTaskChecklistItemPhoto,
} from '@/services/maintenanceTaskService'
import type {
  MaintenanceTask,
  TaskChecklistItem,
  TaskChecklistProgress,
} from '@/services/types/maintenanceTask'

export interface TaskChecklistProps {
  task: MaintenanceTask
  readOnly?: boolean
  onProgressChange?: (progress: TaskChecklistProgress) => void
}

// A photo is needed on items flagged photoRequired that are required OR checked off
function photoIsNeeded(item: TaskChecklistItem): boolean {
  return item.photoRequired && (item.isRequired || item.isCompleted)
}

function computeProgress(items: TaskChecklistItem[]): TaskChecklistProgress {
  return {
    totalItems: items.length,
    completedItems: items.filter((i) => i.isCompleted).length,
    requiredItems: items.filter((i) => i.isRequired).length,
    requiredCompleted: items.filter((i) => i.isRequired && i.isCompleted).length,
    photosRequired: items.filter(photoIsNeeded).length,
    photosUploaded: items.filter((i) => photoIsNeeded(i) && !!i.photoUrl).length,
  }
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// ---------------------------------------------------------------------------
// Per-item row (mirrors the cleaner-portal ChecklistItemRow interaction
// pattern, with contractor-portal amber accents)
// ---------------------------------------------------------------------------

interface TaskChecklistItemRowProps {
  item: TaskChecklistItem
  onToggle: () => void
  onUploadPhoto: (file: File) => void
  onDeletePhoto: () => void
  onViewPhoto: (url: string) => void
  isUploading: boolean
  isToggling: boolean
  readOnly: boolean
  optimisticPhotoUrl?: string
}

function TaskChecklistItemRow({
  item,
  onToggle,
  onUploadPhoto,
  onDeletePhoto,
  onViewPhoto,
  isUploading,
  isToggling,
  readOnly,
  optimisticPhotoUrl,
}: TaskChecklistItemRowProps) {
  const { t } = useTranslation('contractorPortal')
  const [imageError, setImageError] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const photoMissingAndBlocking = photoIsNeeded(item) && !item.photoUrl && !optimisticPhotoUrl

  const openDropdown = () => {
    if (isUploading) return
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setIsDropdownOpen((prev) => !prev)
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
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = '' // iOS Safari caches the previous selection — reset so retaking the same photo fires onChange
        inputRef.current.click()
      }
    }, 100)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUploadPhoto(file)
    }
  }

  const canToggle = !readOnly && !isToggling
  const showPhotoZone = item.photoRequired || !!item.photoUrl || !!optimisticPhotoUrl

  return (
    <div className={`
      flex items-start gap-0 border-b border-gray-50 last:border-b-0
      ${item.isCompleted ? 'bg-amber-50/40' : ''}
    `}>
      {/* Zone A: Tappable area — toggles checkbox */}
      <div
        onClick={canToggle ? onToggle : undefined}
        className={`
          flex-1 min-w-0 flex items-start gap-3 p-3
          ${canToggle ? 'cursor-pointer active:bg-gray-100' : ''}
          ${canToggle && item.isCompleted ? 'active:bg-amber-100' : ''}
        `}
      >
        {/* Checkbox visual */}
        <div className={`
          flex-shrink-0 mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
          ${item.isCompleted
            ? 'bg-amber-500 border-amber-500 text-white'
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

        {/* Description + badges */}
        <div className="min-w-0 flex-1">
          <p className={`text-sm pt-0.5 ${item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
            {item.description}
          </p>
          {(item.isRequired || item.photoRequired) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {item.isRequired && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-md border border-amber-300 text-amber-700 bg-amber-50/50">
                  {t('requiredBadge')}
                </span>
              )}
              {item.photoRequired && (
                <span className={`
                  inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-md border
                  ${photoMissingAndBlocking
                    ? 'border-red-300 text-red-600 bg-red-50'
                    : 'border-gray-200 text-gray-500 bg-gray-50'
                  }
                `}>
                  <CameraIcon className="w-3 h-3" />
                  {t('photoRequiredBadge')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zone B: Photo area — does NOT toggle */}
      {showPhotoZone && (
        <div className="flex-shrink-0 p-3 pl-0" onClick={(e) => e.stopPropagation()}>
          {optimisticPhotoUrl ? (
            <div className="relative">
              <img
                src={optimisticPhotoUrl}
                alt={t('uploadedPhoto')}
                className="w-16 h-16 object-cover rounded-lg border border-amber-200 opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : item.photoUrl ? (
            <div className="inline-flex flex-col gap-1">
              <div className="relative inline-flex items-end gap-2">
                <div className="relative group">
                  {imageError ? (
                    <div className="w-16 h-16 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-400">
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      <span className="text-[10px] mt-0.5">{t('photoLoadFailed')}</span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={item.photoUrl}
                        alt={t('uploadedPhoto')}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => onViewPhoto(item.photoUrl!)}
                        onError={() => setImageError(true)}
                      />
                      <div
                        className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        onClick={() => onViewPhoto(item.photoUrl!)}
                      >
                        <MagnifyingGlassPlusIcon className="w-5 h-5 text-white" />
                      </div>
                    </>
                  )}
                </div>
                {!readOnly && (
                  <button
                    onClick={onDeletePhoto}
                    disabled={isUploading}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
                    title={t('deletePhoto')}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              {(item.photoTakenAt || item.photoUploadedAt) && (
                <span className="text-xs text-gray-500">
                  {item.photoTakenAt
                    ? t('photoTakenAt', { time: formatTimestamp(item.photoTakenAt) })
                    : t('photoUploadedAt', { time: formatTimestamp(item.photoUploadedAt!) })
                  }
                </span>
              )}
            </div>
          ) : readOnly ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-400">
              <CameraIcon className="w-3.5 h-3.5" />
              {t('photoNeeded')}
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
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }
                `}
              >
                {isUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                    {t('uploading')}
                  </>
                ) : (
                  <>
                    <CameraIcon className="w-3.5 h-3.5" />
                    {t('addPhoto')}
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
                    className="z-[9999] w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 origin-top-right"
                  >
                    <button
                      type="button"
                      onClick={() => handleOptionSelect(cameraInputRef)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
                    >
                      <CameraIcon className="w-4 h-4" />
                      {t('takePhoto')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect(galleryInputRef)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
                    >
                      <PhotoIcon className="w-4 h-4" />
                      {t('chooseFromGallery')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect(fileInputRef)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
                    >
                      <ArrowUpTrayIcon className="w-4 h-4" />
                      {t('uploadFile')}
                    </button>
                  </motion.div>
                </AnimatePresence>,
                document.body
              )}

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
              <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif" onChange={handleFileChange} className="hidden" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checklist container
// ---------------------------------------------------------------------------

export default function TaskChecklist({ task, readOnly, onProgressChange }: TaskChecklistProps) {
  const { t } = useTranslation('contractorPortal')
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [items, setItems] = useState<TaskChecklistItem[] | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set())
  const [optimisticPhotos, setOptimisticPhotos] = useState<Record<string, string>>({})
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)

  // Keep the latest callback without retriggering the fetch effect
  const onProgressChangeRef = useRef(onProgressChange)
  useEffect(() => {
    onProgressChangeRef.current = onProgressChange
  }, [onProgressChange])

  const isReadOnly = !!readOnly || task.status !== 'in_progress'

  // Apply a new items array and report the recomputed progress upward
  const applyItems = (next: TaskChecklistItem[]) => {
    setItems(next)
    onProgressChangeRef.current?.(computeProgress(next))
  }

  useEffect(() => {
    let cancelled = false
    setItems(null)
    getTaskChecklist(task.id)
      .then((res) => {
        if (cancelled) return
        if (res.status === 'success') {
          setItems(res.data.items)
          onProgressChangeRef.current?.(computeProgress(res.data.items))
        } else {
          console.error('Failed to load task checklist:', res.message)
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Error loading task checklist:', err)
      })
    return () => {
      cancelled = true
    }
  }, [task.id])

  if (!items || items.length === 0) return null

  const progress = computeProgress(items)
  const photosMissing = progress.photosRequired - progress.photosUploaded
  const percent = progress.totalItems > 0 ? Math.round((progress.completedItems / progress.totalItems) * 100) : 0

  const setBusy = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    itemId: string,
    busy: boolean
  ) => {
    setter((prev) => {
      const next = new Set(prev)
      if (busy) next.add(itemId)
      else next.delete(itemId)
      return next
    })
  }

  const replaceItem = (prev: TaskChecklistItem[], updated: TaskChecklistItem) =>
    prev.map((i) => (i.id === updated.id ? updated : i))

  const handleToggle = async (item: TaskChecklistItem) => {
    if (isReadOnly || togglingIds.has(item.id)) return
    const nextCompleted = !item.isCompleted
    const snapshot = items
    // Optimistic toggle
    applyItems(replaceItem(items, {
      ...item,
      isCompleted: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : null,
    }))
    setBusy(setTogglingIds, item.id, true)
    try {
      const res = await updateTaskChecklistItem(task.id, item.id, { isCompleted: nextCompleted })
      if (res.status === 'success') {
        setItems((prev) => {
          const next = prev ? replaceItem(prev, res.data) : prev
          if (next) onProgressChangeRef.current?.(computeProgress(next))
          return next
        })
      } else {
        applyItems(snapshot)
        showNotification(res.message || t('actionFailed'), 'error')
      }
    } catch (err) {
      console.error('Error toggling checklist item:', err)
      applyItems(snapshot)
      showNotification(err instanceof Error ? err.message : t('actionFailed'), 'error')
    } finally {
      setBusy(setTogglingIds, item.id, false)
    }
  }

  const handleUploadPhoto = async (item: TaskChecklistItem, file: File) => {
    if (isReadOnly || uploadingIds.has(item.id)) return
    const blobUrl = URL.createObjectURL(file)
    setOptimisticPhotos((prev) => ({ ...prev, [item.id]: blobUrl }))
    setBusy(setUploadingIds, item.id, true)
    try {
      const res = await uploadTaskChecklistItemPhoto(task.id, item.id, file)
      if (res.status === 'success') {
        setItems((prev) => {
          const next = prev ? replaceItem(prev, res.data) : prev
          if (next) onProgressChangeRef.current?.(computeProgress(next))
          return next
        })
      } else {
        showNotification(res.message || t('photoUploadFailed'), 'error')
      }
    } catch (err) {
      console.error('Error uploading checklist photo:', err)
      showNotification(err instanceof Error ? err.message : t('photoUploadFailed'), 'error')
    } finally {
      setOptimisticPhotos((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
      URL.revokeObjectURL(blobUrl)
      setBusy(setUploadingIds, item.id, false)
    }
  }

  const handleDeletePhoto = async (item: TaskChecklistItem) => {
    if (isReadOnly || uploadingIds.has(item.id)) return
    const snapshot = items
    // Optimistic removal
    applyItems(replaceItem(items, {
      ...item,
      photoUrl: null,
      photoTakenAt: null,
      photoUploadedAt: null,
    }))
    setBusy(setUploadingIds, item.id, true)
    try {
      const res = await deleteTaskChecklistItemPhoto(task.id, item.id)
      if (res.status === 'success') {
        setItems((prev) => {
          const next = prev ? replaceItem(prev, res.data) : prev
          if (next) onProgressChangeRef.current?.(computeProgress(next))
          return next
        })
      } else {
        applyItems(snapshot)
        showNotification(res.message || t('actionFailed'), 'error')
      }
    } catch (err) {
      console.error('Error deleting checklist photo:', err)
      applyItems(snapshot)
      showNotification(err instanceof Error ? err.message : t('actionFailed'), 'error')
    } finally {
      setBusy(setUploadingIds, item.id, false)
    }
  }

  return (
    <div>
      {/* Header: title + progress + thin amber bar */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-800">{t('checklist')}</h4>
        <span className="text-xs text-gray-500">
          {t('checklistProgress', { completed: progress.completedItems, total: progress.totalItems })}
          {photosMissing > 0 && ` · ${t('photoNeededCount', { count: photosMissing })}`}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full rounded-full bg-amber-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Item rows */}
      <div className="mt-2 rounded-lg border border-gray-100 overflow-hidden">
        {items.map((item) => (
          <TaskChecklistItemRow
            key={item.id}
            item={item}
            readOnly={isReadOnly}
            isToggling={togglingIds.has(item.id)}
            isUploading={uploadingIds.has(item.id)}
            optimisticPhotoUrl={optimisticPhotos[item.id]}
            onToggle={() => handleToggle(item)}
            onUploadPhoto={(file) => handleUploadPhoto(item, file)}
            onDeletePhoto={() => handleDeletePhoto(item)}
            onViewPhoto={(url) => setViewingPhoto(url)}
          />
        ))}
      </div>

      {/* Photo lightbox */}
      {viewingPhoto && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setViewingPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white cursor-pointer"
            aria-label={t('cancel')}
          >
            <XMarkIcon className="w-7 h-7" />
          </button>
          <img
            src={viewingPhoto}
            alt={t('uploadedPhoto')}
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </div>
  )
}
