'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, BoltIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  getProjectChecklist,
  initializeProjectChecklist,
  updateProjectChecklistItem,
  uploadProjectChecklistItemPhoto,
  deleteProjectChecklistItemPhoto,
  completeProject,
  getProjectWalkthrough,
  uploadWalkthroughPhotos,
  deleteWalkthroughPhoto,
  bulkDeleteWalkthroughPhotos,
  getStartBlockReason,
  getMissingGroupsFromError,
  isValidPhotoFile,
} from '@/services/cleaningProjectService'
import type { CleaningProject, ProjectChecklistItem, ChecklistProgress, ProjectWalkthrough, WalkthroughPhoto } from '@/services/types/cleaningProject'
import type { WalkthroughUploadTarget } from '@/components/walkthrough/WalkthroughAccordion'
import { targetKey, type OptimisticPhoto } from '@/components/walkthrough/WalkthroughAccordion'
import DeleteWalkthroughPhotosModal from '@/components/walkthrough/DeleteWalkthroughPhotosModal'
import { ReportIssueModal, ViewIssuesModal } from '@/components/turnover/issues'
import { CleanerSupplyListModal } from '@/components/cleaner-portal/supply-lists'
import ScanSupplyReceiptModal from '@/components/supply-hub/ScanSupplyReceiptModal'
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
  const { t } = useTranslation('cleanerPortal')
  const showNotification = useNotificationStore((state) => state.showNotification)
  const { profile } = useUserStore()
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
  // Blob URLs shown in place of item.photoUrl while an upload is in flight, keyed by itemId.
  const [optimisticItemPhotos, setOptimisticItemPhotos] = useState<Map<string, string>>(new Map())
  const [completing, setCompleting] = useState(false)

  // Walkthrough state
  const [walkthrough, setWalkthrough] = useState<ProjectWalkthrough | null>(null)
  const [walkthroughLoading, setWalkthroughLoading] = useState(false)
  const [optimisticPhotos, setOptimisticPhotos] = useState<OptimisticPhoto[]>([])
  const [missingGroupIds, setMissingGroupIds] = useState<Set<string>>(new Set())
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set())
  const hasSeededExpansion = useRef(false)

  // Walkthrough photo selection + delete-confirmation state
  const [walkthroughSelectionMode, setWalkthroughSelectionMode] = useState(false)
  const [selectedWalkthroughIds, setSelectedWalkthroughIds] = useState<Set<string>>(new Set())
  // Photos queued for deletion, awaiting confirmation (single or bulk).
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null)

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
        showNotification(res.message || t('failedToLoadChecklist'), 'error')
      }
    } catch (err) {
      console.error('Error fetching checklist:', err)
      showNotification(t('errorLoadingChecklist'), 'error')
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

  const fetchWalkthrough = useCallback(async (silent = false) => {
    if (!project.id) return
    if (!silent) setWalkthroughLoading(true)
    try {
      const res = await getProjectWalkthrough(project.id)
      if (res.status === 'success') {
        setWalkthrough(res.data)
        // Seed expansion state the first time we load: expand every group that
        // has at least one missing photo so the cleaner immediately sees what
        // needs doing. Preserves manual collapse state on subsequent refetches.
        if (!hasSeededExpansion.current) {
          hasSeededExpansion.current = true
          const toExpand = new Set<string>()
          for (const g of res.data.effectiveTemplate.groups) {
            const hasMissing =
              g.items.length > 0
                ? g.items.some(it => it.photos.length === 0)
                : g.photos.length === 0
            if (hasMissing) toExpand.add(g.id)
          }
          setExpandedGroupIds(toExpand)
        }
      }
    } catch (err) {
      console.error('Error fetching walkthrough:', err)
    } finally {
      if (!silent) setWalkthroughLoading(false)
    }
  }, [project.id])

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
        showNotification(res.message || t('failedToUpdateItem'), 'error')
      }
    } catch (err) {
      setItems(previousItems)
      console.error('Error updating checklist item:', err)
      showNotification(t('errorUpdatingItem'), 'error')
    } finally {
      setTogglingItems(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const handlePhotoUpload = async (itemId: string, file: File) => {
    if (uploadingItems.has(itemId)) return // mirrors handleToggleItem's re-entrancy guard

    const validation = isValidPhotoFile(file)
    if (!validation.ok) {
      showNotification(t(validation.reason === 'size' ? 'fileTooLarge' : 'invalidFileType'), 'error')
      return
    }

    // Optimistic preview: blob URL shown in the row's photo slot until the server responds.
    const blobUrl = URL.createObjectURL(file)
    setOptimisticItemPhotos(prev => {
      const next = new Map(prev)
      const prior = prev.get(itemId)
      if (prior) URL.revokeObjectURL(prior) // avoid leaking when a replacement upload happens
      next.set(itemId, blobUrl)
      return next
    })
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
      } else {
        showNotification(res.message || t('failedToUploadPhoto'), 'error')
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
      showNotification(t('errorUploadingPhoto'), 'error')
    } finally {
      setOptimisticItemPhotos(prev => {
        const next = new Map(prev)
        next.delete(itemId)
        return next
      })
      URL.revokeObjectURL(blobUrl)
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

    // Capture only the photo fields so a rollback preserves any concurrent
    // toggle changes to this or other items.
    const photoSnapshot = {
      photoUrl: item.photoUrl,
      photoTakenAt: item.photoTakenAt,
      photoUploadedAt: item.photoUploadedAt,
    }

    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, photoUrl: null, photoTakenAt: null, photoUploadedAt: null } : i
    ))
    if (item.requiresPhoto) {
      setProgress(prev => prev ? { ...prev, photosUploaded: Math.max(0, prev.photosUploaded - 1) } : prev)
    }

    const rollback = () => {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...photoSnapshot } : i))
      if (item.requiresPhoto) {
        setProgress(prev => prev ? { ...prev, photosUploaded: prev.photosUploaded + 1 } : prev)
      }
    }

    try {
      const res = await deleteProjectChecklistItemPhoto(project.id, itemId)
      if (res.status !== 'success') {
        rollback()
        showNotification(res.message || t('failedToDeletePhoto'), 'error')
      }
    } catch (err) {
      console.error('Error deleting photo:', err)
      rollback()
      showNotification(t('errorDeletingPhoto'), 'error')
    }
  }

  const handleWalkthroughUpload = async (target: WalkthroughUploadTarget, files: File[]) => {
    if (files.length === 0) return
    const key = targetKey(target)

    // Create optimistic photos with blob URLs — shown instantly
    const newOptimistic: OptimisticPhoto[] = files.map(file => ({
      _optimistic: true as const,
      tempId: crypto.randomUUID(),
      blobUrl: URL.createObjectURL(file),
      targetKey: key,
    }))
    setOptimisticPhotos(prev => [...prev, ...newOptimistic])

    // Upload in background — button stays enabled for back-to-back captures
    try {
      const opts =
        target.kind === 'freeform'
          ? undefined
          : target.kind === 'item'
            ? { groupId: target.groupId, itemId: target.itemId }
            : { groupId: target.groupId }
      const res = await uploadWalkthroughPhotos(project.id, files, opts)
      if (res.status === 'success') {
        showNotification(
          t('photosUploadedCount', { count: files.length }),
          'success'
        )
        await fetchWalkthrough(true)
        // Clear any missing-group highlight for this group now that it has a photo
        if (target.kind !== 'freeform' && target.groupId) {
          setMissingGroupIds(prev => {
            if (!prev.has(target.groupId)) return prev
            const next = new Set(prev)
            next.delete(target.groupId)
            return next
          })
        }
      } else {
        showNotification(res.message || t('failedToUploadPhotos'), 'error')
      }
    } catch (err) {
      console.error('Error uploading walkthrough photos:', err)
      showNotification(
        err instanceof Error ? err.message : t('errorUploadingPhotos'),
        'error'
      )
    } finally {
      // Remove this batch's optimistic photos and revoke blob URLs
      setOptimisticPhotos(prev => {
        const tempIds = new Set(newOptimistic.map(n => n.tempId))
        return prev.filter(p => !tempIds.has(p.tempId))
      })
      newOptimistic.forEach(p => URL.revokeObjectURL(p.blobUrl))
    }
  }

  // Queue photo(s) for deletion — opens the confirmation modal. Used by both
  // the per-photo trash icon (single) and the selection toolbar (bulk).
  const requestWalkthroughDelete = useCallback((photoIds: string[]) => {
    if (photoIds.length > 0) setPendingDeleteIds(photoIds)
  }, [])

  // Selection handlers
  const toggleWalkthroughSelect = useCallback((photoId: string) => {
    setSelectedWalkthroughIds(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }, [])

  const setWalkthroughSelection = useCallback((photoIds: string[], selected: boolean) => {
    setSelectedWalkthroughIds(prev => {
      const next = new Set(prev)
      photoIds.forEach(id => { if (selected) next.add(id); else next.delete(id) })
      return next
    })
  }, [])

  const exitWalkthroughSelection = useCallback(() => {
    setWalkthroughSelectionMode(false)
    setSelectedWalkthroughIds(new Set())
  }, [])

  // Runs on confirm-modal confirm. Optimistically strips the photos, then hits
  // the server (single delete or bulk, with the bulk endpoint's built-in
  // fallback). On any failure it re-syncs from the server.
  const performWalkthroughDelete = useCallback(async () => {
    const ids = pendingDeleteIds
    if (!ids || ids.length === 0) return
    const idSet = new Set(ids)

    const strip = (photos: WalkthroughPhoto[]) => photos.filter(p => !idSet.has(p.id))
    setWalkthrough(prev => prev && ({
      ...prev,
      freeformPhotos: strip(prev.freeformPhotos),
      orphanedGroups: prev.orphanedGroups.map(g => ({ ...g, photos: strip(g.photos) })),
      effectiveTemplate: {
        ...prev.effectiveTemplate,
        groups: prev.effectiveTemplate.groups.map(g => ({
          ...g,
          photos: strip(g.photos),
          items: g.items.map(it => ({ ...it, photos: strip(it.photos) })),
        })),
      },
    }))

    try {
      if (ids.length === 1) {
        const res = await deleteWalkthroughPhoto(project.id, ids[0])
        if (res.status !== 'success') {
          await fetchWalkthrough(true)
          showNotification(res.message || t('failedToDeletePhoto'), 'error')
          return
        }
        showNotification(t('photoDeleted'), 'success')
      } else {
        const { deleted, failed } = await bulkDeleteWalkthroughPhotos(project.id, ids)
        if (failed.length > 0) {
          await fetchWalkthrough(true)
          showNotification(
            t('photosDeletedPartial', { deleted: deleted.length, total: ids.length, failed: failed.length }),
            'error'
          )
        } else {
          showNotification(t('photosDeleted', { count: deleted.length }), 'success')
        }
      }
    } catch (err) {
      console.error('Error deleting walkthrough photo(s):', err)
      await fetchWalkthrough(true) // server is source of truth on failure
      showNotification(t('errorDeletingPhoto'), 'error')
    } finally {
      setPendingDeleteIds(null)
      exitWalkthroughSelection()
    }
  }, [pendingDeleteIds, project.id, fetchWalkthrough, showNotification, t, exitWalkthroughSelection])

  const handleToggleWalkthroughGroup = useCallback((groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  // Walkthrough computed values
  const walkthroughRequired = walkthrough?.effectiveTemplate.requiresCompletion ?? false
  const walkthroughComplete = walkthrough?.isComplete ?? true
  // Badge: red warning when missing groups are flagged, otherwise a purple
  // count of groups/items still needing photos. No badge when complete.
  const walkthroughBadge: { text: string; variant: 'purple' | 'red' } | null = (() => {
    if (missingGroupIds.size > 0) {
      return { text: String(missingGroupIds.size), variant: 'red' }
    }
    if (!walkthroughRequired || walkthroughComplete || !walkthrough) return null
    const incompleteGroups = walkthrough.effectiveTemplate.groups.filter(g => {
      if (g.items.length === 0) return g.photos.length === 0
      return g.items.some(it => it.photos.length === 0)
    })
    if (incompleteGroups.length === 0) return null
    return { text: String(incompleteGroups.length), variant: 'purple' }
  })()

  const handleComplete = async () => {
    if (completing) return
    if (progress && progress.completedItems < progress.totalItems) {
      showNotification(t('pleaseCompleteAllItems'), 'error')
      return
    }
    if (progress && progress.photosUploaded < progress.photoRequired) {
      showNotification(t('pleaseUploadRequiredPhotos', { uploaded: progress.photosUploaded, required: progress.photoRequired }), 'error')
      return
    }

    setCompleting(true)
    try {
      const res = await completeProject(project.id)
      if (res.status === 'success') {
        showNotification(t('projectCompleted'), 'success')
        onProjectComplete?.(res.data)
        onClose()
      } else {
        showNotification(res.message || t('failedToComplete'), 'error')
      }
    } catch (err) {
      // Walkthrough completion gate: backend returns 400 with
      // { message, missingGroups: string[] } when requiresCompletion is on
      // and groups are missing photos.
      const missingNames = getMissingGroupsFromError(err)
      if (missingNames && missingNames.length > 0 && walkthrough) {
        const idsByName = new Set(missingNames)
        const missingIds = new Set(
          walkthrough.effectiveTemplate.groups
            .filter(g => idsByName.has(g.name))
            .map(g => g.id)
        )
        setMissingGroupIds(missingIds)
        // Auto-expand the missing groups so the cleaner sees them immediately
        setExpandedGroupIds(prev => {
          const next = new Set(prev)
          missingIds.forEach(id => next.add(id))
          return next
        })
        setActiveTab('walkthrough')
        showNotification(
          t('uploadWalkthroughPhotos', { groups: missingNames.join(', ') }),
          'error'
        )
      } else {
        showNotification(
          err instanceof Error ? err.message : t('errorCompletingTask'),
          'error'
        )
      }
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
          {t('pmOverrideActive')}
        </div>
      )}
      <ChecklistTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        issueCount={issueCount}
        supplyListCount={supplyListCount}
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
            optimisticItemPhotos={optimisticItemPhotos}
            readOnly={readOnly}
          />
        ) : activeTab === 'walkthrough' ? (
          <WalkthroughContent
            walkthrough={walkthrough}
            loading={walkthroughLoading}
            canEdit={!readOnly}
            uploadingKey={null}
            onUpload={handleWalkthroughUpload}
            onDelete={(photoId) => requestWalkthroughDelete([photoId])}
            onViewPhoto={setViewingImage}
            missingGroupIds={missingGroupIds}
            expandedGroupIds={expandedGroupIds}
            onToggleGroup={handleToggleWalkthroughGroup}
            optimisticPhotos={optimisticPhotos}
            selectionMode={walkthroughSelectionMode}
            selectedPhotoIds={selectedWalkthroughIds}
            onToggleSelect={toggleWalkthroughSelect}
            onSetSelection={setWalkthroughSelection}
            onEnterSelectionMode={() => setWalkthroughSelectionMode(true)}
            onExitSelectionMode={exitWalkthroughSelection}
            onRequestDeleteSelected={() => requestWalkthroughDelete([...selectedWalkthroughIds])}
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
        walkthroughComplete={walkthroughComplete}
        walkthroughRequired={walkthroughRequired}
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
          showNotification(t('issueReportedSuccess'), 'success')
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

      <ScanSupplyReceiptModal
        isOpen={showScanReceiptModal}
        onClose={() => setShowScanReceiptModal(false)}
        properties={[{ id: project.propertyId, listingName: project.propertyName || '' }]}
        defaultPropertyId={project.propertyId}
        defaultProjectId={project.id}
        autoApply
        paidByType="CLEANER"
        paidById={profile?.id || null}
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
                alt={t('fullSizePhoto')}
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
                {t('openInNewTab')}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteWalkthroughPhotosModal
        isOpen={pendingDeleteIds !== null}
        count={pendingDeleteIds?.length ?? 0}
        onClose={() => setPendingDeleteIds(null)}
        onConfirm={performWalkthroughDelete}
      />
    </>
  )
}
