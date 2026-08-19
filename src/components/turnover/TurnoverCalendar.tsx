'use client'

import { useState, useEffect, useMemo, useRef, useCallback, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import { getCleaningProjects, getCleaningProjectStats, getCleaningProjectById, updateCleaningProject, rescheduleProjectDate, assignCleanerToProject } from '@/services/cleaningProjectService'
import { toLocalDateStr } from './utils/calendarDateUtils'
import { getCleaners } from '@/services/cleanerService'
import { getContractors } from '@/services/contractorService'
import type { Contractor } from '@/services/types/contractor'
import { getProperties, updateProperty } from '@/services/propertyService'
import { getAllIssues } from '@/services/projectIssueService'
import type { ProjectIssue } from '@/services/types/projectIssue'
import { getAllSupplyLists } from '@/services/supplyListService'
import { getMaintenanceTasksForCalendar } from '@/services/maintenanceTaskService'
import type { MaintenanceTask } from '@/services/types/maintenanceTask'
import { getBookings, getMonthKey, getMonthBounds, rescheduleBookingDates, deleteBooking, cancelBooking } from '@/services/bookingService'
import { isValidationError } from '@/services/validationError'
import type { CleaningProject, CleaningProjectStats } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import type { DeepLinkSection } from '@/hooks/useDeepLink'
import CalendarHeader from './CalendarHeader'
import PropertyRowView from './PropertyRowView'
import CleanerRowView from './CleanerRowView'
import ContractorRowView from './ContractorRowView'
import MonthGridView from './MonthGridView'
import ProjectDetailModal from './ProjectDetailModal'
import CreateProjectModal from './create/CreateProjectModal'
import CreateChecklistModal from '@/components/checklist/create/CreateChecklistModal'
import DuplicateChecklistModal from '@/components/checklist/duplicate/DuplicateChecklistModal'
import CleaningExclusionsModal from './CleaningExclusionsModal'
import { AllIssuesModal } from '@/components/turnover/issues'
import PhotoGalleryModal from './PhotoGalleryModal'
import PreviewBookingModal from '@/components/booking/preview/previewBookingModal'
import UpdateBookingModal from '@/components/booking/update/updateBookingModal'
import ConfirmDragModal, { InvalidDropModal } from './dnd/ConfirmDragModal'
import type { PendingDrop, ProjectDragData, BookingDragData, InvalidDropInfo, ActivatedItem } from './dnd/types'
import { useActivatedItem } from './hooks/useActivatedItem'
import { useTaskProjectFlow } from '@/hooks/useTaskProjectFlow'
import ReportStandaloneIssueModal from './issues/ReportStandaloneIssueModal'
import CreateTaskModal from './tasks/CreateTaskModal'
import TaskDetailModal from './tasks/TaskDetailModal'

export type ViewMode = 'property' | 'cleaner' | 'contractor'
export type CalendarGranularity = 'day' | 'hour' // kept for backward compat, but granularity toggle is removed
export type ZoomLevel = number | 'month'
export type SortOption = 'alpha-asc' | 'alpha-desc' | 'projects-desc' | 'next-project'
export const UNASSIGNED_FILTER_ID = '__unassigned__'

export type CalendarDensity = 'normal' | 'compact'

export interface CalendarSizeConfig {
  barHeightDesktop: number
  bookingBarHeightDesktop: number
  notchPxDesktop: number
  rowPadding: number
  subRowGap: number
  stackGap: number
  minRowHeight: number
}

export const NORMAL_SIZE_CONFIG: CalendarSizeConfig = {
  barHeightDesktop: 80,
  bookingBarHeightDesktop: 36,
  notchPxDesktop: 10,
  rowPadding: 5,
  subRowGap: 2,
  stackGap: 2,
  minRowHeight: 90,
}

export const COMPACT_SIZE_CONFIG: CalendarSizeConfig = {
  barHeightDesktop: 44,
  bookingBarHeightDesktop: 22,
  notchPxDesktop: 5,
  rowPadding: 2,
  subRowGap: 1,
  stackGap: 1,
  minRowHeight: 48,
}

interface TurnoverCalendarProps {
  initialProperties?: Property[]
  initialCleaners?: Cleaner[]
  deepLinkProjectId?: string | null
  deepLinkSection?: DeepLinkSection | null
  deepLinkView?: string | null
  onCalendarReady?: () => void
}

export default function TurnoverCalendar({
  initialProperties,
  initialCleaners,
  deepLinkProjectId,
  deepLinkSection,
  deepLinkView,
  onCalendarReady,
}: TurnoverCalendarProps) {
  const { t } = useTranslation('turnover')
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const { effectiveUserId } = usePermissions()
  const isMobile = useIsMobile()

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('property')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(7)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [isWeekPreset, setIsWeekPreset] = useState(true) // default 7d = "Week"

  // Static data state (not date-range dependent)
  const [properties, setProperties] = useState<Property[]>(initialProperties || [])
  const [cleaners, setCleaners] = useState<Cleaner[]>(initialCleaners || [])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [stats, setStats] = useState<CleaningProjectStats | null>(null)
  const [issueCountsMap, setIssueCountsMap] = useState<Record<string, number>>({})
  const [allIssues, setAllIssues] = useState<ProjectIssue[]>([])
  const [supplyListCountsMap, setSupplyListCountsMap] = useState<Record<string, number>>({})

  // Month-based cache for bookings
  const [bookingCache, setBookingCache] = useState<Map<string, Booking[]>>(new Map())
  const bookingCacheRef = useRef<Map<string, Booking[]>>(new Map())

  // Month-based cache for projects
  const [projectCache, setProjectCache] = useState<Map<string, CleaningProject[]>>(new Map())
  const projectCacheRef = useRef<Map<string, CleaningProject[]>>(new Map())

  // Month-based cache for maintenance tasks
  const [taskCache, setTaskCache] = useState<Map<string, MaintenanceTask[]>>(new Map())
  const taskCacheRef = useRef<Map<string, MaintenanceTask[]>>(new Map())

  // Shared fetch tracking
  const [fetchingMonths, setFetchingMonths] = useState<Set<string>>(new Set())
  const fetchingMonthsRef = useRef<Set<string>>(new Set())

  // Bookings overlay state
  const [showBookings, setShowBookings] = useState(true)

  // Property filter state
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])

  // Cleaner filter state
  const [selectedCleanerIds, setSelectedCleanerIds] = useState<string[]>([])

  // Sort state
  const [sortOption, setSortOption] = useState<SortOption>('next-project')

  // Same-day turnover filter
  const [showSameDayOnly, setShowSameDayOnly] = useState(false)

  // Density state with localStorage persistence
  const [density, setDensity] = useState<CalendarDensity>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('turnover-calendar-density')
      if (saved === 'compact') return 'compact'
    }
    return 'normal'
  })
  const handleDensityChange = useCallback((d: CalendarDensity) => {
    setDensity(d)
    localStorage.setItem('turnover-calendar-density', d)
  }, [])
  const sizeConfig = density === 'compact' ? COMPACT_SIZE_CONFIG : NORMAL_SIZE_CONFIG

  // Loading state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialFetchDone = useRef(false)

  // Sticky header portal ref
  const stickyPortalRef = useRef<HTMLDivElement>(null)

  // Scroll container ref for internal scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Navigation epoch — incremented on explicit user navigation only (not scroll-triggered date shifts)
  const [navigationEpoch, setNavigationEpoch] = useState(0)

  // Modal state
  const [selectedProject, setSelectedProject] = useState<CleaningProject | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateChecklistModal, setShowCreateChecklistModal] = useState(false)
  const [showDuplicateChecklistModal, setShowDuplicateChecklistModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null)
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingPreview, setShowBookingPreview] = useState(false)
  const [showBookingUpdate, setShowBookingUpdate] = useState(false)
  const [showAllIssuesModal, setShowAllIssuesModal] = useState(false)
  const [showPhotoGalleryModal, setShowPhotoGalleryModal] = useState(false)
  const [showExclusionsModal, setShowExclusionsModal] = useState(false)

  // Booking cancel/delete confirmation state
  const [showBookingCancelConfirm, setShowBookingCancelConfirm] = useState(false)
  const [showBookingDeleteConfirm, setShowBookingDeleteConfirm] = useState(false)
  const [bookingActionLoading, setBookingActionLoading] = useState(false)

  // Drag-and-drop confirmation state
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [invalidDropInfo, setInvalidDropInfo] = useState<InvalidDropInfo | null>(null)

  // Deep link state
  const deepLinkHandled = useRef(false)
  const [deepLinkInitialSection, setDeepLinkInitialSection] = useState<'issues' | 'supplies' | null>(null)

  // Keep refs in sync with state
  useEffect(() => {
    bookingCacheRef.current = bookingCache
  }, [bookingCache])

  useEffect(() => {
    projectCacheRef.current = projectCache
  }, [projectCache])

  useEffect(() => {
    taskCacheRef.current = taskCache
  }, [taskCache])

  useEffect(() => {
    fetchingMonthsRef.current = fetchingMonths
  }, [fetchingMonths])

  // Format date as YYYY-MM-DD in local time (avoid timezone issues)
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Calculate date range for the current view (uses currentDate directly, no alignment)
  const dateRange = useMemo(() => {
    if (zoomLevel === 'month') {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0) // last day of month
      return {
        start: formatLocalDate(start),
        end: formatLocalDate(end),
      }
    }

    const start = new Date(currentDate)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(end.getDate() + zoomLevel - 1)
    end.setHours(23, 59, 59, 999)

    return {
      start: formatLocalDate(start),
      end: formatLocalDate(end),
    }
  }, [currentDate, zoomLevel])

  // Fetch months that the buffer around centerDate touches (both bookings AND projects)
  const fetchMonthsForRange = useCallback(async (centerDate: Date, userId: string) => {
    // Compute which months the ±17 day buffer touches
    const bufferStart = new Date(centerDate)
    bufferStart.setDate(bufferStart.getDate() - 17)
    const bufferEnd = new Date(centerDate)
    bufferEnd.setDate(bufferEnd.getDate() + (zoomLevel === 'month' ? 45 : zoomLevel + 17))

    const months: string[] = []
    const cursor = new Date(bufferStart.getFullYear(), bufferStart.getMonth(), 1)
    while (cursor <= bufferEnd) {
      months.push(getMonthKey(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }

    // Filter to uncached, non-fetching months
    const currentBookingCache = bookingCacheRef.current
    const currentProjectCache = projectCacheRef.current
    const currentTaskCache = taskCacheRef.current
    const currentFetching = fetchingMonthsRef.current

    const neededMonths = months.filter(m =>
      (!currentBookingCache.has(m) || !currentProjectCache.has(m) || !currentTaskCache.has(m)) &&
      !currentFetching.has(m)
    )

    if (neededMonths.length === 0) return

    // Mark as fetching
    setFetchingMonths(prev => {
      const next = new Set(prev)
      neededMonths.forEach(m => next.add(m))
      return next
    })

    // Fetch each month's bookings and projects in parallel
    const fetchPromises = neededMonths.map(async (monthKey) => {
      const { startDate, endDate } = getMonthBounds(monthKey)
      try {
        const [bookingsRes, projectsRes, tasksRes] = await Promise.all([
          currentBookingCache.has(monthKey)
            ? Promise.resolve(null)
            : getBookings({ userId, startDate, endDate }),
          currentProjectCache.has(monthKey)
            ? Promise.resolve(null)
            : getCleaningProjects({ userId, startDate, endDate }),
          currentTaskCache.has(monthKey)
            ? Promise.resolve(null)
            : getMaintenanceTasksForCalendar(startDate, endDate),
        ])

        return {
          monthKey,
          bookings: bookingsRes?.status === 'success' ? bookingsRes.data : null,
          projects: projectsRes?.status === 'success' ? projectsRes.data : null,
          tasks: tasksRes?.status === 'success' ? tasksRes.data : null,
        }
      } catch (err) {
        console.error(`Error fetching month ${monthKey}:`, err)
        return { monthKey, bookings: null, projects: null, tasks: null }
      }
    })

    const results = await Promise.all(fetchPromises)

    // Merge results into caches
    setBookingCache(prev => {
      const next = new Map(prev)
      results.forEach(r => {
        if (r.bookings) next.set(r.monthKey, r.bookings)
      })
      // Prune months >3 months from center
      const centerKey = getMonthKey(centerDate)
      const [cy, cm] = centerKey.split('-').map(Number)
      const centerMonthNum = cy * 12 + cm
      for (const key of next.keys()) {
        const [ky, km] = key.split('-').map(Number)
        const keyMonthNum = ky * 12 + km
        if (Math.abs(keyMonthNum - centerMonthNum) > 3) {
          next.delete(key)
        }
      }
      return next
    })

    setProjectCache(prev => {
      const next = new Map(prev)
      results.forEach(r => {
        if (r.projects) next.set(r.monthKey, r.projects)
      })
      // Prune months >3 months from center
      const centerKey = getMonthKey(centerDate)
      const [cy, cm] = centerKey.split('-').map(Number)
      const centerMonthNum = cy * 12 + cm
      for (const key of next.keys()) {
        const [ky, km] = key.split('-').map(Number)
        const keyMonthNum = ky * 12 + km
        if (Math.abs(keyMonthNum - centerMonthNum) > 3) {
          next.delete(key)
        }
      }
      return next
    })

    setTaskCache(prev => {
      const next = new Map(prev)
      results.forEach(r => {
        if (r.tasks) next.set(r.monthKey, r.tasks)
      })
      // Prune months >3 months from center
      const centerKey = getMonthKey(centerDate)
      const [cy, cm] = centerKey.split('-').map(Number)
      const centerMonthNum = cy * 12 + cm
      for (const key of next.keys()) {
        const [ky, km] = key.split('-').map(Number)
        const keyMonthNum = ky * 12 + km
        if (Math.abs(keyMonthNum - centerMonthNum) > 3) {
          next.delete(key)
        }
      }
      return next
    })

    // Clear from fetching
    setFetchingMonths(prev => {
      const next = new Set(prev)
      neededMonths.forEach(m => next.delete(m))
      return next
    })
  }, [zoomLevel])

  // Derived: bookings loading indicator
  const bookingsLoading = fetchingMonths.size > 0

  // Derived: flatten and deduplicate bookings from cache
  const allCachedBookings = useMemo(() => {
    const seen = new Set<string>()
    const result: Booking[] = []
    for (const monthBookings of bookingCache.values()) {
      for (const booking of monthBookings) {
        if (!seen.has(booking.id)) {
          seen.add(booking.id)
          result.push(booking)
        }
      }
    }
    return result
  }, [bookingCache])

  // Derived: flatten projects from cache (no dedup needed — exact date match)
  const allCachedProjects = useMemo(() => {
    const result: CleaningProject[] = []
    for (const monthProjects of projectCache.values()) {
      result.push(...monthProjects)
    }
    return result
  }, [projectCache])

  // Derived: flatten maintenance tasks from cache (no dedup needed — exact date match)
  const allCachedTasks = useMemo(() => {
    const result: MaintenanceTask[] = []
    for (const monthTasks of taskCache.values()) {
      result.push(...monthTasks)
    }
    return result
  }, [taskCache])

  // Initial data fetch (properties, cleaners, stats, issues, supply lists + first month cache)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!effectiveUserId) return
      if (initialFetchDone.current) return

      setLoading(true)
      setError(null)

      try {
        // Fetch static data in parallel
        const [propertiesRes, cleanersRes, contractorsRes, statsRes, issuesRes, supplyRes] = await Promise.all([
          initialProperties ? Promise.resolve({ status: 'success' as const, data: initialProperties }) : getProperties(effectiveUserId!),
          initialCleaners ? Promise.resolve({ status: 'success' as const, data: initialCleaners }) : getCleaners(effectiveUserId!),
          getContractors(effectiveUserId!),
          getCleaningProjectStats(effectiveUserId!, dateRange.start, dateRange.end),
          getAllIssues(effectiveUserId!),
          getAllSupplyLists(),
        ])

        if (propertiesRes.status === 'success') setProperties(propertiesRes.data)
        if (cleanersRes.status === 'success') setCleaners(cleanersRes.data)
        if (contractorsRes.status === 'success') setContractors(contractorsRes.data)
        if (statsRes.status === 'success') setStats(statsRes.data)

        if (issuesRes.status === 'success') {
          setAllIssues(issuesRes.data)
          // Build counts map from non-resolved issues only (for calendar badges)
          const countsMap: Record<string, number> = {}
          issuesRes.data.filter(i => i.status !== 'resolved').forEach(issue => {
            if (!issue.projectId) return
            countsMap[issue.projectId] = (countsMap[issue.projectId] || 0) + 1
          })
          setIssueCountsMap(countsMap)
        }
        if (supplyRes.status === 'success') {
          // Count pending + in_progress supply lists (exclude fulfilled)
          const countsMap: Record<string, number> = {}
          supplyRes.data.filter(list => list.status !== 'fulfilled' && list.projectId).forEach(list => {
            countsMap[list.projectId!] = (countsMap[list.projectId!] || 0) + 1
          })
          setSupplyListCountsMap(countsMap)
        }

        // Trigger month-based cache fetch for bookings + projects
        await fetchMonthsForRange(currentDate, effectiveUserId!)

        initialFetchDone.current = true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load calendar data'
        setError(message)
        showNotification(message, 'error')
      } finally {
        setLoading(false)
        onCalendarReady?.()
      }
    }

    fetchInitialData()
  }, [effectiveUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle deep link after calendar data is loaded
  useEffect(() => {
    if (loading || deepLinkHandled.current) return
    if (!deepLinkProjectId && !deepLinkView) return

    deepLinkHandled.current = true

    // Handle page-level view (e.g., allIssues)
    if (deepLinkView === 'allIssues') {
      setShowAllIssuesModal(true)
      return
    }

    // Handle project-level deep link
    if (deepLinkProjectId) {
      ;(async () => {
        try {
          const res = await getCleaningProjectById(deepLinkProjectId)
          if (res.status === 'success') {
            const project = res.data
            // Navigate calendar to project's date
            const projectDate = new Date(project.projectDate.split('T')[0] + 'T00:00:00')
            setCurrentDate(projectDate)
            // Open the detail modal
            setSelectedProject(project)
            if (deepLinkSection) setDeepLinkInitialSection(deepLinkSection)
            setShowDetailModal(true)
          } else {
            showNotification(t('projectNoLongerExists'), 'info')
          }
        } catch {
          showNotification(t('projectNoLongerExists'), 'info')
        }
      })()
    }
  }, [loading, deepLinkProjectId, deepLinkSection, deepLinkView, showNotification])

  // Auto-populate filter IDs with all items on initial load
  useEffect(() => {
    if (properties.length > 0 && selectedPropertyIds.length === 0) {
      setSelectedPropertyIds(properties.filter(p => p.cleaningManaged !== false).map(p => p.id))
    }
  }, [properties]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cleaners.length > 0 && selectedCleanerIds.length === 0) {
      setSelectedCleanerIds([UNASSIGNED_FILTER_ID, ...cleaners.map(c => c.id)])
    }
  }, [cleaners]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch months when navigating (after initial load) — debounced to avoid
  // rapid re-fetches during continuous scroll-induced date shifts
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (!effectiveUserId || !initialFetchDone.current) return
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current)
    fetchDebounceRef.current = setTimeout(() => {
      fetchMonthsForRange(currentDate, effectiveUserId!)
    }, 150)
    return () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current)
    }
  }, [currentDate, effectiveUserId, fetchMonthsForRange])

  // Ref to read dateRange inside epoch-gated effect without adding it as a dependency
  const dateRangeRef = useRef(dateRange)
  useEffect(() => { dateRangeRef.current = dateRange }, [dateRange])

  // Refresh stats on explicit navigation only (not during scroll-triggered date shifts)
  useEffect(() => {
    if (!effectiveUserId || !initialFetchDone.current) return
    const { start, end } = dateRangeRef.current
    getCleaningProjectStats(effectiveUserId!, start, end)
      .then(res => {
        if (res.status === 'success') setStats(res.data)
      })
  }, [navigationEpoch, effectiveUserId])

  // Refresh issue counts (call after issues are modified)
  const refreshIssueCounts = async () => {
    if (!effectiveUserId) return
    try {
      const issuesRes = await getAllIssues(effectiveUserId!)
      if (issuesRes.status === 'success') {
        setAllIssues(issuesRes.data)
        const countsMap: Record<string, number> = {}
        issuesRes.data.filter(i => i.status !== 'resolved').forEach(issue => {
          if (!issue.projectId) return
          countsMap[issue.projectId] = (countsMap[issue.projectId] || 0) + 1
        })
        setIssueCountsMap(countsMap)
      }
    } catch (err) {
      console.error('Error refreshing issue counts:', err)
    }
  }

  // Refresh supply list counts (call after supply lists are modified)
  const refreshSupplyListCounts = async () => {
    if (!effectiveUserId) return
    try {
      const supplyRes = await getAllSupplyLists()
      if (supplyRes.status === 'success') {
        const countsMap: Record<string, number> = {}
        supplyRes.data.filter(list => list.status !== 'fulfilled' && list.projectId).forEach(list => {
          countsMap[list.projectId!] = (countsMap[list.projectId!] || 0) + 1
        })
        setSupplyListCountsMap(countsMap)
      }
    } catch (err) {
      console.error('Error refreshing supply list counts:', err)
    }
  }

  // Handle zoom level change — snap to 1st of month when switching to month view
  const handleZoomChange = useCallback((level: ZoomLevel, isWeek?: boolean) => {
    if (level === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), 1))
    }
    setExpandedDate(null) // collapse any expanded day
    setZoomLevel(level)
    setIsWeekPreset(isWeek ?? false)
  }, [])

  // Handle day click from column header — switch to 1-day zoom on that date
  const handleDayClick = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    setCurrentDate(new Date(y, m - 1, d))
    setZoomLevel(1)
    setIsWeekPreset(false)
    setExpandedDate(null)
  }, [])

  // Handle day click from MonthGridView — switch to 7d (Week) view centered on that day
  const handleMonthDayClick = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    setCurrentDate(new Date(y, m - 1, d))
    setZoomLevel(7)
    setIsWeekPreset(true)
  }, [])

  // Handle bookings toggle — bookings are always in cache, just toggle visibility
  const handleToggleBookings = (enabled: boolean) => {
    setShowBookings(enabled)
  }

  // Filter bookings to those visible in the current date range
  const visibleBookings = useMemo(() => {
    if (!showBookings || allCachedBookings.length === 0) return []
    return allCachedBookings.filter(b => {
      if (!b.checkOutDate) return false
      if (b.bookingStatus === 'cancelled') return false
      const checkIn = toLocalDateStr(b.checkInDate)
      const checkOut = toLocalDateStr(b.checkOutDate)
      return checkIn <= dateRange.end && checkOut >= dateRange.start
    })
  }, [showBookings, allCachedBookings, dateRange.start, dateRange.end])

  // Filter projects and bookings by selected properties and cleaners
  const filteredProjects = useMemo(() => {
    let result = allCachedProjects.filter(p => p.status !== 'cancelled')
    if (selectedPropertyIds.length > 0) {
      result = result.filter(p => selectedPropertyIds.includes(p.propertyId))
    }
    if (selectedCleanerIds.length > 0) {
      const showUnassigned = selectedCleanerIds.includes(UNASSIGNED_FILTER_ID)
      const cleanerIdsOnly = selectedCleanerIds.filter(id => id !== UNASSIGNED_FILTER_ID)
      result = result.filter(p =>
        (showUnassigned && !p.cleanerId) ||
        (p.cleanerId && cleanerIdsOnly.includes(p.cleanerId))
      )
    }
    if (showSameDayOnly) {
      result = result.filter(p => p.isSameDayTurnover)
    }
    return result
  }, [allCachedProjects, selectedPropertyIds, selectedCleanerIds, showSameDayOnly])

  // Filter maintenance tasks by selected properties (cancelled tasks are
  // skipped at render time in PropertyRowView)
  const filteredTasks = useMemo(() => {
    if (selectedPropertyIds.length === 0) return allCachedTasks
    return allCachedTasks.filter(tk => selectedPropertyIds.includes(tk.propertyId))
  }, [allCachedTasks, selectedPropertyIds])

  const filteredProperties = useMemo(() => {
    let result = selectedPropertyIds.length === 0 ? [...properties] : properties.filter(p => selectedPropertyIds.includes(p.id))
    const getName = (p: Property) => p.listingName || p.internalName || p.externalName || p.address || ''
    switch (sortOption) {
      case 'alpha-asc':
        result.sort((a, b) => getName(a).localeCompare(getName(b)))
        break
      case 'alpha-desc':
        result.sort((a, b) => getName(b).localeCompare(getName(a)))
        break
      case 'projects-desc': {
        const countMap = new Map<string, number>()
        for (const p of allCachedProjects) {
          countMap.set(p.propertyId, (countMap.get(p.propertyId) || 0) + 1)
        }
        result.sort((a, b) => (countMap.get(b.id) || 0) - (countMap.get(a.id) || 0))
        break
      }
      case 'next-project': {
        const now = toLocalDateStr(new Date().toISOString())
        const nextMap = new Map<string, string>()
        for (const p of allCachedProjects) {
          if (p.projectDate >= now) {
            const cur = nextMap.get(p.propertyId)
            if (!cur || p.projectDate < cur) nextMap.set(p.propertyId, p.projectDate)
          }
        }
        result.sort((a, b) => (nextMap.get(a.id) || '9999-99-99').localeCompare(nextMap.get(b.id) || '9999-99-99'))
        break
      }
    }
    return result
  }, [properties, selectedPropertyIds, sortOption, allCachedProjects])

  const filteredCleaners = useMemo(() => {
    let result = selectedCleanerIds.length === 0 ? [...cleaners] : cleaners.filter(c => selectedCleanerIds.includes(c.id))
    const getName = (c: Cleaner) => c.name || c.email || ''
    switch (sortOption) {
      case 'alpha-asc':
        result.sort((a, b) => getName(a).localeCompare(getName(b)))
        break
      case 'alpha-desc':
        result.sort((a, b) => getName(b).localeCompare(getName(a)))
        break
      case 'projects-desc': {
        const countMap = new Map<string, number>()
        for (const p of allCachedProjects) {
          if (p.cleanerId) countMap.set(p.cleanerId, (countMap.get(p.cleanerId) || 0) + 1)
        }
        result.sort((a, b) => (countMap.get(b.id) || 0) - (countMap.get(a.id) || 0))
        break
      }
      case 'next-project': {
        const now = toLocalDateStr(new Date().toISOString())
        const nextMap = new Map<string, string>()
        for (const p of allCachedProjects) {
          if (p.cleanerId && p.projectDate >= now) {
            const cur = nextMap.get(p.cleanerId)
            if (!cur || p.projectDate < cur) nextMap.set(p.cleanerId, p.projectDate)
          }
        }
        result.sort((a, b) => (nextMap.get(a.id) || '9999-99-99').localeCompare(nextMap.get(b.id) || '9999-99-99'))
        break
      }
    }
    return result
  }, [cleaners, selectedCleanerIds, sortOption, allCachedProjects])

  // Contractors for the contractor view (no contractor filter in v1 —
  // sorting mirrors filteredCleaners but metrics come from maintenance tasks)
  const filteredContractors = useMemo(() => {
    const result = [...contractors]
    const getName = (c: Contractor) => c.name || c.email || ''
    switch (sortOption) {
      case 'alpha-asc':
        result.sort((a, b) => getName(a).localeCompare(getName(b)))
        break
      case 'alpha-desc':
        result.sort((a, b) => getName(b).localeCompare(getName(a)))
        break
      case 'projects-desc': {
        const countMap = new Map<string, number>()
        for (const tk of allCachedTasks) {
          if (tk.contractorId) countMap.set(tk.contractorId, (countMap.get(tk.contractorId) || 0) + 1)
        }
        result.sort((a, b) => (countMap.get(b.id) || 0) - (countMap.get(a.id) || 0))
        break
      }
      case 'next-project': {
        const now = toLocalDateStr(new Date().toISOString())
        const nextMap = new Map<string, string>()
        for (const tk of allCachedTasks) {
          if (!tk.contractorId || !tk.scheduledDate) continue
          const taskDate = toLocalDateStr(tk.scheduledDate)
          if (taskDate >= now) {
            const cur = nextMap.get(tk.contractorId)
            if (!cur || taskDate < cur) nextMap.set(tk.contractorId, taskDate)
          }
        }
        result.sort((a, b) => (nextMap.get(a.id) || '9999-99-99').localeCompare(nextMap.get(b.id) || '9999-99-99'))
        break
      }
    }
    return result
  }, [contractors, sortOption, allCachedTasks])

  const filteredBookings = useMemo(() => {
    if (selectedPropertyIds.length === 0) return visibleBookings
    return visibleBookings.filter(b => selectedPropertyIds.includes(b.propertyId))
  }, [visibleBookings, selectedPropertyIds])


  // Click-to-activate: first click activates, second click opens modal
  const openProjectModal = useCallback((project: CleaningProject) => {
    setSelectedProject(project)
    setShowDetailModal(true)
  }, [])

  const openBookingModal = useCallback((booking: Booking) => {
    setSelectedBooking(booking)
    setShowBookingPreview(true)
  }, [])

  const openTaskModal = useCallback((task: MaintenanceTask) => {
    setSelectedTask(task)
    setShowTaskDetailModal(true)
  }, [])

  const { activatedItem, handleProjectClick, handleBookingClick, handleTaskClick, clearActivatedItem } = useActivatedItem({
    onOpenProjectModal: openProjectModal,
    onOpenBookingModal: openBookingModal,
    onOpenTaskModal: openTaskModal,
  })

  // Escape key deactivates
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearActivatedItem()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clearActivatedItem])

  // Handle project update (after editing in modal)
  const handleProjectUpdate = (updatedProject: CleaningProject) => {
    setProjectCache(prev => {
      const next = new Map(prev)
      for (const [key, projects] of next) {
        const idx = projects.findIndex(p => p.id === updatedProject.id)
        if (idx !== -1) {
          const updated = [...projects]
          updated[idx] = updatedProject
          next.set(key, updated)
        }
      }
      return next
    })
    setShowDetailModal(false)
    setSelectedProject(null)
    refreshIssueCounts()
  }

  // Handle new project created
  const handleProjectCreate = (newProject: CleaningProject) => {
    // Determine which month this project belongs to
    const projDate = new Date(newProject.projectDate + 'T00:00:00')
    const monthKey = getMonthKey(projDate)
    setProjectCache(prev => {
      const next = new Map(prev)
      const existing = next.get(monthKey) || []
      next.set(monthKey, [...existing, newProject])
      return next
    })
    setShowCreateModal(false)
    // Refresh stats
    if (effectiveUserId) {
      getCleaningProjectStats(effectiveUserId!, dateRange.start, dateRange.end)
        .then(res => {
          if (res.status === 'success') setStats(res.data)
        })
    }
  }

  // Handle project deletion
  const handleProjectDelete = (deletedId: string) => {
    setProjectCache(prev => {
      const next = new Map(prev)
      for (const [key, projects] of next) {
        const filtered = projects.filter(p => p.id !== deletedId)
        if (filtered.length !== projects.length) {
          next.set(key, filtered)
        }
      }
      return next
    })
    setShowDetailModal(false)
    setSelectedProject(null)
    // Refresh stats
    if (effectiveUserId) {
      getCleaningProjectStats(effectiveUserId!, dateRange.start, dateRange.end)
        .then(res => {
          if (res.status === 'success') setStats(res.data)
        })
    }
    refreshIssueCounts()
  }

  // Handle project cancel (same as delete from calendar perspective — removes from cache)
  const handleProjectCancel = (cancelledId: string) => {
    setProjectCache(prev => {
      const next = new Map(prev)
      for (const [key, projects] of next) {
        const filtered = projects.filter(p => p.id !== cancelledId)
        if (filtered.length !== projects.length) {
          next.set(key, filtered)
        }
      }
      return next
    })
    setShowDetailModal(false)
    setSelectedProject(null)
    // Refresh stats
    if (effectiveUserId) {
      getCleaningProjectStats(effectiveUserId!, dateRange.start, dateRange.end)
        .then(res => {
          if (res.status === 'success') setStats(res.data)
        })
    }
    refreshIssueCounts()
  }

  // Handle booking delete from calendar
  const handleBookingDelete = async () => {
    if (!selectedBooking || !effectiveUserId) return
    try {
      setBookingActionLoading(true)
      const res = await deleteBooking(selectedBooking.id, effectiveUserId!)
      if (res.status === 'success') {
        // Remove from booking cache
        setBookingCache(prev => {
          const next = new Map(prev)
          for (const [key, bookings] of next) {
            const filtered = bookings.filter(b => b.id !== selectedBooking.id)
            if (filtered.length !== bookings.length) {
              next.set(key, filtered)
            }
          }
          return next
        })
        showNotification(t('bookingDeleted'), 'success')
        setShowBookingDeleteConfirm(false)
        setShowBookingPreview(false)
        setSelectedBooking(null)
      } else {
        showNotification(res.message || t('failedToDeleteBooking'), 'error')
      }
    } catch (err) {
      console.error('Error deleting booking:', err)
      showNotification(err instanceof Error ? err.message : t('failedToDeleteBooking'), 'error')
    } finally {
      setBookingActionLoading(false)
    }
  }

  // Handle booking cancel from calendar
  const handleBookingCancel = async () => {
    if (!selectedBooking || !effectiveUserId) return
    try {
      setBookingActionLoading(true)
      const res = await cancelBooking(selectedBooking.id, effectiveUserId!)
      if (res.status === 'success') {
        // Remove cancelled booking from cache (filtered out in visibleBookings)
        setBookingCache(prev => {
          const next = new Map(prev)
          for (const [key, bookings] of next) {
            const filtered = bookings.filter(b => b.id !== selectedBooking.id)
            if (filtered.length !== bookings.length) {
              next.set(key, filtered)
            }
          }
          return next
        })
        // Also remove any linked cleaning projects from cache
        setProjectCache(prev => {
          const next = new Map(prev)
          for (const [key, projects] of next) {
            const filtered = projects.filter(p => p.previousBookingId !== selectedBooking.id)
            if (filtered.length !== projects.length) {
              next.set(key, filtered)
            }
          }
          return next
        })
        showNotification(t('bookingCancelled'), 'success')
        setShowBookingCancelConfirm(false)
        setShowBookingPreview(false)
        setSelectedBooking(null)
      } else {
        showNotification(res.message || t('failedToCancelBooking'), 'error')
      }
    } catch (err) {
      console.error('Error cancelling booking:', err)
      showNotification(err instanceof Error ? err.message : t('failedToCancelBooking'), 'error')
    } finally {
      setBookingActionLoading(false)
    }
  }

  // Invalidate specific months from cache and trigger re-fetch
  const invalidateAndRefetch = useCallback(async (monthKeys: string[]) => {
    if (!effectiveUserId) return
    setProjectCache(prev => {
      const next = new Map(prev)
      monthKeys.forEach(k => next.delete(k))
      return next
    })
    setBookingCache(prev => {
      const next = new Map(prev)
      monthKeys.forEach(k => next.delete(k))
      return next
    })
    // Update refs immediately so fetchMonthsForRange sees the invalidation
    monthKeys.forEach(k => {
      projectCacheRef.current.delete(k)
      bookingCacheRef.current.delete(k)
    })
    // Re-fetch
    await fetchMonthsForRange(currentDate, effectiveUserId!)
  }, [effectiveUserId, currentDate, fetchMonthsForRange])

  // Get affected month keys for a date
  const getMonthKeyForDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00')
    return getMonthKey(d)
  }

  // Refresh stats after mutations
  const refreshStats = useCallback(() => {
    if (!effectiveUserId) return
    getCleaningProjectStats(effectiveUserId!, dateRange.start, dateRange.end)
      .then(res => {
        if (res.status === 'success') setStats(res.data)
      })
  }, [effectiveUserId, dateRange.start, dateRange.end])

  // Refetch only cleaning projects for specific months (not bookings)
  const refetchProjectsOnly = useCallback(async (monthKeys: string[]) => {
    if (!effectiveUserId) return
    // Invalidate project cache for these months
    setProjectCache(prev => {
      const next = new Map(prev)
      monthKeys.forEach(k => next.delete(k))
      return next
    })
    monthKeys.forEach(k => {
      projectCacheRef.current.delete(k)
    })
    // Fetch projects for each month
    const results = await Promise.all(
      monthKeys.map(async (monthKey) => {
        const { startDate, endDate } = getMonthBounds(monthKey)
        try {
          const res = await getCleaningProjects({ userId: effectiveUserId!, startDate, endDate })
          return { monthKey, projects: res.status === 'success' ? res.data : null }
        } catch {
          return { monthKey, projects: null }
        }
      })
    )
    setProjectCache(prev => {
      const next = new Map(prev)
      results.forEach(r => {
        if (r.projects) next.set(r.monthKey, r.projects)
      })
      return next
    })
  }, [effectiveUserId])

  // Surgically update a single project in cache (handles month bucket changes)
  const surgicallyUpdateProjectInCache = useCallback((
    projectId: string,
    updatedProject: CleaningProject,
    sourceDate: string,
    targetDate: string
  ) => {
    const sourceMonth = getMonthKeyForDate(sourceDate)
    const targetMonth = getMonthKeyForDate(targetDate)

    setProjectCache(prev => {
      const next = new Map(prev)

      // Remove from all month buckets (project might appear in source month)
      for (const [key, projects] of next) {
        const filtered = projects.filter(p => p.id !== projectId)
        if (filtered.length !== projects.length) {
          next.set(key, filtered)
        }
      }

      // Add to target month bucket
      const targetBucket = next.get(targetMonth) || []
      next.set(targetMonth, [...targetBucket, updatedProject])

      return next
    })
  }, [])

  // Surgically update a single maintenance task in cache (handles month bucket
  // changes): remove from all buckets, insert into its scheduledDate's month.
  const surgicallyUpdateTaskInCache = useCallback((task: MaintenanceTask) => {
    setTaskCache(prev => {
      const next = new Map(prev)

      // Remove from all month buckets (task might have moved months)
      for (const [key, tasks] of next) {
        const filtered = tasks.filter(tk => tk.id !== task.id)
        if (filtered.length !== tasks.length) {
          next.set(key, filtered)
        }
      }

      // Insert into the scheduledDate's month bucket (unscheduled tasks are
      // simply removed — they have no calendar position)
      if (task.scheduledDate) {
        const targetMonth = getMonthKeyForDate(toLocalDateStr(task.scheduledDate))
        const targetBucket = next.get(targetMonth) || []
        next.set(targetMonth, [...targetBucket, task])
      }

      return next
    })
  }, [])

  // Remove a maintenance task from all cache buckets (deletions)
  const removeTaskFromCache = useCallback((taskId: string) => {
    setTaskCache(prev => {
      const next = new Map(prev)
      for (const [key, tasks] of next) {
        const filtered = tasks.filter(tk => tk.id !== taskId)
        if (filtered.length !== tasks.length) {
          next.set(key, filtered)
        }
      }
      return next
    })
  }, [])

  // Two-step "Task Project" flow (report standalone issue → create task)
  const {
    showReportIssueModal,
    pendingTaskIssue,
    showCreateTaskModal,
    startTaskProjectFlow,
    handleIssueCreated,
    handleTaskCreated,
    closeAll: closeTaskProjectFlow,
  } = useTaskProjectFlow({
    onTaskCreated: (task) => {
      surgicallyUpdateTaskInCache(task)
    },
  })

  // Handle pending drop from view components
  const handlePendingDrop = useCallback((drop: PendingDrop) => {
    setPendingDrop(drop)
  }, [])

  const handleInvalidDrop = useCallback((info: InvalidDropInfo) => {
    setInvalidDropInfo(info)
  }, [])

  // Confirm and execute the pending drop
  const handleConfirmDrop = useCallback(async () => {
    if (!pendingDrop || !effectiveUserId) return

    const affectedMonths = new Set<string>()
    affectedMonths.add(getMonthKeyForDate(pendingDrop.sourceDate))
    affectedMonths.add(getMonthKeyForDate(pendingDrop.targetDate))

    try {
      if (pendingDrop.item.type === 'project') {
        const project = (pendingDrop.item as ProjectDragData).project
        const dateChanged = pendingDrop.sourceDate !== pendingDrop.targetDate
        const cleanerChanged =
          pendingDrop.targetCleanerId !== undefined &&
          (pendingDrop.targetCleanerId || null) !== (pendingDrop.sourceCleanerId || null)

        // Reschedule date (always safe — backend treats same-date as no-op)
        const dateRes = await rescheduleProjectDate(project.id, {
          projectDate: pendingDrop.targetDate,
        })
        if (dateRes.status !== 'success') {
          showNotification(dateRes.message || 'Failed to reschedule', 'error')
          setPendingDrop(null)
          return
        }

        let updatedProject = dateRes.data

        // Then reassign cleaner if changed
        if (cleanerChanged) {
          if (pendingDrop.targetCleanerId) {
            const assignRes = await assignCleanerToProject(project.id, {
              cleanerId: pendingDrop.targetCleanerId,
            })
            if (assignRes.status === 'success') {
              updatedProject = assignRes.data
            } else {
              showNotification(assignRes.message || 'Failed to reassign cleaner', 'error')
            }
          } else {
            // Unassign cleaner
            const unassignRes = await updateCleaningProject(project.id, { cleanerId: null })
            if (unassignRes.status === 'success') {
              updatedProject = unassignRes.data
            }
          }
        }

        // Surgical cache update — no network refetch needed
        surgicallyUpdateProjectInCache(
          project.id,
          updatedProject,
          pendingDrop.sourceDate,
          pendingDrop.targetDate
        )
        refreshStats()
        const successKey =
          dateChanged && cleanerChanged
            ? 'projectRescheduledAndReassigned'
            : cleanerChanged
              ? 'cleanerReassigned'
              : 'projectRescheduled'
        showNotification(t(successKey), 'success')
      } else if (pendingDrop.item.type === 'booking') {
        const bookingData = pendingDrop.item as BookingDragData
        const res = await rescheduleBookingDates(bookingData.booking.id, {
          userId: effectiveUserId!,
          checkInDate: pendingDrop.targetDate,
          numNights: bookingData.numNights,
        })
        if (res.status === 'success') {
          // 1. Surgical booking cache update with response data
          setBookingCache(prev => {
            const next = new Map(prev)
            const sourceMonth = getMonthKeyForDate(pendingDrop.sourceDate)
            const targetMonth = getMonthKeyForDate(pendingDrop.targetDate)

            // Remove from all buckets
            for (const [key, bookings] of next) {
              const filtered = bookings.filter(b => b.id !== res.data.id)
              if (filtered.length !== bookings.length) {
                next.set(key, filtered)
              }
            }

            // Add to target month bucket
            const targetBucket = next.get(targetMonth) || []
            next.set(targetMonth, [...targetBucket, res.data])

            return next
          })

          // 2. Wait for backend fire-and-forget cleaning project sync
          await new Promise(resolve => setTimeout(resolve, 500))

          // 3. Refetch only cleaning projects for affected months
          await refetchProjectsOnly(Array.from(affectedMonths))

          // 4. Refresh stats
          refreshStats()

          showNotification(t('bookingRescheduled'), 'success')
        } else {
          showNotification(res.message || t('failedToRescheduleBooking'), 'error')
          setPendingDrop(null)
          return
        }
      }
    } catch (err) {
      console.error('Error executing drop:', err)
      if (isValidationError(err)) {
        err.errors.forEach((e) => showNotification(e, 'error'))
      } else {
        showNotification(err instanceof Error ? err.message : t('failedToCompleteMove'), 'error')
      }
    } finally {
      setPendingDrop(null)
    }
  }, [pendingDrop, effectiveUserId, showNotification, surgicallyUpdateProjectInCache, refetchProjectsOnly, refreshStats])

  // Computed: open issue count for CalendarHeader badge
  const openIssueCount = useMemo(() =>
    allIssues.filter(i => i.status !== 'resolved').length,
    [allIssues]
  )

  // Computed: excluded property count
  const excludedPropertyCount = useMemo(() =>
    properties.filter(p => p.cleaningManaged === false).length,
    [properties]
  )

  // Toggle cleaning_managed for a property
  const handleToggleCleaningManaged = useCallback(async (propertyId: string, enabled: boolean) => {
    try {
      const res = await updateProperty(propertyId, { cleaningManaged: enabled })
      if (res.status === 'success') {
        setProperties(prev => prev.map(p =>
          p.id === propertyId ? { ...p, cleaningManaged: enabled } : p
        ))
        if (enabled) {
          setSelectedPropertyIds(prev => prev.includes(propertyId) ? prev : [...prev, propertyId])
        } else {
          setSelectedPropertyIds(prev => prev.filter(id => id !== propertyId))
        }
        showNotification(
          enabled ? t('cleaningManagementEnabled') : t('cleaningManagementDisabled'),
          'success'
        )
      } else {
        showNotification(res.message || t('failedToUpdatePropertyCleaning'), 'error')
      }
    } catch (err) {
      console.error('Error toggling cleaning managed:', err)
      showNotification(t('failedToUpdatePropertyCleaning'), 'error')
    }
  }, [showNotification])

  // Arrow navigation handlers
  const handlePrevWeek = useCallback(() => {
    setExpandedDate(null)
    setCurrentDate(prev => {
      if (zoomLevel === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      }
      const d = new Date(prev)
      if (isWeekPreset && zoomLevel === 7) {
        // Snap to Saturday then shift back by 7
        const daysToSaturday = (d.getDay() + 1) % 7
        d.setDate(d.getDate() - daysToSaturday)
        d.setDate(d.getDate() - 7)
      } else {
        d.setDate(d.getDate() - (zoomLevel as number))
        d.setHours(0, 0, 0, 0)
      }
      return d
    })
    setNavigationEpoch(e => e + 1)
  }, [zoomLevel, isWeekPreset])

  const handleNextWeek = useCallback(() => {
    setExpandedDate(null)
    setCurrentDate(prev => {
      if (zoomLevel === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      }
      const d = new Date(prev)
      if (isWeekPreset && zoomLevel === 7) {
        // Snap to Saturday then shift forward by 7
        const daysToSaturday = (d.getDay() + 1) % 7
        d.setDate(d.getDate() - daysToSaturday)
        d.setDate(d.getDate() + 7)
      } else {
        d.setDate(d.getDate() + (zoomLevel as number))
        d.setHours(0, 0, 0, 0)
      }
      return d
    })
    setNavigationEpoch(e => e + 1)
  }, [zoomLevel, isWeekPreset])

  // Pixel-scroll date shift handler (called by view components when scroll crosses a column boundary)
  const handleRequestDateShift = useCallback((days: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + days)
      return d
    })
  }, [])

  const handleToday = useCallback(() => {
    const today = new Date()
    if (isWeekPreset && zoomLevel === 7) {
      const daysToSaturday = (today.getDay() + 1) % 7
      today.setDate(today.getDate() - daysToSaturday)
    }
    setCurrentDate(today)
    setExpandedDate(null)
    setNavigationEpoch(e => e + 1)
  }, [isWeekPreset, zoomLevel])

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <CalendarDaysIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading turnover calendar...</p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 border border-red-200 rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-800">Error loading calendar</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2 sm:space-y-5"
    >
      {/* Stats Bar */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          <StatPill label="Total" value={stats.total} color="blue" />
          <StatPill label="Pending" value={stats.pending} color="yellow" />
          <StatPill label="Assigned" value={stats.assigned} color="blue" />
          <StatPill label="Confirmed" value={stats.confirmed} color="indigo" />
          <StatPill label="In Progress" value={stats.inProgress} color="purple" />
          <StatPill label="Completed" value={stats.completed} color="green" />
          <StatPill label="Unassigned" value={stats.unassigned} color="amber" highlight />
        </div>
      )}

      {/* Calendar Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ maxHeight: isMobile ? 'calc(100vh - 13rem)' : 'calc(100vh - 15rem)' }}>
        {/* Header with navigation and view toggle — stays outside scroll area */}
        <CalendarHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentDate={currentDate}
          dateRange={dateRange}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
          onCreateProject={() => setShowCreateModal(true)}
          onCreateTaskProject={startTaskProjectFlow}
          onCreateChecklist={() => setShowCreateChecklistModal(true)}
          onDuplicateChecklist={() => setShowDuplicateChecklistModal(true)}
          showBookings={viewMode !== 'property' ? false : showBookings}
          onToggleBookings={viewMode !== 'property' ? undefined : handleToggleBookings}
          bookingsLoading={viewMode !== 'property' ? false : bookingsLoading}
          properties={properties}
          selectedPropertyIds={selectedPropertyIds}
          onPropertyFilterChange={setSelectedPropertyIds}
          cleaners={cleaners}
          selectedCleanerIds={selectedCleanerIds}
          onCleanerFilterChange={setSelectedCleanerIds}
          zoomLevel={zoomLevel}
          onZoomChange={handleZoomChange}
          isWeekPreset={isWeekPreset}
          sortOption={sortOption}
          onSortChange={setSortOption}
          openIssueCount={openIssueCount}
          onOpenAllIssues={() => setShowAllIssuesModal(true)}
          onOpenPhotoGallery={() => setShowPhotoGalleryModal(true)}
          excludedPropertyCount={excludedPropertyCount}
          onOpenExclusions={() => setShowExclusionsModal(true)}
          showSameDayOnly={showSameDayOnly}
          onToggleSameDayOnly={setShowSameDayOnly}
          density={density}
          onDensityChange={handleDensityChange}
        />

        {/* Scroll container for calendar body */}
        <div ref={scrollContainerRef} className="overflow-y-auto flex-1 min-h-0 relative rounded-b-2xl" onClick={clearActivatedItem}>
          {/* Sticky header portal target — sticks to top of scroll container */}
          <div className="sticky top-0 z-20 h-0">
            <div ref={stickyPortalRef} />
          </div>

          {/* Calendar View */}
          <AnimatePresence mode="wait">
            <motion.div
              key={zoomLevel === 'month' ? 'month' : viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-x-hidden"
              style={{ overscrollBehaviorX: 'none' }}
            >
              {zoomLevel === 'month' ? (
                <MonthGridView
                  projects={filteredProjects}
                  properties={filteredProperties}
                  bookings={showBookings ? filteredBookings : []}
                  dateRange={dateRange}
                  onProjectClick={handleProjectClick}
                  onBookingClick={handleBookingClick}
                  onDayClick={handleMonthDayClick}
                  issueCountsMap={issueCountsMap}
                  supplyListCountsMap={supplyListCountsMap}
                  stickyPortal={stickyPortalRef}
                  scrollContainer={scrollContainerRef}
                  activatedItem={activatedItem}
                />
              ) : viewMode === 'property' ? (
                <PropertyRowView
                  projects={filteredProjects}
                  properties={filteredProperties}
                  dateRange={dateRange}
                  onProjectClick={handleProjectClick}
                  onBookingClick={handleBookingClick}
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  issueCountsMap={issueCountsMap}
                  supplyListCountsMap={supplyListCountsMap}
                  bookings={showBookings ? filteredBookings : []}
                  allBookingsForValidation={allCachedBookings}
                  zoomLevel={zoomLevel}
                  onRequestDateShift={handleRequestDateShift}
                  onPendingDrop={handlePendingDrop}
                  onInvalidDrop={handleInvalidDrop}
                  stickyPortal={stickyPortalRef}
                  expandedDate={expandedDate}
                  onExpandDate={setExpandedDate}
                  onDayClick={handleDayClick}
                  scrollContainer={scrollContainerRef}
                  navigationEpoch={navigationEpoch}
                  activatedItem={activatedItem}
                  onOpenProjectModal={openProjectModal}
                  onOpenBookingModal={openBookingModal}
                  sizeConfig={sizeConfig}
                />
              ) : viewMode === 'cleaner' ? (
                <CleanerRowView
                  projects={filteredProjects}
                  cleaners={filteredCleaners}
                  dateRange={dateRange}
                  onProjectClick={handleProjectClick}
                  issueCountsMap={issueCountsMap}
                  supplyListCountsMap={supplyListCountsMap}
                  zoomLevel={zoomLevel}
                  onRequestDateShift={handleRequestDateShift}
                  onPendingDrop={handlePendingDrop}
                  onInvalidDrop={handleInvalidDrop}
                  stickyPortal={stickyPortalRef}
                  expandedDate={expandedDate}
                  sizeConfig={sizeConfig}
                  onExpandDate={setExpandedDate}
                  onDayClick={handleDayClick}
                  scrollContainer={scrollContainerRef}
                  navigationEpoch={navigationEpoch}
                  activatedItem={activatedItem}
                  onOpenProjectModal={openProjectModal}
                />
              ) : (
                <ContractorRowView
                  tasks={filteredTasks}
                  contractors={filteredContractors}
                  dateRange={dateRange}
                  onTaskClick={handleTaskClick}
                  zoomLevel={zoomLevel}
                  onRequestDateShift={handleRequestDateShift}
                  stickyPortal={stickyPortalRef}
                  expandedDate={expandedDate}
                  sizeConfig={sizeConfig}
                  onExpandDate={setExpandedDate}
                  onDayClick={handleDayClick}
                  scrollContainer={scrollContainerRef}
                  navigationEpoch={navigationEpoch}
                  activatedItem={activatedItem}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedProject(null)
            // Refresh counts when modal closes (in case issues/supply lists were modified)
            refreshIssueCounts()
            refreshSupplyListCounts()
          }}
          project={selectedProject}
          cleaners={cleaners}
          properties={properties}
          onUpdate={handleProjectUpdate}
          onDelete={handleProjectDelete}
          onCancel={handleProjectCancel}
          initialSection={deepLinkInitialSection}
        />
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleProjectCreate}
        properties={properties.filter(p => p.cleaningManaged !== false)}
        cleaners={cleaners}
        initialDate={dateRange.start}
      />

      {/* Create Checklist Modal */}
      <CreateChecklistModal
        isOpen={showCreateChecklistModal}
        onClose={() => setShowCreateChecklistModal(false)}
        onAdd={() => {
          setShowCreateChecklistModal(false)
          showNotification(t('checklistCreated'), 'success')
        }}
        properties={properties}
      />

      {/* Duplicate Checklist Modal */}
      <DuplicateChecklistModal
        isOpen={showDuplicateChecklistModal}
        onClose={() => setShowDuplicateChecklistModal(false)}
        onDuplicate={() => {
          setShowDuplicateChecklistModal(false)
          showNotification(t('checklistDuplicated'), 'success')
        }}
        properties={properties}
      />

      {/* Task Project Flow — Step 1: report a standalone issue */}
      <ReportStandaloneIssueModal
        isOpen={showReportIssueModal}
        onClose={closeTaskProjectFlow}
        properties={properties}
        onCreated={(issue) => {
          handleIssueCreated(issue)
          refreshIssueCounts()
        }}
      />

      {/* Task Project Flow — Step 2: create a maintenance task from the issue */}
      {pendingTaskIssue && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={closeTaskProjectFlow}
          issue={pendingTaskIssue}
          onCreated={handleTaskCreated}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={showTaskDetailModal}
          onClose={() => {
            setShowTaskDetailModal(false)
            setSelectedTask(null)
            refreshIssueCounts()
          }}
          task={selectedTask}
          onTaskUpdated={(updatedTask) => {
            surgicallyUpdateTaskInCache(updatedTask)
            setSelectedTask(updatedTask)
          }}
          onTaskDeleted={(taskId) => {
            removeTaskFromCache(taskId)
            setShowTaskDetailModal(false)
            setSelectedTask(null)
          }}
        />
      )}

      {/* Booking Preview Modal */}
      {selectedBooking && (
        <PreviewBookingModal
          isOpen={showBookingPreview}
          onClose={() => {
            setShowBookingPreview(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
          onEditBooking={() => {
            setShowBookingPreview(false)
            setShowBookingUpdate(true)
          }}
          onDeleteBooking={() => setShowBookingDeleteConfirm(true)}
          onCancelBooking={() => setShowBookingCancelConfirm(true)}
        />
      )}

      {/* Booking Cancel Confirmation */}
      {selectedBooking && (
        <Modal isOpen={showBookingCancelConfirm} onClose={() => setShowBookingCancelConfirm(false)} style="p-6 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Booking</h3>
            <p className="text-sm text-gray-600 mb-1">
              Are you sure you want to cancel <strong>{selectedBooking.guestName}</strong>&apos;s booking?
            </p>
            <p className="text-xs text-gray-500 mb-6">
              This will also cancel any associated cleaning projects.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowBookingCancelConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleBookingCancel}
                disabled={bookingActionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bookingActionLoading ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Booking Delete Confirmation */}
      {selectedBooking && (
        <Modal isOpen={showBookingDeleteConfirm} onClose={() => setShowBookingDeleteConfirm(false)} style="p-6 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Booking</h3>
            <p className="text-sm text-gray-600 mb-1">
              Are you sure you want to permanently delete <strong>{selectedBooking.guestName}</strong>&apos;s booking?
            </p>
            <p className="text-xs text-gray-500 mb-6">
              This action cannot be undone. Associated cleaning projects will be cancelled.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowBookingDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleBookingDelete}
                disabled={bookingActionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bookingActionLoading ? 'Deleting...' : 'Delete Booking'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Booking Update Modal */}
      {selectedBooking && (
        <UpdateBookingModal
          isOpen={showBookingUpdate}
          onClose={() => {
            setShowBookingUpdate(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
          onUpdate={(updatedBooking) => {
            // Capture the old booking dates before updating cache
            const oldCheckIn = selectedBooking?.checkInDate
            const oldCheckOut = selectedBooking?.checkOutDate

            // Update booking in the cache
            setBookingCache(prev => {
              const next = new Map(prev)
              // Remove from all buckets first
              for (const [key, bookings] of next) {
                const filtered = bookings.filter(b => b.id !== updatedBooking.id)
                if (filtered.length !== bookings.length) {
                  next.set(key, filtered)
                }
              }
              // Add to target month bucket
              const targetMonth = getMonthKeyForDate(updatedBooking.checkInDate.split('T')[0])
              const targetBucket = next.get(targetMonth) || []
              next.set(targetMonth, [...targetBucket, updatedBooking])
              return next
            })
            setShowBookingUpdate(false)
            setSelectedBooking(null)

            // If dates changed, refetch projects after backend sync
            const oldDate = oldCheckIn?.split('T')[0]
            const newDate = updatedBooking.checkInDate.split('T')[0]
            if (oldDate !== newDate) {
              const months = new Set<string>()
              if (oldDate) months.add(getMonthKeyForDate(oldDate))
              if (oldCheckOut) months.add(getMonthKeyForDate(oldCheckOut.split('T')[0]))
              months.add(getMonthKeyForDate(newDate))
              if (updatedBooking.checkOutDate) months.add(getMonthKeyForDate(updatedBooking.checkOutDate.split('T')[0]))

              setTimeout(async () => {
                await refetchProjectsOnly(Array.from(months))
                refreshStats()
              }, 500)
            }
          }}
        />
      )}

      {/* All Issues Modal */}
      <AllIssuesModal
        isOpen={showAllIssuesModal}
        onClose={() => setShowAllIssuesModal(false)}
        issues={allIssues}
        onIssuesChanged={() => { refreshIssueCounts(); refreshSupplyListCounts() }}
      />

      {/* Photo Gallery Modal */}
      {effectiveUserId && (
        <PhotoGalleryModal
          isOpen={showPhotoGalleryModal}
          onClose={() => setShowPhotoGalleryModal(false)}
          userId={effectiveUserId}
          initialStartDate={dateRange.start}
          initialEndDate={dateRange.end}
        />
      )}

      {/* Cleaning Exclusions Modal */}
      <CleaningExclusionsModal
        isOpen={showExclusionsModal}
        onClose={() => setShowExclusionsModal(false)}
        properties={properties}
        onToggleCleaningManaged={handleToggleCleaningManaged}
      />

      {/* Drag-and-Drop Confirmation Modal */}
      <ConfirmDragModal
        isOpen={!!pendingDrop}
        pendingDrop={pendingDrop}
        onConfirm={handleConfirmDrop}
        onCancel={() => setPendingDrop(null)}
      />

      <InvalidDropModal
        isOpen={!!invalidDropInfo}
        info={invalidDropInfo}
        onClose={() => setInvalidDropInfo(null)}
      />
    </motion.div>
  )
}

// Compact stat pill for mobile
function StatPill({
  label,
  value,
  color,
  highlight,
}: {
  label: string
  value: number
  color: string
  highlight?: boolean
}) {
  const dotColors: Record<string, string> = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
  }
  const textColors: Record<string, string> = {
    blue: 'text-blue-700',
    yellow: 'text-yellow-700',
    indigo: 'text-indigo-700',
    purple: 'text-purple-700',
    green: 'text-green-700',
    amber: 'text-amber-700',
  }

  return (
    <div
      className={`
        flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 whitespace-nowrap
        ${highlight && value > 0 ? 'ring-2 ring-amber-300 ring-offset-1' : ''}
      `}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColors[color] || dotColors.blue}`} />
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-bold ${textColors[color] || textColors.blue}`}>{value}</span>
    </div>
  )
}

