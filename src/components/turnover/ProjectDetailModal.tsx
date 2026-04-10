'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  HomeModernIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  FlagIcon,
  PlusIcon,
  ClipboardDocumentCheckIcon,
  CameraIcon,
  CheckIcon,
  WifiIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  HomeIcon,
  PhotoIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  XCircleIcon,
  ArrowPathIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  assignCleanerToProject,
  updateCleaningProject,
  cancelCleaningProject,
  overrideCleaningProject,
  removeCleaningProjectOverride,
  unstartProject,
  getStatusDisplay,
  formatDuration,
  isProjectOverdue,
  getOverdueMinutes,
  formatOverdueDuration,
  getProjectChecklist,
  updateProjectChecklistItem,
  initializeProjectChecklist,
  groupChecklistItemsByRoom,
  getCompletionPercentage,
  downloadChecklistPhotoWatermarked,
  getProjectWalkthrough,
  uploadWalkthroughPhotos,
  deleteWalkthroughPhoto,
  downloadWalkthroughPhotoWatermarked,
} from '@/services/cleaningProjectService'
import { getIssueCounts, getIssuesByProject, getPhotoPublicUrl, downloadIssuePhotoWatermarked } from '@/services/projectIssueService'
import { getSupplyListsByProject } from '@/services/supplyListService'
import type { SupplyList } from '@/services/types/supplyList'
import { getPendingTimeChangeRequest, approveTimeChangeRequest, rejectTimeChangeRequest } from '@/services/timeChangeRequestService'
import type { TimeChangeRequest } from '@/services/types/timeChangeRequest'
import type { IssueCounts, ProjectIssue } from '@/services/types/projectIssue'
import type { ProjectChecklistItem, ChecklistProgress, ProjectWalkthrough, CleaningProjectStatus } from '@/services/types/cleaningProject'
import WalkthroughAccordion, { type WalkthroughUploadTarget } from '@/components/walkthrough/WalkthroughAccordion'
import EditProjectModal from './update/EditProjectModal'
import DeleteProjectModal from './delete/DeleteProjectModal'
import { ReportIssueModal, ViewIssuesModal } from './issues'
import { SubmitSupplyListModal, ViewSupplyListsModal } from './supply-lists'
import ScanSupplyReceiptModal from '@/components/supply-hub/ScanSupplyReceiptModal'
import ImagePreviewModal from '@/components/shared/ImagePreviewModal'
import PreviewBookingModal from '@/components/booking/preview/previewBookingModal'
import { getBookingById } from '@/services/bookingService'
import type { Booking } from '@/services/types/booking'
import { useUserStore } from '@/store/useUserStore'
import type { CleaningProject } from '@/services/types/cleaningProject'
import { parseLocalDate } from '@/utils/dateUtils'
import type { Cleaner } from '@/services/types/cleaner'
import type { Property } from '@/services/types/property'

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
  const showNotification = useNotificationStore((state) => state.showNotification)
  const user = useUserStore((state) => state.profile)
  const { canWrite } = usePermissions()
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
  const [showRelatedBookings, setShowRelatedBookings] = useState(true)

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
  const [previewImage, setPreviewImage] = useState<{
    url: string
    task: string
    photoTakenAt?: string | null
    photoUploadedAt?: string | null
    downloadFn?: () => Promise<void>
  } | null>(null)

  // Project issues (for photo gallery)
  const [projectIssues, setProjectIssues] = useState<ProjectIssue[]>([])

  // Walkthrough state
  const [walkthrough, setWalkthrough] = useState<ProjectWalkthrough | null>(null)
  const [walkthroughUploadingKey, setWalkthroughUploadingKey] = useState<string | null>(null)
  const [walkthroughExpandedGroups, setWalkthroughExpandedGroups] = useState<Set<string>>(new Set())

  // Time change request state
  const [pendingRequest, setPendingRequest] = useState<TimeChangeRequest | null>(null)
  const [isResolvingRequest, setIsResolvingRequest] = useState(false)
  const [rejectionNotes, setRejectionNotes] = useState('')

  // Auto-open sub-modal from deep link (fires once per mount)
  const initialSectionHandled = useRef(false)
  useEffect(() => {
    if (!isOpen || !initialSection || initialSectionHandled.current) return
    initialSectionHandled.current = true
    // Delay slightly so main modal renders first
    const timer = setTimeout(() => {
      if (initialSection === 'issues') setShowViewIssuesModal(true)
      else if (initialSection === 'supplies') setShowViewSupplyListsModal(true)
    }, 300)
    return () => clearTimeout(timer)
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
        showNotification('Time change request approved', 'success')
        setPendingRequest(null)
        // Merge updated fields into existing project to preserve joined data (cleaner name, property name, etc.)
        onUpdate({ ...project, ...res.data.project })
      } else {
        showNotification(res.message || 'Failed to approve request', 'error')
      }
    } catch (err) {
      console.error('Error approving time change request:', err)
      showNotification('Error approving request', 'error')
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
        showNotification('Time change request rejected', 'success')
        setPendingRequest(null)
        setRejectionNotes('')
      } else {
        showNotification(res.message || 'Failed to reject request', 'error')
      }
    } catch (err) {
      console.error('Error rejecting time change request:', err)
      showNotification('Error rejecting request', 'error')
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
        showNotification(`Initialized ${res.data.initialized} checklist items`, 'success')
        await fetchChecklist()
      } else {
        showNotification(res.message || 'Failed to initialize checklist', 'error')
      }
    } catch (err) {
      console.error('Error initializing checklist:', err)
      showNotification('Error initializing checklist', 'error')
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
        showNotification(res.message || 'Failed to update item', 'error')
      }
    } catch (err) {
      console.error('Error updating checklist item:', err)
      showNotification('Error updating item', 'error')
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
        showNotification(res.message || 'Failed to load booking', 'error')
      }
    } catch (err) {
      console.error('Error fetching booking:', err)
      showNotification('Error loading booking details', 'error')
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
    const key =
      target.kind === 'freeform'
        ? 'freeform'
        : target.kind === 'item'
          ? `item:${target.itemId}`
          : `group:${target.groupId}`
    setWalkthroughUploadingKey(key)
    try {
      const opts =
        target.kind === 'freeform'
          ? undefined
          : target.kind === 'item'
            ? { groupId: target.groupId, itemId: target.itemId }
            : { groupId: target.groupId }
      const res = await uploadWalkthroughPhotos(project.id, files, opts)
      if (res.status === 'success') {
        showNotification(`${files.length} photo(s) uploaded`, 'success')
        await fetchWalkthrough()
      } else {
        showNotification(res.message || 'Failed to upload photos', 'error')
      }
    } catch (err) {
      console.error('Error uploading walkthrough photos:', err)
      showNotification(
        err instanceof Error ? err.message : 'Error uploading photos',
        'error'
      )
    } finally {
      setWalkthroughUploadingKey(null)
    }
  }

  const handlePmWalkthroughDelete = async (photoId: string) => {
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

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Format time for display
  const formatTime = (time: string | null | undefined) => {
    if (!time) return 'Not set'
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  // Handle cleaner assignment
  const handleAssignCleaner = async () => {
    if (!selectedCleanerId) {
      showNotification('Please select a cleaner', 'error')
      return
    }

    setIsAssigning(true)
    try {
      const res = await assignCleanerToProject(project.id, { cleanerId: selectedCleanerId })
      if (res.status === 'success') {
        showNotification('Cleaner assigned successfully', 'success')
        onUpdate(res.data)
      } else {
        showNotification(res.message || 'Failed to assign cleaner', 'error')
      }
    } catch (err) {
      console.error('Error assigning cleaner:', err)
      showNotification('Error assigning cleaner', 'error')
    } finally {
      setIsAssigning(false)
    }
  }

  const LOCKED_STATUSES = ['completed', 'cancelled']

  const handleCancelProject = async () => {
    if (!user?.id) return
    try {
      setCancellingProject(true)
      const res = await cancelCleaningProject(project.id, user.id)
      if (res.status === 'success') {
        showNotification('Project cancelled successfully', 'success')
        setShowCancelConfirm(false)
        if (onCancel) {
          onCancel(project.id)
        }
        onClose()
      } else {
        showNotification(res.message || 'Failed to cancel project', 'error')
      }
    } catch (err) {
      console.error('Error cancelling project:', err)
      showNotification(err instanceof Error ? err.message : 'Failed to cancel project', 'error')
    } finally {
      setCancellingProject(false)
    }
  }

  const handleUnbeginProject = async () => {
    try {
      setUnbeginning(true)
      const res = await unstartProject(project.id)
      if (res.status === 'success') {
        showNotification('Project reverted to confirmed', 'success')
        setShowUnbeginConfirm(false)
        onUpdate(res.data)
      } else {
        showNotification(res.message || 'Failed to unbegin project', 'error')
      }
    } catch (err) {
      console.error('Error unbeginning project:', err)
      showNotification('Failed to unbegin project', 'error')
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
        showNotification(`Project overridden to '${overrideTarget}'`, 'success')
        setShowOverrideConfirm(false)
        onUpdate(res.data)
      } else {
        showNotification(res.message || 'Override failed', 'error')
      }
    } catch (err) {
      console.error('Error overriding project:', err)
      showNotification('Error overriding project', 'error')
    } finally {
      setOverriding(false)
    }
  }

  const handleRemoveOverride = async () => {
    if (!user?.id) return
    try {
      const res = await removeCleaningProjectOverride(project.id, user.id)
      if (res.status === 'success') {
        showNotification('Override removed', 'success')
        onUpdate(res.data)
      } else {
        showNotification(res.message || 'Failed to remove override', 'error')
      }
    } catch (err) {
      console.error('Error removing override:', err)
      showNotification('Error removing override', 'error')
    }
  }

  // Overdue detection
  const overdue = isProjectOverdue(project)
  const overdueMinutes = getOverdueMinutes(project)
  const overdueLabel = overdue && overdueMinutes !== null ? formatOverdueDuration(overdueMinutes) : null

  // Get status badge color
  const getStatusBadgeClasses = () => {
    if (overdue) return 'bg-red-100 text-red-700 border-red-200'
    const colorMap: Record<string, string> = {
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colorMap[statusDisplay.color] || colorMap.gray
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-4xl w-11/12 max-h-[90vh]">
      <div>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <CalendarDaysIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Project Details</h2>
              <p className="text-sm text-gray-500">{formatDate(project.projectDate)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Status and Same-day badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-lg border ${getStatusBadgeClasses()}`}>
              {overdue ? 'Overdue' : statusDisplay.label}
            </span>
            {overdue && overdueLabel && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-red-100 text-red-700 rounded-lg border border-red-200">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {overdueLabel}
              </span>
            )}
            {project.isSameDayTurnover && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-amber-100 text-amber-700 rounded-lg border border-amber-200">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Same-Day Turnover
              </span>
            )}
            {project.pmOverride && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-orange-100 text-orange-700 rounded-lg border border-orange-200">
                <BoltIcon className="w-3.5 h-3.5" />
                Override Active
              </span>
            )}
            {project.source !== 'manual' && (
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg">
                via {project.source === 'hostaway' ? 'Hostaway' : 'iCal'}
              </span>
            )}
          </div>

          {/* Time Change Request Banner */}
          {pendingRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800">Time Change Requested</h3>
                {pendingRequest.cleanerName && (
                  <span className="text-sm text-amber-600">by {pendingRequest.cleanerName}</span>
                )}
              </div>

              {/* Current vs Requested side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Current</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(pendingRequest.currentProjectDate)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatTime(pendingRequest.currentProjectStartTime)} – {formatTime(pendingRequest.currentProjectEndTime)}
                  </p>
                </div>
                <div className="bg-amber-100/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 uppercase mb-1">Requested</p>
                  <p className="text-sm font-medium text-amber-900">{formatDate(pendingRequest.requestedProjectDate)}</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {formatTime(pendingRequest.requestedProjectStartTime)} – {formatTime(pendingRequest.requestedProjectEndTime)}
                  </p>
                </div>
              </div>

              {/* Reason */}
              {pendingRequest.reason && (
                <p className="text-sm text-amber-800 mb-3">
                  <span className="font-medium">Reason:</span> {pendingRequest.reason}
                </p>
              )}

              {/* Rejection notes input */}
              {hasWrite && (
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Notes (optional, shown to cleaner if rejected)"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-3"
                />
              )}

              {/* Approve / Reject buttons */}
              {hasWrite && (
                <div className="flex gap-2">
                  <button
                    onClick={handleApproveRequest}
                    disabled={isResolvingRequest}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isResolvingRequest ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircleIcon className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={handleRejectRequest}
                    disabled={isResolvingRequest}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isResolvingRequest ? (
                      <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                    ) : (
                      <XMarkIcon className="w-4 h-4" />
                    )}
                    Reject
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Property & Cleaner — 2-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left Column — Property & Details */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HomeModernIcon className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Property</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{project.propertyName || 'Unknown'}</p>
                  {project.propertyAddress && (
                    <p className="text-sm text-gray-500 mt-0.5">{project.propertyAddress}</p>
                  )}
                </div>
              </div>

              {/* Beds / Bedrooms / Bathrooms — inline pills */}
              {(project.propertyNumBeds || project.propertyNumBedrooms || project.propertyNumBathrooms) && (
                <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-600">
                  {project.propertyNumBedrooms !== null && project.propertyNumBedrooms !== undefined && (
                    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                      <HomeIcon className="w-3 h-3 text-violet-500" />
                      {project.propertyNumBedrooms}BR
                    </span>
                  )}
                  {project.propertyNumBathrooms !== null && project.propertyNumBathrooms !== undefined && (
                    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                      <span className="text-xs font-bold text-teal-500">B</span>
                      {project.propertyNumBathrooms}BA
                    </span>
                  )}
                  {project.propertyNumBeds !== null && project.propertyNumBeds !== undefined && (
                    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                      <UserGroupIcon className="w-3 h-3 text-indigo-500" />
                      {project.propertyNumBeds} bed{project.propertyNumBeds !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {/* WiFi Credentials */}
              {(project.propertyWifiSsid || project.propertyWifiPassword) && (
                <div className="flex items-start gap-2">
                  <WifiIcon className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-3 flex-wrap">
                    {project.propertyWifiSsid && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Network:</span>
                        <span className="text-xs font-medium text-gray-900 font-mono">{project.propertyWifiSsid}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(project.propertyWifiSsid || '')}
                          className="p-0.5 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                          title="Copy network name"
                        >
                          <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {project.propertyWifiPassword && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Pass:</span>
                        <span className="text-xs font-medium text-gray-900 font-mono">{project.propertyWifiPassword}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(project.propertyWifiPassword || '')}
                          className="p-0.5 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                          title="Copy password"
                        >
                          <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Access Codes */}
              {project.propertyAccessCodes && (
                <div className="flex items-start gap-2">
                  <KeyIcon className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Access Codes</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(project.propertyAccessCodes || '')}
                        className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                        title="Copy all codes"
                      >
                        <ClipboardDocumentIcon className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <pre className="text-xs text-gray-900 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded-lg">
                      {project.propertyAccessCodes}
                    </pre>
                  </div>
                </div>
              )}

              {/* Google Maps link */}
              {project.propertyAddress && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.propertyAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <ArrowRightIcon className="w-3 h-3" />
                  View on Google Maps
                </a>
              )}
            </div>

            {/* Right Column — Cleaner & Schedule */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${project.cleanerId ? 'bg-green-100' : 'bg-amber-100'}`}>
                  <UserCircleIcon className={`w-4.5 h-4.5 ${project.cleanerId ? 'text-green-600' : 'text-amber-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Cleaner</p>
                  {project.cleanerId ? (
                    <div className="mt-0.5">
                      <p className="font-semibold text-gray-900">{project.cleanerName}</p>
                      <p className="text-sm text-gray-500">{project.cleanerEmail || project.cleanerPhone || 'No contact'}</p>
                    </div>
                  ) : hasWrite ? (
                    <div className="mt-2">
                      <select
                        value={selectedCleanerId}
                        onChange={(e) => setSelectedCleanerId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select a cleaner...</option>
                        {cleaners.filter(c => c.status !== 'inactive').map(cleaner => (
                          <option key={cleaner.id} value={cleaner.id}>
                            {cleaner.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssignCleaner}
                        disabled={!selectedCleanerId || isAssigning}
                        className="mt-2 w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {isAssigning ? 'Assigning...' : 'Assign Cleaner'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">No cleaner assigned</p>
                  )}
                </div>
              </div>

              {/* Time — single line */}
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-900">
                  {formatTime(project.projectStartTime)}
                  {' – '}
                  {project.projectEndTime ? formatTime(project.projectEndTime) : 'TBD'}
                </span>
              </div>

              {/* Duration & Guests — inline */}
              <div className="flex items-center gap-4 flex-wrap">
                {project.estimatedDurationMinutes && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <span>Est. {formatDuration(project.estimatedDurationMinutes)}</span>
                  </div>
                )}
                {project.guestCount && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <UserGroupIcon className="w-4 h-4 text-gray-400" />
                    <span>{project.guestCount} guests</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Related Bookings */}
          <div className="border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setShowRelatedBookings(!showRelatedBookings)}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4 text-gray-600" />
                <p className="text-sm font-semibold text-gray-700">Related Bookings</p>
              </div>
              <ChevronDownIcon
                className={`w-4 h-4 text-gray-400 transition-transform ${showRelatedBookings ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showRelatedBookings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Departing Guest */}
                    {project.previousBookingId ? (
                      <button
                        type="button"
                        onClick={() => handleViewBooking(project.previousBookingId!)}
                        disabled={!!loadingBookingId}
                        className="group bg-gray-50 hover:bg-amber-50/50 rounded-xl p-4 border-l-3 border-amber-400 text-left transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Departing Guest</p>
                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold text-gray-900">{project.previousBookingGuestName || 'Guest'}</p>
                          {project.previousBookingCheckIn && project.previousBookingCheckOut ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span>{formatDate(project.previousBookingCheckIn)}</span>
                              <ArrowRightIcon className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{formatDate(project.previousBookingCheckOut)}</span>
                            </div>
                          ) : (
                            <>
                              {project.previousBookingCheckIn && (
                                <p className="text-xs text-gray-500">Check-in: {formatDate(project.previousBookingCheckIn)}</p>
                              )}
                              {project.previousBookingCheckOut && (
                                <p className="text-xs text-gray-500">Check-out: {formatDate(project.previousBookingCheckOut)}</p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="mt-2 flex justify-end">
                          {loadingBookingId === project.previousBookingId ? (
                            <span className="text-xs text-amber-500 animate-pulse">Loading...</span>
                          ) : (
                            <span className="text-xs text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">View details &rarr;</span>
                          )}
                        </div>
                      </button>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-4 border-l-3 border-amber-400">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Departing Guest</p>
                        <p className="text-sm text-gray-400 italic">No booking linked</p>
                      </div>
                    )}

                    {/* Arriving Guest */}
                    {project.nextBookingId ? (
                      <button
                        type="button"
                        onClick={() => handleViewBooking(project.nextBookingId!)}
                        disabled={!!loadingBookingId}
                        className="group bg-gray-50 hover:bg-blue-50/50 rounded-xl p-4 border-l-3 border-blue-400 text-left transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Arriving Guest</p>
                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold text-gray-900">{project.nextBookingGuestName || 'Guest'}</p>
                          {project.nextBookingCheckIn && project.nextBookingCheckOut ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span>{formatDate(project.nextBookingCheckIn)}</span>
                              <ArrowRightIcon className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{formatDate(project.nextBookingCheckOut)}</span>
                            </div>
                          ) : (
                            <>
                              {project.nextBookingCheckIn && (
                                <p className="text-xs text-gray-500">Check-in: {formatDate(project.nextBookingCheckIn)}</p>
                              )}
                              {project.nextBookingCheckOut && (
                                <p className="text-xs text-gray-500">Check-out: {formatDate(project.nextBookingCheckOut)}</p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="mt-2 flex justify-end">
                          {loadingBookingId === project.nextBookingId ? (
                            <span className="text-xs text-blue-500 animate-pulse">Loading...</span>
                          ) : (
                            <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">View details &rarr;</span>
                          )}
                        </div>
                      </button>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-4 border-l-3 border-blue-400">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Arriving Guest</p>
                        <p className="text-sm text-gray-400 italic">No booking linked</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notes */}
          {project.pmNotes && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <DocumentTextIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">PM Notes</span>
              </div>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{project.pmNotes}</p>
            </div>
          )}

          {/* Cleaner Notes (read-only for PM) */}
          {project.cleanerNotes && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 text-teal-600 mb-2">
                <PencilSquareIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Cleaner Notes</span>
              </div>
              <p className="text-sm text-gray-700 bg-teal-50 rounded-lg p-3 border-l-3 border-teal-400">{project.cleanerNotes}</p>
            </div>
          )}

          {/* Checklist Section */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-500">
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Checklist</span>
                {checklistProgress && checklistProgress.totalItems > 0 && (
                  <span className="ml-2 text-xs font-semibold text-purple-600">
                    {checklistProgress.completedItems}/{checklistProgress.totalItems} ({getCompletionPercentage(checklistProgress)}%)
                  </span>
                )}
              </div>
              {project.checklistId && checklistItems.length === 0 && !isLoadingChecklist && (
                <button
                  onClick={handleInitializeChecklist}
                  disabled={isInitializingChecklist}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isInitializingChecklist ? 'Initializing...' : 'Initialize Checklist'}
                </button>
              )}
            </div>

            {isLoadingChecklist ? (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Loading checklist...</p>
              </div>
            ) : checklistItems.length > 0 ? (
              <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">
                {Object.entries(groupChecklistItemsByRoom(checklistItems)).map(([roomName, items]) => (
                  <div key={roomName} className="mb-4 last:mb-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {roomName || 'General'}
                    </p>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                            item.isCompleted ? 'bg-green-50' : 'bg-white'
                          }`}
                        >
                          <button
                            onClick={() => handleToggleItem(item)}
                            disabled={updatingItemId === item.id}
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                              item.isCompleted
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-purple-500'
                            } ${updatingItemId === item.id ? 'opacity-50' : ''}`}
                          >
                            {item.isCompleted && <CheckIcon className="w-3 h-3" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {item.taskDescription}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {item.photoUrl ? (
                              <>
                                <button
                                  onClick={() => setPreviewImage({
                                    url: item.photoUrl!,
                                    task: item.taskDescription,
                                    photoTakenAt: item.photoTakenAt,
                                    photoUploadedAt: item.photoUploadedAt,
                                    downloadFn: () => downloadChecklistPhotoWatermarked(project.id, item.id),
                                  })}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors cursor-pointer"
                                  title="View photo"
                                >
                                  <CameraIcon className="w-3.5 h-3.5" />
                                  View
                                </button>
                                {(item.photoTakenAt || item.photoUploadedAt) && (
                                  <span className="text-[10px] text-gray-400">
                                    {item.photoTakenAt
                                      ? `Taken ${new Date(item.photoTakenAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`
                                      : `Uploaded ${new Date(item.photoUploadedAt!).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`
                                    }
                                  </span>
                                )}
                              </>
                            ) : item.requiresPhoto ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-1 text-xs text-amber-600 bg-amber-50 rounded-lg">
                                <CameraIcon className="w-3.5 h-3.5" />
                                Required
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : project.checklistId ? (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Checklist not initialized yet</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">No checklist assigned</p>
              </div>
            )}
          </div>

          {/* Walkthrough Photos Section */}
          {walkthrough && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 text-gray-500 mb-3 px-1">
                <CameraIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Walkthrough Photos</span>
              </div>
              <WalkthroughAccordion
                walkthrough={walkthrough}
                canEdit
                uploadingKey={walkthroughUploadingKey}
                onUpload={handlePmWalkthroughUpload}
                onDelete={handlePmWalkthroughDelete}
                onViewPhoto={(url) => {
                  // Find the photo in the walkthrough payload to surface metadata + download
                  const allPhotos = [
                    ...walkthrough.effectiveTemplate.groups.flatMap(g => [
                      ...g.photos,
                      ...g.items.flatMap(it => it.photos),
                    ]),
                    ...walkthrough.orphanedGroups.flatMap(og => og.photos),
                    ...walkthrough.freeformPhotos,
                  ]
                  const photo = allPhotos.find(p => p.photoUrl === url)
                  const label = photo
                    ? photo.itemNameSnapshot ?? photo.groupNameSnapshot ?? 'Walkthrough'
                    : 'Walkthrough'
                  setPreviewImage({
                    url,
                    task: `Walkthrough: ${label}`,
                    photoTakenAt: photo?.photoTakenAt ?? null,
                    photoUploadedAt: photo?.photoUploadedAt ?? null,
                    downloadFn: photo
                      ? () => downloadWalkthroughPhotoWatermarked(project.id, photo.id)
                      : undefined,
                  })
                }}
                expandedGroupIds={walkthroughExpandedGroups}
                onToggleGroup={handlePmWalkthroughToggleGroup}
              />
            </div>
          )}

          {/* Photos Gallery Section */}
          {(() => {
            const checklistPhotos = checklistItems.filter(item => item.photoUrl)
            const issuePhotos: Array<{ url: string; issueId: string; issueType: string; photoIndex: number; createdAt: string }> = []
            projectIssues.forEach(issue => {
              issue.photoUrls.forEach((url, idx) => {
                issuePhotos.push({
                  url,
                  issueId: issue.id,
                  issueType: issue.issueType,
                  photoIndex: idx,
                  createdAt: issue.createdAt
                })
              })
            })
            const totalPhotoCount = checklistPhotos.length + issuePhotos.length

            return (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <PhotoIcon className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Photos</span>
                  {totalPhotoCount > 0 && (
                    <span className="text-xs font-semibold text-purple-600">{totalPhotoCount}</span>
                  )}
                </div>

                {totalPhotoCount > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {checklistPhotos.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setPreviewImage({
                          url: item.photoUrl!,
                          task: item.taskDescription,
                          photoTakenAt: item.photoTakenAt,
                          photoUploadedAt: item.photoUploadedAt,
                          downloadFn: () => downloadChecklistPhotoWatermarked(project.id, item.id),
                        })}
                        className="relative group cursor-pointer"
                      >
                        <img
                          src={item.photoUrl!}
                          alt={item.taskDescription}
                          className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <CameraIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-b-lg truncate">
                          {item.taskDescription}
                        </div>
                      </button>
                    ))}
                    {issuePhotos.map((photo, idx) => (
                      <button
                        key={`issue-${photo.issueId}-${photo.photoIndex}`}
                        onClick={() => setPreviewImage({
                          url: getPhotoPublicUrl(photo.url),
                          task: `Issue: ${photo.issueType.replace('_', ' ')}`,
                          photoTakenAt: photo.createdAt,
                          downloadFn: () => downloadIssuePhotoWatermarked(photo.issueId, photo.photoIndex),
                        })}
                        className="relative group cursor-pointer"
                      >
                        <img
                          src={getPhotoPublicUrl(photo.url)}
                          alt={`Issue photo ${idx + 1}`}
                          className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <CameraIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-amber-500/70 text-white text-[10px] px-1 py-0.5 rounded-b-lg truncate">
                          Issue: {photo.issueType.replace('_', ' ')}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500">No photos uploaded</p>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Supply Lists Section */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-500">
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Supply Lists</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowSubmitSupplyListModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Request
                </button>
                <button
                  onClick={() => setShowScanReceiptModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                >
                  <CameraIcon className="w-3.5 h-3.5" />
                  Scan Receipt
                </button>
              </div>
            </div>

            {supplyListCount > 0 ? (
              <button
                onClick={() => setShowViewSupplyListsModal(true)}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-100">
                      <ClipboardDocumentCheckIcon className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {supplyListCount} supply list{supplyListCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-gray-500">Tap to review</p>
                    </div>
                  </div>
                  <span className="text-sm text-purple-600 font-medium">View →</span>
                </div>
              </button>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">No supply requests</p>
              </div>
            )}
          </div>

          {/* Issues Section */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-500">
                <FlagIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Issues</span>
              </div>
              <button
                onClick={() => setShowReportIssueModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Report Issue
              </button>
            </div>

            {issueCounts && issueCounts.total > 0 ? (
              <button
                onClick={() => setShowViewIssuesModal(true)}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      issueCounts.open > 0 ? 'bg-red-100' : issueCounts.acknowledged > 0 ? 'bg-amber-100' : 'bg-green-100'
                    }`}>
                      <ExclamationTriangleIcon className={`w-5 h-5 ${
                        issueCounts.open > 0 ? 'text-red-600' : issueCounts.acknowledged > 0 ? 'text-amber-600' : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {issueCounts.total} issue{issueCounts.total !== 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {issueCounts.open > 0 && (
                          <span className="text-red-600">{issueCounts.open} open</span>
                        )}
                        {issueCounts.acknowledged > 0 && (
                          <span className="text-amber-600">{issueCounts.acknowledged} acknowledged</span>
                        )}
                        {issueCounts.resolved > 0 && (
                          <span className="text-green-600">{issueCounts.resolved} resolved</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-purple-600 font-medium">View →</span>
                </div>
              </button>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">No issues reported</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center gap-2">
          {hasWrite && onDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              Delete
            </button>
          )}
          {hasWrite && onCancel && !LOCKED_STATUSES.includes(project.status) && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
            >
              <XCircleIcon className="w-3.5 h-3.5" />
              Cancel Project
            </button>
          )}
          {hasWrite && project.status === 'in_progress' && (
            <button
              onClick={() => setShowUnbeginConfirm(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              Unbegin
            </button>
          )}
          {hasWrite && (
            project.pmOverride ? (
              <button
                onClick={handleRemoveOverride}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
              >
                <BoltIcon className="w-3.5 h-3.5" />
                Remove Override
              </button>
            ) : (
              <button
                onClick={() => setShowOverrideConfirm(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
              >
                <BoltIcon className="w-3.5 h-3.5" />
                Override
              </button>
            )
          )}
          <div className="flex-1 min-w-0" />
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          {hasWrite && (
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors cursor-pointer"
            >
              <PencilSquareIcon className="w-3.5 h-3.5" />
              Edit Project
            </button>
          )}
        </div>
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

      {/* Cancel Project Confirmation */}
      <Modal isOpen={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} style="p-6 max-w-md w-full">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
            <XCircleIcon className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Project</h3>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to cancel the cleaning project for <strong>{project.propertyName}</strong>?
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Keep Project
            </button>
            <button
              onClick={handleCancelProject}
              disabled={cancellingProject}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {cancellingProject ? 'Cancelling...' : 'Cancel Project'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Unbegin Project Confirmation */}
      <Modal isOpen={showUnbeginConfirm} onClose={() => setShowUnbeginConfirm(false)} style="p-6 max-w-md w-full">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
            <ArrowPathIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unbegin Project</h3>
          <p className="text-sm text-gray-600 mb-6">
            This will revert <strong>{project.propertyName}</strong> back to confirmed status and clear the start time. Checklist progress will be preserved.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowUnbeginConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Keep In Progress
            </button>
            <button
              onClick={handleUnbeginProject}
              disabled={unbeginning}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {unbeginning ? 'Reverting...' : 'Unbegin Project'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Override Project Confirmation */}
      <Modal isOpen={showOverrideConfirm} onClose={() => setShowOverrideConfirm(false)} style="p-6 max-w-md w-full">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-100">
              <BoltIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Override Project Status</h3>
              <p className="text-xs text-gray-500">{project.propertyName}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            This bypasses all date and status restrictions. The cleaner will be able to work on this project regardless of its scheduled date.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Set status to:</label>
          <select
            value={overrideTarget}
            onChange={e => setOverrideTarget(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="pending">Pending (no cleaner action needed)</option>
            <option value="assigned">Assigned (awaiting cleaner acceptance)</option>
            <option value="confirmed">Confirmed (ready for cleaner to start)</option>
            <option value="in_progress">In Progress (start immediately)</option>
          </select>
          <div className="flex gap-3 justify-end mt-5">
            <button
              onClick={() => setShowOverrideConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleOverrideProject}
              disabled={overriding}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {overriding ? 'Overriding...' : 'Override'}
            </button>
          </div>
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
          fetchIssueCounts()
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
        onIssuesChanged={fetchIssueCounts}
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


      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.task}
        photoTakenAt={previewImage?.photoTakenAt}
        photoUploadedAt={previewImage?.photoUploadedAt}
        onDownloadWatermarked={previewImage?.downloadFn}
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
    </Modal>
  )
}
