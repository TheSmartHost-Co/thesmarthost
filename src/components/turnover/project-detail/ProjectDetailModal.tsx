'use client'

import { notifyError } from '@/utils/notify'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarDaysIcon,
  PlusIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import AuditHistoryPanel from '@/components/audit/AuditHistoryPanel'
import {
  assignCleanerToProject,
  cancelCleaningProject,
  overrideCleaningProject,
  removeCleaningProjectOverride,
  unstartProject,
  getStatusDisplay,
  isProjectOverdue,
  getOverdueMinutes,
  formatOverdueDuration,
  getProjectChecklist,
  updateProjectChecklistItem,
  initializeProjectChecklist,
  getProjectWalkthrough,
  uploadWalkthroughPhotos,
  deleteWalkthroughPhoto,
  bulkDeleteWalkthroughPhotos,
} from '@/services/cleaningProjectService'
import { getIssueCounts, getIssuesByProject } from '@/services/projectIssueService'
import { getSupplyListsByProject } from '@/services/supplyListService'
import type { SupplyList } from '@/services/types/supplyList'
import { getPendingTimeChangeRequest, approveTimeChangeRequest, rejectTimeChangeRequest } from '@/services/timeChangeRequestService'
import type { TimeChangeRequest } from '@/services/types/timeChangeRequest'
import type { IssueCounts, ProjectIssue } from '@/services/types/projectIssue'
import type { ProjectChecklistItem, ChecklistProgress, ProjectWalkthrough, CleaningProjectStatus } from '@/services/types/cleaningProject'
import { type WalkthroughUploadTarget, type OptimisticPhoto, targetKey } from '@/components/walkthrough/WalkthroughAccordion'
import DeleteWalkthroughPhotosModal from '@/components/walkthrough/DeleteWalkthroughPhotosModal'
import ProjectPhotos from './photos/ProjectPhotos'
import EditProjectModal from '../update/EditProjectModal'
import DeleteProjectModal from '../delete/DeleteProjectModal'
import { ReportIssueModal, ViewIssuesModal } from '../issues'
import { SubmitSupplyListModal, ViewSupplyListsModal } from '../supply-lists'
import ScanSupplyReceiptModal from '@/components/supply-hub/ScanSupplyReceiptModal'
import PreviewBookingModal from '@/components/booking/preview/previewBookingModal'
import { getBookingById } from '@/services/bookingService'
import type { Booking } from '@/services/types/booking'
import { useUserStore } from '@/store/useUserStore'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import type { Property } from '@/services/types/property'
import { formatProjectDate } from '../utils/formatUtils'
import { type TabId } from './types'
import TabBar, { type TabBarItem } from './TabBar'
import StatusHeader from './sections/StatusHeader'
import TimeChangeRequestBanner from './sections/TimeChangeRequestBanner'
import PropertyCard from './sections/PropertyCard'
import CleanerCard from './sections/CleanerCard'
import RelatedBookings from './sections/RelatedBookings'
import NotesSection from './sections/NotesSection'
import ChecklistSection from './sections/ChecklistSection'
import SupplyListsSection from './sections/SupplyListsSection'
import IssuesSection from './sections/IssuesSection'
import FooterActions from './sections/FooterActions'
import { CancelProjectConfirm, UnbeginProjectConfirm, OverrideProjectConfirm } from './modals/ConfirmModals'

interface ProjectDetailModalProps {
  isOpen: boolean
  onClose: () => void
  project: CleaningProject
  cleaners: Cleaner[]
  properties: Property[]
  onUpdate: (project: CleaningProject) => void
  onDelete?: (id: string) => void
  onCancel?: (id: string) => void
  initialSection?: 'issues' | 'supplies' | null
}

