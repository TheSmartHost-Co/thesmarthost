'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  CheckCircleIcon,
  CameraIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HomeModernIcon,
  ClockIcon,
  TrashIcon,
  FlagIcon,
  PlusIcon,
  MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getProjectChecklist,
  initializeProjectChecklist,
  updateProjectChecklistItem,
  uploadProjectChecklistItemPhoto,
  deleteProjectChecklistItemPhoto,
  groupChecklistItemsByRoom,
  completeProject,
  formatTime,
} from '@/services/cleaningProjectService'
import type { CleaningProject, ProjectChecklistItem, ChecklistProgress } from '@/services/types/cleaningProject'
import { ReportIssueModal } from '@/components/turnover/issues'

interface ChecklistModalProps {
  isOpen: boolean
  onClose: () => void
  project: CleaningProject
  onProjectComplete?: (project: CleaningProject) => void
}

export default function ChecklistModal({
  isOpen,
  onClose,
  project,
  onProjectComplete,
}: ChecklistModalProps) {
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Read-only mode: only allow modifications when project is in_progress
  const readOnly = project.status !== 'in_progress'

  // State
  const [items, setItems] = useState<ProjectChecklistItem[]>([])
  const [progress, setProgress] = useState<ChecklistProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set())
  const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set())
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set())
  const [completing, setCompleting] = useState(false)
  const [showReportIssueModal, setShowReportIssueModal] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  // Fetch checklist data
  const fetchChecklist = useCallback(async () => {
    if (!project.id) return

    setLoading(true)
    try {
      const res = await getProjectChecklist(project.id)
      if (res.status === 'success') {
        // If no items but project has a checklist assigned, auto-initialize (only for active projects)
        if (res.data.items.length === 0 && project.checklistId && project.status === 'in_progress') {
          console.log('No checklist items found, auto-initializing from template...')
          const initRes = await initializeProjectChecklist(project.id)
          if (initRes.status === 'success' && initRes.data.initialized > 0) {
            // Re-fetch after initialization
            const refreshRes = await getProjectChecklist(project.id)
            if (refreshRes.status === 'success') {
              setItems(refreshRes.data.items)
              setProgress(refreshRes.data.progress)
              const rooms = new Set(refreshRes.data.items.map(item => item.roomName || 'General'))
              setExpandedRooms(rooms)
              return
            }
          }
        }

        setItems(res.data.items)
        setProgress(res.data.progress)
        // Expand all rooms by default
        const rooms = new Set(res.data.items.map(item => item.roomName || 'General'))
        setExpandedRooms(rooms)
      } else {
        showNotification(res.message || 'Failed to load checklist', 'error')
      }
    } catch (err) {
      console.error('Error fetching checklist:', err)
      showNotification('Error loading checklist', 'error')
    } finally {
      setLoading(false)
    }
  }, [project.id, project.checklistId, showNotification])

  useEffect(() => {
    if (isOpen) {
      fetchChecklist()
    }
  }, [isOpen, fetchChecklist])

  // Group items by room
  const itemsByRoom = groupChecklistItemsByRoom(items)

  // Toggle room expansion
  const toggleRoom = (roomName: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev)
      if (next.has(roomName)) {
        next.delete(roomName)
      } else {
        next.add(roomName)
      }
      return next
    })
  }

  // Toggle item completion
  const handleToggleItem = async (item: ProjectChecklistItem) => {
    if (togglingItems.has(item.id)) return

    // Optimistic update for item
    const newValue = !item.isCompleted
    const previousItems = [...items]
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, isCompleted: newValue } : i
    ))
    setTogglingItems(prev => new Set(prev).add(item.id))

    try {
      const res = await updateProjectChecklistItem(project.id, item.id, {
        isCompleted: newValue
      })

      if (res.status === 'success') {
        // Update item with server response
        setItems(prev => prev.map(i =>
          i.id === item.id ? res.data : i
        ))
        // Recalculate progress from current items state for accuracy
        // This is more reliable than manual +/- calculation
        setProgress(prev => {
          if (!prev) return prev
          const updatedItems = items.map(i => i.id === item.id ? res.data : i)
          const completedCount = updatedItems.filter(i => i.isCompleted).length
          return {
            ...prev,
            completedItems: completedCount,
            completionPercentage: Math.round((completedCount / prev.totalItems) * 100)
          }
        })
      } else {
        // Rollback on failure
        setItems(previousItems)
        showNotification(res.message || 'Failed to update item', 'error')
      }
    } catch (err) {
      // Rollback on error
      setItems(previousItems)
      console.error('Error updating checklist item:', err)
      showNotification('Error updating item', 'error')
    } finally {
      setTogglingItems(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  // Handle photo upload
  const handlePhotoUpload = async (itemId: string, file: File) => {
    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
    if (!allowedTypes.includes(file.type)) {
      showNotification('Invalid file type. Only images allowed.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('File too large. Maximum 5MB.', 'error')
      return
    }

    setUploadingItems(prev => new Set(prev).add(itemId))

    try {
      const res = await uploadProjectChecklistItemPhoto(project.id, itemId, file)
      if (res.status === 'success') {
        // Check if item previously had no photo (for progress update)
        const previousItem = items.find(i => i.id === itemId)
        const hadNoPhoto = previousItem && !previousItem.photoUrl

        setItems(prev => prev.map(i =>
          i.id === itemId ? res.data : i
        ))
        // Only increment photo count if item didn't have a photo before
        if (hadNoPhoto) {
          setProgress(prev => prev ? {
            ...prev,
            photosUploaded: prev.photosUploaded + 1
          } : prev)
        }
        showNotification('Photo uploaded successfully', 'success')
      } else {
        showNotification(res.message || 'Failed to upload photo', 'error')
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
      showNotification('Error uploading photo', 'error')
    } finally {
      setUploadingItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  // Handle photo delete
  const handleDeletePhoto = async (itemId: string) => {
    // Check if item actually has a photo before attempting delete
    const item = items.find(i => i.id === itemId)
    if (!item?.photoUrl) return

    setUploadingItems(prev => new Set(prev).add(itemId))

    try {
      const res = await deleteProjectChecklistItemPhoto(project.id, itemId)
      if (res.status === 'success') {
        setItems(prev => prev.map(i =>
          i.id === itemId ? { ...i, photoUrl: null } : i
        ))
        // Only decrement if item requires a photo (counts toward required photos)
        if (item.requiresPhoto) {
          setProgress(prev => prev ? {
            ...prev,
            photosUploaded: Math.max(0, prev.photosUploaded - 1)
          } : prev)
        }
        showNotification('Photo deleted', 'success')
      } else {
        showNotification(res.message || 'Failed to delete photo', 'error')
      }
    } catch (err) {
      console.error('Error deleting photo:', err)
      showNotification('Error deleting photo', 'error')
    } finally {
      setUploadingItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  // Handle project completion
  const handleComplete = async () => {
    if (completing) return

    // Check if all items are complete
    if (progress && progress.completedItems < progress.totalItems) {
      showNotification('Please complete all checklist items first', 'error')
      return
    }

    // Check if all required photos are uploaded
    if (progress && progress.photosUploaded < progress.photoRequired) {
      showNotification(`Please upload all required photos (${progress.photosUploaded}/${progress.photoRequired})`, 'error')
      return
    }

    setCompleting(true)
    try {
      const res = await completeProject(project.id)
      if (res.status === 'success') {
        showNotification('Project marked as complete!', 'success')
        if (onProjectComplete) {
          onProjectComplete(res.data)
        }
        onClose()
      } else {
        showNotification(res.message || 'Failed to complete project', 'error')
      }
    } catch (err) {
      showNotification('Error completing project', 'error')
    } finally {
      setCompleting(false)
    }
  }

  const canComplete = progress &&
    progress.completedItems === progress.totalItems &&
    progress.photosUploaded >= progress.photoRequired

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} closable={false} style="p-0 max-w-3xl w-11/12 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <HomeModernIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{project.propertyName}</h2>
                <div className="flex items-center gap-2 text-sm text-purple-100">
                  <ClockIcon className="w-4 h-4" />
                  <span>
                    {formatTime(project.checkoutTime)}
                    {project.checkoutTime && project.checkinTime && ' - '}
                    {formatTime(project.checkinTime)}
                  </span>
                </div>
              </div>
            </div>
            {!completing && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>{progress.completedItems} of {progress.totalItems} tasks</span>
                <span>{progress.completionPercentage}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.completionPercentage}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {progress.photoRequired > 0 && (
                <div className="flex items-center gap-1 mt-2 text-xs text-purple-100">
                  <CameraIcon className="w-3.5 h-3.5" />
                  <span>{progress.photosUploaded}/{progress.photoRequired} required photos</span>
                </div>
              )}
            </div>
          )}

          {/* Read-only banner */}
          {readOnly && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-white/15 rounded-lg text-sm text-purple-100">
              <ClockIcon className="w-4 h-4 flex-shrink-0" />
              <span>
                {project.status === 'completed'
                  ? 'This project is completed. Checklist is view-only.'
                  : 'Press "Start Cleaning" on the project to begin checking off items.'}
              </span>
            </div>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No checklist items found for this property.</p>
            </div>
          ) : (
            Object.entries(itemsByRoom).map(([roomName, roomItems]) => (
              <RoomSection
                key={roomName}
                roomName={roomName}
                items={roomItems}
                isExpanded={expandedRooms.has(roomName)}
                onToggle={() => toggleRoom(roomName)}
                onToggleItem={handleToggleItem}
                onUploadPhoto={handlePhotoUpload}
                onDeletePhoto={handleDeletePhoto}
                onViewPhoto={setViewingImage}
                uploadingItems={uploadingItems}
                togglingItems={togglingItems}
                readOnly={readOnly}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          {readOnly ? (
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportIssueModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer"
              >
                <FlagIcon className="w-4 h-4" />
                Report Issue
              </button>
              <button
                onClick={handleComplete}
                disabled={!canComplete || completing}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors cursor-pointer
                  ${canComplete
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {completing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5" />
                )}
                {completing ? 'Completing...' : 'Complete Project'}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={showReportIssueModal}
        onClose={() => setShowReportIssueModal(false)}
        projectId={project.id}
        cleanerId={project.cleanerId}
        onIssueCreated={() => {
          setShowReportIssueModal(false)
          showNotification('Issue reported successfully', 'success')
        }}
      />

      {/* Image Viewer Lightbox */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setViewingImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={viewingImage}
                alt="Full size photo"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%239ca3af"%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"%3E%3C/path%3E%3C/svg%3E'
                }}
              />
              <button
                onClick={() => setViewingImage(null)}
                className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5 text-gray-700" />
              </button>
              {/* Open in new tab button */}
              <a
                href={viewingImage}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 right-4 px-3 py-2 bg-white/90 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Open in new tab
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Room Section Component
interface RoomSectionProps {
  roomName: string
  items: ProjectChecklistItem[]
  isExpanded: boolean
  onToggle: () => void
  onToggleItem: (item: ProjectChecklistItem) => void
  onUploadPhoto: (itemId: string, file: File) => void
  onDeletePhoto: (itemId: string) => void
  onViewPhoto: (url: string) => void
  uploadingItems: Set<string>
  togglingItems: Set<string>
  readOnly?: boolean
}

function RoomSection({
  roomName,
  items,
  isExpanded,
  onToggle,
  onToggleItem,
  onUploadPhoto,
  onDeletePhoto,
  onViewPhoto,
  uploadingItems,
  togglingItems,
  readOnly,
}: RoomSectionProps) {
  const completedCount = items.filter(i => i.isCompleted).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Room Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">{roomName}</h3>
          <span className={`
            text-xs font-medium px-2 py-0.5 rounded-full
            ${completedCount === items.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
          `}>
            {completedCount}/{items.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Room Items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-gray-100">
              {items.map(item => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => onToggleItem(item)}
                  onUploadPhoto={(file) => onUploadPhoto(item.id, file)}
                  onDeletePhoto={() => onDeletePhoto(item.id)}
                  onViewPhoto={onViewPhoto}
                  isUploading={uploadingItems.has(item.id)}
                  isToggling={togglingItems.has(item.id)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Checklist Item Row Component
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

function ChecklistItemRow({
  item,
  onToggle,
  onUploadPhoto,
  onDeletePhoto,
  onViewPhoto,
  isUploading,
  isToggling,
  readOnly,
}: ChecklistItemRowProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUploadPhoto(file)
    }
  }

  return (
    <div className={`
      flex items-start gap-3 p-4 border-b border-gray-50 last:border-b-0
      ${item.isCompleted ? 'bg-green-50/50' : ''}
    `}>
      {/* Checkbox */}
      <button
        onClick={readOnly ? undefined : onToggle}
        disabled={isToggling || readOnly}
        className={`flex-shrink-0 mt-0.5 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <div className={`
          w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
          ${item.isCompleted
            ? 'bg-green-500 border-green-500 text-white'
            : readOnly ? 'border-gray-200' : 'border-gray-300 hover:border-purple-400'
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
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
          {item.taskDescription}
        </p>

        {/* Photo Section */}
        {item.requiresPhoto && (
          <div className="mt-2">
            {item.photoUrl ? (
              <div className="relative inline-flex items-end gap-2">
                <div className="relative group">
                  <img
                    src={item.photoUrl}
                    alt="Uploaded photo"
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onViewPhoto(item.photoUrl!)}
                    onError={(e) => {
                      // Handle broken image - show placeholder
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.parentElement?.classList.add('bg-gray-100')
                    }}
                  />
                  {/* View overlay on hover */}
                  <div
                    className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => onViewPhoto(item.photoUrl!)}
                  >
                    <MagnifyingGlassPlusIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                {!readOnly && (
                  <button
                    onClick={onDeletePhoto}
                    disabled={isUploading}
                    className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
                    title="Delete photo"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : readOnly ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-400">
                <CameraIcon className="w-3.5 h-3.5" />
                Photo Required
              </span>
            ) : (
              <label className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors
                ${isUploading
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }
              `}>
                {isUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CameraIcon className="w-3.5 h-3.5" />
                    Add Photo (Required)
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/heic"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
