'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  getProjectChecklist,
  initializeProjectChecklist,
  updateProjectChecklistItem,
  uploadProjectChecklistItemPhoto,
  deleteProjectChecklistItemPhoto,
  completeProject,
} from '@/services/cleaningProjectService'
import type { CleaningProject, ProjectChecklistItem, ChecklistProgress } from '@/services/types/cleaningProject'
import { ReportIssueModal, ViewIssuesModal } from '@/components/turnover/issues'
import { SubmitSupplyListModal, ViewSupplyListsModal } from '@/components/turnover/supply-lists'
import { getSupplyListsByProject } from '@/services/supplyListService'
import { getIssueCounts } from '@/services/projectIssueService'

import ChecklistHeader from './checklist/ChecklistHeader'
import ChecklistTabs, { type ChecklistTab } from './checklist/ChecklistTabs'
import ChecklistContent from './checklist/ChecklistContent'
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
}: ChecklistModalProps) {
  const showNotification = useNotificationStore((state) => state.showNotification)
  const isMobile = useIsMobile()

  // Local copy of project so notes updates reflect immediately
  const [localProject, setLocalProject] = useState(project)
  useEffect(() => { setLocalProject(project) }, [project])

  const readOnly = localProject.status !== 'in_progress'

  // Tab state: Info first for assigned/confirmed (cleaner en route), Checklist for in_progress/completed
  const [activeTab, setActiveTab] = useState<ChecklistTab>(
    project.status === 'in_progress' || project.status === 'completed' ? 'checklist' : 'info'
  )

  // Checklist state
  const [items, setItems] = useState<ProjectChecklistItem[]>([])
  const [progress, setProgress] = useState<ChecklistProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set())
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set())
  const [completing, setCompleting] = useState(false)

  // Nested modal state
  const [showReportIssueModal, setShowReportIssueModal] = useState(false)
  const [showViewIssuesModal, setShowViewIssuesModal] = useState(false)
  const [showSubmitSupplyListModal, setShowSubmitSupplyListModal] = useState(false)
  const [showViewSupplyListsModal, setShowViewSupplyListsModal] = useState(false)
  const [supplyListCount, setSupplyListCount] = useState(0)
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
        project.status === 'in_progress' || project.status === 'completed' ? 'checklist' : 'info'
      )
    }
  }, [isOpen, project.status])

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
      if (res.status === 'success') setSupplyListCount(res.data.length)
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

  useEffect(() => {
    if (isOpen) {
      fetchChecklist()
      fetchSupplyListCount()
      fetchIssueCount()
    }
  }, [isOpen, fetchChecklist, fetchSupplyListCount, fetchIssueCount])

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
    if (file.size > 5 * 1024 * 1024) {
      showNotification('File too large. Maximum 5MB.', 'error')
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
      <ChecklistTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        issueCount={issueCount}
        supplyListCount={supplyListCount}
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
        onComplete={handleComplete}
        onClose={onClose}
        onReportIssue={() => setShowReportIssueModal(true)}
        onViewIssues={() => setShowViewIssuesModal(true)}
        onSubmitSupplyList={() => setShowSubmitSupplyListModal(true)}
        onViewSupplyLists={() => setShowViewSupplyListsModal(true)}
        projectId={project.id}
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
        <Modal isOpen={isOpen} onClose={onClose} closable={false} style="p-0 max-w-3xl w-11/12 max-h-[90vh] overflow-hidden flex flex-col">
          {innerContent}
        </Modal>
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

      <SubmitSupplyListModal
        isOpen={showSubmitSupplyListModal}
        onClose={() => setShowSubmitSupplyListModal(false)}
        projectId={project.id}
        cleanerId={project.cleanerId}
        onSubmitted={() => {
          setShowSubmitSupplyListModal(false)
          fetchSupplyListCount()
          showNotification('Supply list submitted successfully', 'success')
        }}
      />

      <ViewSupplyListsModal
        isOpen={showViewSupplyListsModal}
        onClose={() => setShowViewSupplyListsModal(false)}
        projectId={project.id}
        projectName={project.propertyName}
        onSupplyListsChanged={fetchSupplyListCount}
        fulfilledBy={project.cleanerId ?? undefined}
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