export default function ProjectDetailModal({
  isOpen,
  onClose,
  project,
  cleaners,
  properties,
  onUpdate,
  onDelete,
  onCancel,
  initialSection,
}: ProjectDetailModalProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)
  const user = useUserStore((state) => state.profile)
  const { canWrite, isPM } = usePermissions()
  const hasWrite = canWrite('turnover')
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedCleanerId, setSelectedCleanerId] = useState(project.cleanerId || '')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancellingProject, setCancellingProject] = useState(false)
  const [showUnbeginConfirm, setShowUnbeginConfirm] = useState(false)
  const [unbeginning, setUnbeginning] = useState(false)
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false)
  const [overrideTarget, setOverrideTarget] = useState<string>('confirmed')
  const [overriding, setOverriding] = useState(false)

  // Active tab — Overview by default; deep links select their tab on open
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  // Booking preview state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingPreview, setShowBookingPreview] = useState(false)
  const [loadingBookingId, setLoadingBookingId] = useState<string | null>(null)

  // Issues state
  const [issueCounts, setIssueCounts] = useState<IssueCounts | null>(null)
  const [showReportIssueModal, setShowReportIssueModal] = useState(false)
  const [showViewIssuesModal, setShowViewIssuesModal] = useState(false)

  // Supply lists state
  const [supplyListCount, setSupplyListCount] = useState(0)
  const [showSubmitSupplyListModal, setShowSubmitSupplyListModal] = useState(false)
  const [showViewSupplyListsModal, setShowViewSupplyListsModal] = useState(false)
  const [showScanReceiptModal, setShowScanReceiptModal] = useState(false)
  const [scanReceiptForList, setScanReceiptForList] = useState<SupplyList | null>(null)

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ProjectChecklistItem[]>([])
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress | null>(null)
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false)
  const [isInitializingChecklist, setIsInitializingChecklist] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  // Project issues (for photo gallery)
  const [projectIssues, setProjectIssues] = useState<ProjectIssue[]>([])

  // Walkthrough state
  const [walkthrough, setWalkthrough] = useState<ProjectWalkthrough | null>(null)
  const [pmOptimisticPhotos, setPmOptimisticPhotos] = useState<OptimisticPhoto[]>([])
  const [walkthroughExpandedGroups, setWalkthroughExpandedGroups] = useState<Set<string>>(new Set())
  // Walkthrough photo selection + delete-confirmation state
  const [walkthroughSelectionMode, setWalkthroughSelectionMode] = useState(false)
  const [selectedWalkthroughIds, setSelectedWalkthroughIds] = useState<Set<string>>(new Set())
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null)

  // Time change request state
  const [pendingRequest, setPendingRequest] = useState<TimeChangeRequest | null>(null)
  const [isResolvingRequest, setIsResolvingRequest] = useState(false)
  const [rejectionNotes, setRejectionNotes] = useState('')

  // Deep links land on their tab; otherwise every open starts on Overview.
  useEffect(() => {
    if (!isOpen) return
    setActiveTab(initialSection === 'issues' ? 'issues' : initialSection === 'supplies' ? 'supplies' : 'overview')
  }, [isOpen, initialSection])

  // Fetch issue counts when modal opens
  const fetchIssueCounts = useCallback(async () => {
    if (!project.id) return
    try {
      const res = await getIssueCounts(project.id)
      if (res.status === 'success') {
        setIssueCounts(res.data)
      }
    } catch (err) {
      console.error('Error fetching issue counts:', err)
    }
  }, [project.id])

  // Fetch supply list count when modal opens
  const fetchSupplyListCount = useCallback(async () => {
    if (!project.id) return
    try {
      const res = await getSupplyListsByProject(project.id)
      if (res.status === 'success') {
        setSupplyListCount(res.data.length)
      }
    } catch (err) {
      console.error('Error fetching supply list count:', err)
    }
  }, [project.id])

  // Fetch project issues (for photo gallery)
  const fetchProjectIssues = useCallback(async () => {
    if (!project.id) return
    try {
      const res = await getIssuesByProject(project.id)
      if (res.status === 'success') {
        setProjectIssues(res.data)
      }
    } catch (err) {
      console.error('Error fetching project issues:', err)
    }
  }, [project.id])

  // Fetch checklist items when modal opens
  const fetchChecklist = useCallback(async () => {
    if (!project.id) return
    setIsLoadingChecklist(true)
    try {
      const res = await getProjectChecklist(project.id)
      if (res.status === 'success') {
        setChecklistItems(res.data.items)
        setChecklistProgress(res.data.progress)
      }
    } catch (err) {
      console.error('Error fetching checklist:', err)
    } finally {
      setIsLoadingChecklist(false)
    }
  }, [project.id])

  // Fetch pending time change request
  const fetchPendingRequest = useCallback(async () => {
    if (!project.id) return
    try {
      const res = await getPendingTimeChangeRequest(project.id)
      if (res.status === 'success') {
        setPendingRequest(res.data)
        setRejectionNotes('')
      }
    } catch (err) {
      console.error('Error fetching pending time change request:', err)
    }
  }, [project.id])

  // Approve time change request
  const handleApproveRequest = async () => {
    if (!pendingRequest || isResolvingRequest) return
    setIsResolvingRequest(true)
    try {
      const res = await approveTimeChangeRequest(project.id, pendingRequest.id)
      if (res.status === 'success') {
        showNotification(t('timeChangeApproved'), 'success')
        setPendingRequest(null)
        // Merge updated fields into existing project to preserve joined data (cleaner name, property name, etc.)
        onUpdate({ ...project, ...res.data.project })
      } else {
        showNotification(res.message || t('failedToApproveRequest'), 'error')
      }
    } catch (err) {
      console.error('Error approving time change request:', err)
      notifyError(err, t('errorApprovingRequest'))
    } finally {
      setIsResolvingRequest(false)
    }
  }

  // Reject time change request
  const handleRejectRequest = async () => {
    if (!pendingRequest || isResolvingRequest) return
    setIsResolvingRequest(true)
    try {
      const res = await rejectTimeChangeRequest(project.id, pendingRequest.id, {
        pmNotes: rejectionNotes.trim() || undefined,
      })
      if (res.status === 'success') {
        showNotification(t('timeChangeRejected'), 'success')
        setPendingRequest(null)
        setRejectionNotes('')
      } else {
        showNotification(res.message || t('failedToRejectRequest'), 'error')
      }
    } catch (err) {
      console.error('Error rejecting time change request:', err)
      notifyError(err, t('errorRejectingRequest'))
    } finally {
      setIsResolvingRequest(false)
    }
  }

  // Initialize checklist from template
  const handleInitializeChecklist = async () => {
    if (!project.id || !project.checklistId) return
    setIsInitializingChecklist(true)
    try {
      const res = await initializeProjectChecklist(project.id)
      if (res.status === 'success') {
        showNotification(t('checklistInitialized', { count: res.data.initialized }), 'success')
        await fetchChecklist()
      } else {
        showNotification(res.message || t('failedToInitializeChecklist'), 'error')
      }
    } catch (err) {
      console.error('Error initializing checklist:', err)
      notifyError(err, t('errorInitializingChecklist'))
    } finally {
      setIsInitializingChecklist(false)
    }
  }

  // Toggle checklist item completion
  const handleToggleItem = async (item: ProjectChecklistItem) => {
    setUpdatingItemId(item.id)
    try {
      const res = await updateProjectChecklistItem(project.id, item.id, {
        isCompleted: !item.isCompleted,
      })
      if (res.status === 'success') {
        // Update local state
        setChecklistItems(prev =>
          prev.map(i => i.id === item.id ? res.data : i)
        )
        // Refresh progress
        await fetchChecklist()
      } else {
        showNotification(res.message || t('failedToUpdateChecklistItem'), 'error')
      }
    } catch (err) {
      console.error('Error updating checklist item:', err)
      notifyError(err, t('errorUpdatingChecklistItem'))
    } finally {
      setUpdatingItemId(null)
    }
  }

  // View a related booking
  const handleViewBooking = async (bookingId: string) => {
    if (!user?.id || loadingBookingId) return
    setLoadingBookingId(bookingId)
    try {
      const res = await getBookingById(bookingId, user.id)
      if (res.status === 'success') {
        setSelectedBooking(res.data)
        setShowBookingPreview(true)
      } else {
        showNotification(res.message || t('failedToLoadBooking'), 'error')
      }
    } catch (err) {
      console.error('Error fetching booking:', err)
      notifyError(err, t('errorLoadingBookingDetails'))
    } finally {
      setLoadingBookingId(null)
    }
  }

  // Fetch walkthrough (no longer gated on checklistId — walkthroughs are independent)
  const fetchWalkthrough = useCallback(async () => {
    if (!project.id) return
    try {
      const res = await getProjectWalkthrough(project.id)
      if (res.status === 'success') {
        setWalkthrough(res.data)
        // Seed expansion to show all groups on first load
        setWalkthroughExpandedGroups(prev => {
          if (prev.size > 0) return prev
          return new Set(res.data.effectiveTemplate.groups.map(g => g.id))
        })
      }
    } catch (err) {
      console.error('Error fetching walkthrough:', err)
    }
  }, [project.id])

  const handlePmWalkthroughUpload = async (target: WalkthroughUploadTarget, files: File[]) => {
    if (files.length === 0) return
    const key = targetKey(target)

    // Create optimistic photos with blob URLs — shown instantly
    const newOptimistic: OptimisticPhoto[] = files.map(file => ({
      _optimistic: true as const,
      tempId: crypto.randomUUID(),
      blobUrl: URL.createObjectURL(file),
      targetKey: key,
    }))
    setPmOptimisticPhotos(prev => [...prev, ...newOptimistic])

    try {
      const opts =
        target.kind === 'freeform'
          ? undefined
          : target.kind === 'item'
            ? { groupId: target.groupId, itemId: target.itemId }
            : { groupId: target.groupId }
      const res = await uploadWalkthroughPhotos(project.id, files, opts)
      if (res.status === 'success') {
        showNotification(t('photosUploaded', { count: files.length }), 'success')
        await fetchWalkthrough()
      } else {
        showNotification(res.message || t('failedToUploadWalkthroughPhotos'), 'error')
      }
    } catch (err) {
      console.error('Error uploading walkthrough photos:', err)
      notifyError(err, t('errorUploadingWalkthroughPhotos'))
    } finally {
      // Remove this batch's optimistic photos and revoke blob URLs
      setPmOptimisticPhotos(prev => {
        const tempIds = new Set(newOptimistic.map(n => n.tempId))
        return prev.filter(p => !tempIds.has(p.tempId))
      })
      newOptimistic.forEach(p => URL.revokeObjectURL(p.blobUrl))
    }
  }

  // Queue photo(s) for deletion — opens the confirmation modal (single or bulk).
  const requestPmWalkthroughDelete = useCallback((photoIds: string[]) => {
    if (photoIds.length > 0) setPendingDeleteIds(photoIds)
  }, [])

  const togglePmWalkthroughSelect = useCallback((photoId: string) => {
    setSelectedWalkthroughIds(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }, [])

  const setPmWalkthroughSelection = useCallback((photoIds: string[], selected: boolean) => {
    setSelectedWalkthroughIds(prev => {
      const next = new Set(prev)
      photoIds.forEach(id => { if (selected) next.add(id); else next.delete(id) })
      return next
    })
  }, [])

  const exitPmWalkthroughSelection = useCallback(() => {
    setWalkthroughSelectionMode(false)
    setSelectedWalkthroughIds(new Set())
  }, [])

  // Runs on confirm. PM side keeps the simpler refetch-after pattern (no
  // optimistic strip) — same as the original single-delete handler.
  const performPmWalkthroughDelete = useCallback(async () => {
    const ids = pendingDeleteIds
    if (!ids || ids.length === 0) return
    try {
      if (ids.length === 1) {
        const res = await deleteWalkthroughPhoto(project.id, ids[0])
        if (res.status === 'success') {
          showNotification(t('photoDeletedSuccess'), 'success')
        } else {
          showNotification(res.message || t('failedToDeleteWalkthroughPhoto'), 'error')
        }
      } else {
        const { deleted, failed } = await bulkDeleteWalkthroughPhotos(project.id, ids)
        if (failed.length > 0) {
          showNotification(
            t('photosDeletedPartial', { deleted: deleted.length, total: ids.length, failed: failed.length }),
            'error'
          )
        } else {
          showNotification(t('photosDeleted', { count: deleted.length }), 'success')
        }
      }
      await fetchWalkthrough()
    } catch (err) {
      console.error('Error deleting walkthrough photo(s):', err)
      notifyError(err, t('errorDeletingWalkthroughPhoto'))
    } finally {
      setPendingDeleteIds(null)
      exitPmWalkthroughSelection()
    }
  }, [pendingDeleteIds, project.id, fetchWalkthrough, showNotification, t, exitPmWalkthroughSelection])

  const handlePmWalkthroughToggleGroup = useCallback((groupId: string) => {
    setWalkthroughExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchIssueCounts()
      fetchChecklist()
      fetchSupplyListCount()
      fetchPendingRequest()
      fetchProjectIssues()
      fetchWalkthrough()
    }
  }, [isOpen, fetchIssueCounts, fetchChecklist, fetchSupplyListCount, fetchPendingRequest, fetchProjectIssues, fetchWalkthrough])

  const statusDisplay = getStatusDisplay(project.status)

  // Handle cleaner assignment
  const handleAssignCleaner = async () => {
    if (!selectedCleanerId) {
      showNotification(t('pleaseSelectCleaner'), 'error')
      return
    }

    setIsAssigning(true)
    try {
      const res = await assignCleanerToProject(project.id, { cleanerId: selectedCleanerId })
      if (res.status === 'success') {
        showNotification(t('cleanerAssignedSuccess'), 'success')
        onUpdate(res.data)
      } else {
        showNotification(res.message || t('failedToAssignCleaner'), 'error')
      }
    } catch (err) {
      console.error('Error assigning cleaner:', err)
      notifyError(err, t('errorAssigningCleaner'))
    } finally {
      setIsAssigning(false)
    }
  }

  const handleCancelProject = async () => {
    if (!user?.id) return
    try {
      setCancellingProject(true)
      const res = await cancelCleaningProject(project.id, user.id)
      if (res.status === 'success') {
        showNotification(t('projectCancelledSuccess'), 'success')
        setShowCancelConfirm(false)
        if (onCancel) {
          onCancel(project.id)
        }
        onClose()
      } else {
        showNotification(res.message || t('failedToCancelProject'), 'error')
      }
    } catch (err) {
      console.error('Error cancelling project:', err)
      notifyError(err, t('failedToCancelProject'))
    } finally {
      setCancellingProject(false)
    }
  }

  const handleUnbeginProject = async () => {
    try {
      setUnbeginning(true)
      const res = await unstartProject(project.id)
      if (res.status === 'success') {
        showNotification(t('projectRevertedToConfirmedPm'), 'success')
        setShowUnbeginConfirm(false)
        onUpdate(res.data)
      } else {
        showNotification(res.message || t('failedToUnbeginProject'), 'error')
      }
    } catch (err) {
      console.error('Error unbeginning project:', err)
      showNotification(t('failedToUnbeginProject'), 'error')
    } finally {
      setUnbeginning(false)
    }
  }

  const handleOverrideProject = async () => {
    if (!user?.id) return
    try {
      setOverriding(true)
      const res = await overrideCleaningProject(project.id, user.id, overrideTarget as CleaningProjectStatus)
      if (res.status === 'success') {
        showNotification(t('projectOverridden', { status: overrideTarget }), 'success')
        setShowOverrideConfirm(false)
        onUpdate(res.data)
      } else {
        showNotification(res.message || t('overrideFailed'), 'error')
      }
    } catch (err) {
      console.error('Error overriding project:', err)
      notifyError(err, t('errorOverridingProject'))
    } finally {
      setOverriding(false)
    }
  }

  const handleRemoveOverride = async () => {
    if (!user?.id) return
    try {
      const res = await removeCleaningProjectOverride(project.id, user.id)
      if (res.status === 'success') {
        showNotification(t('overrideRemovedSuccess'), 'success')
        onUpdate(res.data)
      } else {
        showNotification(res.message || t('failedToRemoveOverride'), 'error')
      }
    } catch (err) {
      console.error('Error removing override:', err)
      notifyError(err, t('errorRemovingOverride'))
    }
  }

  // Overdue detection
  const overdue = isProjectOverdue(project)
  const overdueMinutes = getOverdueMinutes(project)
  const overdueLabel = overdue && overdueMinutes !== null ? formatOverdueDuration(overdueMinutes) : null

  const showAudit = isPM && !!project.id

  const checklistComplete =
    !!checklistProgress && checklistProgress.totalItems > 0 &&
    checklistProgress.completedItems === checklistProgress.totalItems

  const countPill = (content: string, highlight?: 'green' | 'red') => (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
      highlight === 'green' ? 'bg-green-100 text-green-700'
        : highlight === 'red' ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-600'
    }`}>
      {content}
    </span>
  )

  const tabs: TabBarItem[] = [
    { id: 'overview', label: t('overviewLabel') },
    {
      id: 'checklist',
      label: t('checklistLabel'),
      badge: checklistProgress && checklistProgress.totalItems > 0
        ? countPill(`${checklistProgress.completedItems}/${checklistProgress.totalItems}`, checklistComplete ? 'green' : undefined)
        : undefined,
    },
    { id: 'photos', label: t('photosLabel') },
    {
      id: 'supplies',
      label: t('supplyListsLabel'),
      badge: supplyListCount > 0 ? countPill(String(supplyListCount)) : undefined,
    },
    {
      id: 'issues',
      label: t('issuesLabel'),
      badge: issueCounts && issueCounts.total > 0
        ? countPill(String(issueCounts.total), issueCounts.open > 0 ? 'red' : undefined)
        : undefined,
    },
    ...(showAudit ? [{ id: 'audit' as TabId, label: t('auditLabel') }] : []),
  ]

  const panelClass = (id: TabId) => `h-full overflow-y-auto px-6 py-5 ${activeTab === id ? '' : 'hidden'}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      boxClassName="bg-white shadow-lg overflow-hidden flex flex-col w-full h-[100dvh] rounded-none sm:h-[85vh] sm:w-11/12 sm:max-w-4xl sm:rounded-lg sm:mx-2"
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Header + status badges + banner — one fixed chrome block */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <CalendarDaysIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('projectDetails')}</h2>
              <p className="text-sm text-gray-500">{formatProjectDate(project.projectDate)}</p>
            </div>
          </div>

          <div className="mt-2.5">
            <StatusHeader
              project={project}
              statusLabel={statusDisplay.label}
              statusColor={statusDisplay.color}
              overdue={overdue}
              overdueLabel={overdueLabel}
            />
          </div>

          {pendingRequest && (
            <div className="mt-2.5">
              <TimeChangeRequestBanner
                request={pendingRequest}
                hasWrite={hasWrite}
                isResolving={isResolvingRequest}
                rejectionNotes={rejectionNotes}
                onRejectionNotesChange={setRejectionNotes}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
              />
            </div>
          )}
        </div>

        <TabBar tabs={tabs} activeId={activeTab} onSelect={setActiveTab} />

        {/* Panels — all mounted so per-tab state and scroll survive switching */}
        <div className="flex-1 min-h-0">
          <div className={panelClass('overview')}>
            <div className="space-y-5">
              {/* Property & Cleaner — 2-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PropertyCard project={project} />
                <CleanerCard
                  project={project}
                  cleaners={cleaners}
                  hasWrite={hasWrite}
                  selectedCleanerId={selectedCleanerId}
                  onSelectedCleanerIdChange={setSelectedCleanerId}
                  isAssigning={isAssigning}
                  onAssign={handleAssignCleaner}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <CalendarDaysIcon className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">{t('relatedBookingsLabel')}</span>
                </div>
                <RelatedBookings project={project} loadingBookingId={loadingBookingId} onViewBooking={handleViewBooking} />
              </div>

              {project.pmNotes && <NotesSection variant="pm" text={project.pmNotes} />}
              {project.cleanerNotes && <NotesSection variant="cleaner" text={project.cleanerNotes} />}
            </div>
          </div>

          <div className={panelClass('checklist')}>
            <ChecklistSection
              items={checklistItems}
              isLoading={isLoadingChecklist}
              hasTemplate={!!project.checklistId}
              updatingItemId={updatingItemId}
              onToggleItem={handleToggleItem}
              isInitializing={isInitializingChecklist}
              onInitialize={handleInitializeChecklist}
            />
          </div>

          {/* Photos — unified segmented area (walkthrough / checklist / issues) */}
          <div className={panelClass('photos')}>
            <ProjectPhotos
              project={project}
              walkthrough={walkthrough}
              checklistItems={checklistItems}
              projectIssues={projectIssues}
              canEdit
              onChecklistRefetch={fetchChecklist}
              onIssuesRefetch={fetchProjectIssues}
              walkthroughControls={{
                uploadingKey: null,
                optimisticPhotos: pmOptimisticPhotos,
                expandedGroupIds: walkthroughExpandedGroups,
                selectionMode: walkthroughSelectionMode,
                selectedPhotoIds: selectedWalkthroughIds,
                onUpload: handlePmWalkthroughUpload,
                onDelete: (photoId) => requestPmWalkthroughDelete([photoId]),
                onToggleGroup: handlePmWalkthroughToggleGroup,
                onToggleSelect: togglePmWalkthroughSelect,
                onSetSelection: setPmWalkthroughSelection,
                onEnterSelectionMode: () => setWalkthroughSelectionMode(true),
                onExitSelectionMode: exitPmWalkthroughSelection,
                onRequestDeleteSelected: () => requestPmWalkthroughDelete([...selectedWalkthroughIds]),
              }}
            />
          </div>

          <div className={panelClass('supplies')}>
            {supplyListCount > 0 && (
              <div className="flex items-center justify-end gap-1.5 mb-3">
                <button
                  onClick={() => setShowSubmitSupplyListModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  {t('requestButton')}
                </button>
                <button
                  onClick={() => setShowScanReceiptModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <CameraIcon className="w-3.5 h-3.5" />
                  {t('scanReceipt')}
                </button>
              </div>
            )}
            <SupplyListsSection
              count={supplyListCount}
              onView={() => setShowViewSupplyListsModal(true)}
              onRequest={() => setShowSubmitSupplyListModal(true)}
            />
          </div>

          <div className={panelClass('issues')}>
            {issueCounts && issueCounts.total > 0 && (
              <div className="flex items-center justify-end gap-1.5 mb-3">
                <button
                  onClick={() => setShowReportIssueModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  {t('reportIssue')}
                </button>
              </div>
            )}
            <IssuesSection
              counts={issueCounts}
              onView={() => setShowViewIssuesModal(true)}
              onReport={() => setShowReportIssueModal(true)}
            />
          </div>

          {/* Audit Log — PM/ADMIN only */}
          {showAudit && (
            <div className={panelClass('audit')}>
              <AuditHistoryPanel entityType="cleaning_project" entityId={project.id} hideTitle />
            </div>
          )}
        </div>

        <FooterActions
          project={project}
          hasWrite={hasWrite}
          onDeleteClick={onDelete ? () => setShowDeleteModal(true) : undefined}
          onCancelClick={onCancel ? () => setShowCancelConfirm(true) : undefined}
          onUnbeginClick={() => setShowUnbeginConfirm(true)}
          onOverrideClick={() => setShowOverrideConfirm(true)}
          onRemoveOverride={handleRemoveOverride}
          onEditClick={() => setShowEditModal(true)}
          onClose={onClose}
        />
      </div>

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={(updatedProject) => {
          setShowEditModal(false)
          onUpdate(updatedProject)
        }}
        project={project}
        properties={properties}
        cleaners={cleaners}
      />

      {/* Delete Project Modal */}
      {onDelete && (
        <DeleteProjectModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          project={project}
          onDeleted={(id) => {
            setShowDeleteModal(false)
            onDelete(id)
            onClose()
          }}
        />
      )}

      <CancelProjectConfirm
        isOpen={showCancelConfirm}
        propertyName={project.propertyName}
        busy={cancellingProject}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelProject}
      />

      <UnbeginProjectConfirm
        isOpen={showUnbeginConfirm}
        propertyName={project.propertyName}
        busy={unbeginning}
        onClose={() => setShowUnbeginConfirm(false)}
        onConfirm={handleUnbeginProject}
      />

      <OverrideProjectConfirm
        isOpen={showOverrideConfirm}
        propertyName={project.propertyName}
        busy={overriding}
        target={overrideTarget}
        onTargetChange={setOverrideTarget}
        onClose={() => setShowOverrideConfirm(false)}
        onConfirm={handleOverrideProject}
      />

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={showReportIssueModal}
        onClose={() => setShowReportIssueModal(false)}
        projectId={project.id}
        cleanerId={project.cleanerId}
        onIssueCreated={() => {
          setShowReportIssueModal(false)
          fetchIssueCounts()
          fetchProjectIssues()
        }}
      />

      {/* View Issues Modal */}
      <ViewIssuesModal
        isOpen={showViewIssuesModal}
        onClose={() => setShowViewIssuesModal(false)}
        projectId={project.id}
        projectName={project.propertyName}
        isPM={true}
        onReportIssue={() => {
          setShowViewIssuesModal(false)
          setShowReportIssueModal(true)
        }}
        onIssuesChanged={() => { fetchIssueCounts(); fetchProjectIssues() }}
      />

      {/* Submit Supply List Modal */}
      <SubmitSupplyListModal
        isOpen={showSubmitSupplyListModal}
        onClose={() => setShowSubmitSupplyListModal(false)}
        projectId={project.id}
        cleanerId={project.cleanerId}
        onSubmitted={() => {
          setShowSubmitSupplyListModal(false)
          fetchSupplyListCount()
        }}
      />

      {/* View Supply Lists Modal */}
      <ViewSupplyListsModal
        isOpen={showViewSupplyListsModal}
        onClose={() => setShowViewSupplyListsModal(false)}
        projectId={project.id}
        projectName={project.propertyName}
        onSupplyListsChanged={fetchSupplyListCount}
        fulfilledBy={user?.id}
        onScanReceipt={(sl) => {
          setShowViewSupplyListsModal(false)
          setScanReceiptForList(sl)
          setShowScanReceiptModal(true)
        }}
      />

      {/* Scan Receipt Modal */}
      <ScanSupplyReceiptModal
        isOpen={showScanReceiptModal}
        onClose={() => {
          setShowScanReceiptModal(false)
          setScanReceiptForList(null)
        }}
        properties={[{ id: project.propertyId, listingName: project.propertyName || '' }]}
        defaultPropertyId={project.propertyId}
        defaultProjectId={project.id}
        supplyListId={scanReceiptForList?.id}
        supplyList={scanReceiptForList}
        autoApply
        onReceiptApplied={() => {
          setShowScanReceiptModal(false)
          setScanReceiptForList(null)
          fetchSupplyListCount()
        }}
      />

      {/* Preview Booking Modal */}
      {selectedBooking && (
        <PreviewBookingModal
          isOpen={showBookingPreview}
          onClose={() => {
            setShowBookingPreview(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
        />
      )}

      <DeleteWalkthroughPhotosModal
        isOpen={pendingDeleteIds !== null}
        count={pendingDeleteIds?.length ?? 0}
        onClose={() => setPendingDeleteIds(null)}
        onConfirm={performPmWalkthroughDelete}
      />
    </Modal>
  )
}
