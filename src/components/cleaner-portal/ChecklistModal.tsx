'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, BoltIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  getProjectChecklist,
  initializeProjectChecklist,
  updateProjectChecklistItem,
  uploadProjectChecklistItemPhoto,
  deleteProjectChecklistItemPhoto,
  completeProject,
  getWalkthroughStatus,
  uploadWalkthroughPhotos,
  deleteWalkthroughPhoto,
  getStartBlockReason,
} from '@/services/cleaningProjectService'
import type { CleaningProject, ProjectChecklistItem, ChecklistProgress, WalkthroughStatus } from '@/services/types/cleaningProject'
import { ReportIssueModal, ViewIssuesModal } from '@/components/turnover/issues'
import { CleanerSupplyListModal, CleanerScanReceiptModal } from '@/components/cleaner-portal/supply-lists'
import { getSupplyListsByProject } from '@/services/supplyListService'
import type { SupplyList } from '@/services/types/supplyList'
import { getIssueCounts } from '@/services/projectIssueService'

import ChecklistHeader from './checklist/ChecklistHeader'
import ChecklistTabs, { type ChecklistTab } from './checklist/ChecklistTabs'
import ChecklistContent from './checklist/ChecklistContent'
import WalkthroughContent from './checklist/WalkthroughContent'
import InfoContent from './checklist/InfoContent'
import BottomActionBar from './checklist/BottomActionBar'

interface ChecklistModalProps {
  isOpen: boolean
  onClose: () => void
  project: CleaningProject
  onProjectComplete?: (project: CleaningProject) => void
  onProjectUpdated?: (project: CleaningProject) => void
  onRequestTimeChange?: () => void
  onAccept?: (projectId: string) => Promise<void>
  onDecline?: (projectId: string) => Promise<void>
  onStart?: (projectId: string) => Promise<void>
  onUnbegin?: (projectId: string) => Promise<void>
  initialTab?: ChecklistTab
}

export default function ChecklistModal({
  isOpen,
  onClose,
  project,
  onProjectComplete,
  onProjectUpdated,
  onRequestTimeChange,
  onAccept,
  onDecline,
  onStart,
  onUnbegin,
  initialTab,
}: ChecklistModalProps) {
  const showNotification = useNotificationStore((state) => state.showNotification)
  const isMobile = useIsMobile()

  // Local copy of project so notes updates reflect immediately
  const [localProject, setLocalProject] = useState(project)
  useEffect(() => { setLocalProject(project) }, [project])

  const readOnly = localProject.status !== 'in_progress'

  // Tab state: Info first for assigned/confirmed (cleaner en route), Checklist for in_progress/completed
  const defaultTab = initialTab || (project.status === 'in_progress' || project.status === 'completed' ? 'checklist' : 'info')
  const [activeTab, setActiveTab] = useState<ChecklistTab>(defaultTab)

  // Checklist state
  const [items, setItems] = useState<ProjectChecklistItem[]>([])
  const [progress, setProgress] = useState<ChecklistProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set())
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set())
  const [completing, setCompleting] = useState(false)

  // Walkthrough state
  const [walkthroughStatus, setWalkthroughStatus] = useState<WalkthroughStatus | null>(null)
  const [walkthroughLoading, setWalkthroughLoading] = useState(false)
  const [uploadingRooms, setUploadingRooms] = useState<Set<string>>(new Set())

  // Nested modal state
  const [showReportIssueModal, setShowReportIssueModal] = useState(false)
  const [showViewIssuesModal, setShowViewIssuesModal] = useState(false)
  const [showSupplyListsModal, setShowSupplyListsModal] = useState(false)
  const [showScanReceiptModal, setShowScanReceiptModal] = useState(false)
  const [supplyListCount, setSupplyListCount] = useState(0)
  const [supplyLists, setSupplyLists] = useState<SupplyList[]>([])
  const [issueCount, setIssueCount] = useState(0)
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  // Body scroll lock for mobile full-screen
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = 'auto' }
    }
  }, [isOpen, isMobile])

  // Reset tab when modal opens — status-aware default
  useEffect(() => {
    if (isOpen) {
      setActiveTab(
        initialTab || (project.status === 'in_progress' || project.status === 'completed' ? 'checklist' : 'info')
      )
    }
  }, [isOpen, project.status, initialTab])

  // Fetch checklist data
  const fetchChecklist = useCallback(async () => {
    if (!project.id) return

    setLoading(true)
    try {
      const res = await getProjectChecklist(project.id)
      if (res.status === 'success') {
        if (res.data.items.length === 0 && project.checklistId && project.status === 'in_progress') {
          const initRes = await initializeProjectChecklist(project.id)
          if (initRes.status === 'success' && initRes.data.initialized > 0) {
            const refreshRes = await getProjectChecklist(project.id)
            if (refreshRes.status === 'success') {
              setItems(refreshRes.data.items)
              setProgress(refreshRes.data.progress)
              return
            }
          }
        }
        setItems(res.data.items)
        setProgress(res.data.progress)
      } else {
        showNotification(res.message || 'Failed to load checklist', 'error')
      }
    } catch (err) {
      console.error('Error fetching checklist:', err)
      showNotification('Error loading checklist', 'error')
    } finally {
      setLoading(false)
    }
  }, [project.id, project.checklistId, project.status, showNotification])

  const fetchSupplyListCount = useCallback(async () => {
    if (!project.id) return
    try {
      const res = await getSupplyListsByProject(project.id)
      if (res.status === 'success') {
        setSupplyListCount(res.data.length)
        setSupplyLists(res.data)
      }
    } catch (err) {
      console.error('Error fetching supply list count:', err)
    }
  }, [project.id])

  const fetchIssueCount = useCallback(async () => {
    if (!project.id) return
    try {
      const res = await getIssueCounts(project.id)
      if (res.status === 'success') setIssueCount(res.data.total)
    } catch (err) {
      console.error('Error fetching issue count:', err)
    }
  }, [project.id])

  const fetchWalkthrough = useCallback(async () => {
    if (!project.id || !project.checklistId) return
    setWalkthroughLoading(true)
    try {
      const res = await getWalkthroughStatus(project.id)
      if (res.status === 'success') {
        setWalkthroughStatus(res.data)
      }
    } catch (err) {
      console.error('Error fetching walkthrough status:', err)
    } finally {
      setWalkthroughLoading(false)
    }
  }, [project.id, project.checklistId])

  useEffect(() => {
    if (isOpen) {
      fetchChecklist()
      fetchSupplyListCount()
      fetchIssueCount()
      fetchWalkthrough()
    }
  }, [isOpen, fetchChecklist, fetchSupplyListCount, fetchIssueCount, fetchWalkthrough])

  // Handlers
  const handleToggleItem = async (item: ProjectChecklistItem) => {
    if (togglingItems.has(item.id)) return

    const newValue = !item.isCompleted
    const previousItems = [...items]
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, isCompleted: newValue } : i
    ))
    setTogglingItems(prev => new Set(prev).add(item.id))

    try {
      const res = await updateProjectChecklistItem(project.id, item.id, { isCompleted: newValue })
      if (res.status === 'success') {
        setItems(prev => prev.map(i => i.id === item.id ? res.data : i))
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
        setItems(previousItems)
        showNotification(res.message || 'Failed to update item', 'error')
      }
    } catch (err) {
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

  const handlePhotoUpload = async (itemId: string, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
    if (!allowedTypes.includes(file.type)) {
      showNotification('Invalid file type. Only images allowed.', 'error')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      showNotification('File too large. Maximum 20MB.', 'error')
      return
    }

    setUploadingItems(prev => new Set(prev).add(itemId))
    try {
      const res = await uploadProjectChecklistItemPhoto(project.id, itemId, file)
      if (res.status === 'success') {
        const previousItem = items.find(i => i.id === itemId)
        const hadNoPhoto = previousItem && !previousItem.photoUrl
        setItems(prev => prev.map(i => i.id === itemId ? res.data : i))
        if (hadNoPhoto) {
          setProgress(prev => prev ? { ...prev, photosUploaded: prev.photosUploaded + 1 } : prev)
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

  const handleDeletePhoto = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item?.photoUrl) return

    setUploadingItems(prev => new Set(prev).add(itemId))
    try {
      const res = await deleteProjectChecklistItemPhoto(project.id, itemId)
      if (res.status === 'success') {
        setItems(prev => prev.map(i =>
          i.id === itemId ? { ...i, photoUrl: null, photoTakenAt: null, photoUploadedAt: null } : i
        ))
        if (item.requiresPhoto) {
          setProgress(prev => prev ? { ...prev, photosUploaded: Math.max(0, prev.photosUploaded - 1) } : prev)
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

  const handleWalkthroughUpload = async (roomName: string, files: File[]) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
    const validFiles = files.filter(f => allowedTypes.includes(f.type) && f.size <= 20 * 1024 * 1024)
    if (validFiles.length === 0) {
      showNotification('No valid image files selected', 'error')
      return
    }

    setUploadingRooms(prev => new Set(prev).add(roomName))
    try {
      const res = await uploadWalkthroughPhotos(project.id, roomName, validFiles)
      if (res.status === 'success') {
        showNotification(`${validFiles.length} photo${validFiles.length > 1 ? 's' : ''} uploaded`, 'success')
        await fetchWalkthrough()
      } else {
        showNotification(res.message || 'Failed to upload photos', 'error')
      }
    } catch (err) {
      console.error('Error uploading walkthrough photos:', err)
      showNotification('Error uploading photos', 'error')
    } finally {
      setUploadingRooms(prev => {
        const next = new Set(prev)
        next.delete(roomName)
        return next
      })
    }
  }

  const handleWalkthroughDeletePhoto = async (photoId: string) => {
    try {
      const res = await deleteWalkthroughPhoto(project.id, photoId)
      if (res.status === 'success') {
        showNotification('Photo deleted', 'success')
        await fetchWalkthrough()
      } else {
        showNotification(res.message || 'Failed to delete photo', 'error')
      }
    } catch (err) {
      console.error('Error deleting walkthrough photo:', err)
      showNotification('Error deleting photo', 'error')
    }
  }

  // Walkthrough computed values
  const showWalkthroughTab = !!project.checklistId
  const walkthroughBadge = walkthroughStatus?.requiresWalkthrough
    ? `${walkthroughStatus.rooms.filter(r => r.hasPhotos).length}/${walkthroughStatus.rooms.length}`
    : null

  const handleComplete = async () => {
    if (completing) return
    if (progress && progress.completedItems < progress.totalItems) {
      showNotification('Please complete all checklist items first', 'error')
      return
    }
    if (progress && progress.photosUploaded < progress.photoRequired) {
      showNotification(`Please upload all required photos (${progress.photosUploaded}/${progress.photoRequired})`, 'error')
      return
    }
    if (walkthroughStatus?.requiresWalkthrough && !walkthroughStatus.isComplete) {
      const missing = walkthroughStatus.rooms.filter(r => !r.hasPhotos).map(r => r.roomName)
      showNotification(`Upload walkthrough photos for: ${missing.join(', ')}`, 'error')
      setActiveTab('walkthrough')
      return
    }

    setCompleting(true)
    try {
      const res = await completeProject(project.id)
      if (res.status === 'success') {
        showNotification('Project marked as complete!', 'success')
        onProjectComplete?.(res.data)
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

  if (!isOpen) return null

  // Shared inner content
  const innerContent = (
    <>
      <ChecklistHeader
        propertyName={project.propertyName}
        progress={progress}
        onClose={onClose}
        completing={completing}
        projectDate={project.projectDate}
        projectStartTime={project.projectStartTime}
        projectEndTime={project.projectEndTime}
        status={project.status}
      />
      {project.pmOverride && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-50 border-b border-orange-100 text-xs font-medium text-orange-700">
          <BoltIcon className="w-3.5 h-3.5" />
          PM Override Active — date restrictions removed
        </div>
      )}
      <ChecklistTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        issueCount={issueCount}
        supplyListCount={supplyListCount}
        showWalkthrough={showWalkthroughTab}
        walkthroughBadge={walkthroughBadge}
      />
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'checklist' ? (
          <ChecklistContent
            items={items}
            loading={loading}
            onToggleItem={handleToggleItem}
            onUploadPhoto={handlePhotoUpload}
            onDeletePhoto={handleDeletePhoto}
            onViewPhoto={setViewingImage}
            uploadingItems={uploadingItems}
            togglingItems={togglingItems}
            readOnly={readOnly}
          />
        ) : activeTab === 'walkthrough' ? (
          <WalkthroughContent
            projectId={project.id}
            walkthroughStatus={walkthroughStatus}
            loading={walkthroughLoading}
            onPhotoUpload={handleWalkthroughUpload}
            onPhotoDelete={handleWalkthroughDeletePhoto}
            onViewPhoto={setViewingImage}
            uploadingRooms={uploadingRooms}
            hasChecklist={!!project.checklistId}
          />
        ) : (
          <InfoContent
            project={localProject}
            onRequestTimeChange={onRequestTimeChange}
            onNotesUpdated={(updatedProject) => {
              setLocalProject(updatedProject)
              onProjectUpdated?.(updatedProject)
            }}
          />
        )}
      </div>
      <BottomActionBar
        status={project.status}
        progress={progress}
        completing={completing}
        issueCount={issueCount}
        supplyListCount={supplyListCount}
        onAccept={onAccept}
        onDecline={onDecline}
        onStart={onStart}
        onUnbegin={onUnbegin}
        startBlockReason={getStartBlockReason(project)}
        onComplete={handleComplete}
        onClose={onClose}
        onReportIssue={() => setShowReportIssueModal(true)}
        onViewIssues={() => setShowViewIssuesModal(true)}
        onSubmitSupplyList={() => setShowSupplyListsModal(true)}
        onViewSupplyLists={() => setShowSupplyListsModal(true)}
        onScanReceipt={() => setShowScanReceiptModal(true)}
        projectId={project.id}
        walkthroughComplete={!walkthroughStatus?.requiresWalkthrough || walkthroughStatus.isComplete}
        walkthroughRequired={walkthroughStatus?.requiresWalkthrough ?? false}
      />
    </>
  )

  return (
    <>
      {/* Main UI: full-screen on mobile, modal on desktop */}
      {isMobile ? (
        createPortal(
          <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {innerContent}
          </div>,
          document.body
        )
      ) : (
        createPortal(
          <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/10" onClick={onClose} />
            <div className="relative z-10 bg-white rounded-xl shadow-xl w-11/12 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              {innerContent}
            </div>
          </div>,
          document.body
        )
      )}

      {/* Nested modals */}
      <ReportIssueModal
        isOpen={showReportIssueModal}
        onClose={() => setShowReportIssueModal(false)}
        projectId={project.id}
        cleanerId={project.cleanerId}
        onIssueCreated={() => {
          setShowReportIssueModal(false)
          fetchIssueCount()
          showNotification('Issue reported successfully', 'success')
        }}
      />

      <ViewIssuesModal
        isOpen={showViewIssuesModal}
        onClose={() => setShowViewIssuesModal(false)}
        projectId={project.id}
        projectName={project.propertyName}
        isPM={false}
        onReportIssue={() => {
          setShowViewIssuesModal(false)
          setShowReportIssueModal(true)
        }}
        onIssuesChanged={fetchIssueCount}
      />

      <CleanerSupplyListModal
        isOpen={showSupplyListsModal}
        onClose={() => setShowSupplyListsModal(false)}
        projectId={project.id}
        projectName={project.propertyName}
        cleanerId={project.cleanerId || ''}
        pmUserId={project.userId}
        propertyId={project.propertyId}
        onChanged={fetchSupplyListCount}
      />

      <CleanerScanReceiptModal
        isOpen={showScanReceiptModal}
        onClose={() => setShowScanReceiptModal(false)}
        supplyLists={supplyLists}
        properties={[{ id: project.propertyId, listingName: project.propertyName || '' }]}
        pmUserId={project.userId}
        projectId={project.id}
        onReceiptApplied={() => {
          setShowScanReceiptModal(false)
          fetchSupplyListCount()
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
