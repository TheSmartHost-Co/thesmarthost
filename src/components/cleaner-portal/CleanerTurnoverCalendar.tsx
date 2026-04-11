'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getCleanerByAuthUserId, getCleanerSchedule } from '@/services/cleanerService'
import {
  acceptProject,
  declineProject,
  startProject,
  completeProject,
  getCleaningProjectById,
} from '@/services/cleaningProjectService'
import { getMonthKey, getMonthBounds } from '@/services/bookingService'
import { getIssueCounts } from '@/services/projectIssueService'
import { getSupplyListsByProject } from '@/services/supplyListService'
import { getPendingTimeChangeRequest } from '@/services/timeChangeRequestService'
import { toLocalDateStr } from '@/components/turnover/utils/calendarDateUtils'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import type { ZoomLevel, SortOption } from '@/components/turnover/TurnoverCalendar'
import CalendarHeader from '@/components/turnover/CalendarHeader'
import PropertyRowView from '@/components/turnover/PropertyRowView'
import MonthGridView from '@/components/turnover/MonthGridView'
import { useActivatedItem } from '@/components/turnover/hooks/useActivatedItem'
import ProjectCard from './ProjectCard'
import SimpleCalendarView from './SimpleCalendarView'
import ChecklistModal from './ChecklistModal'
import RequestTimeChangeModal from './RequestTimeChangeModal'
import ViewPendingTimeChangeModal from './ViewPendingTimeChangeModal'
import CleanerBookingPreviewModal from '@/components/booking/preview/CleanerBookingPreviewModal'

// Read ?projectId from URL synchronously on first render so we can
// skip the calendar entirely and go straight to the checklist on reload.
function getInitialProjectId(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('projectId') || null
}

export default function CleanerTurnoverCalendar() {
  const { t } = useTranslation('cleanerPortal')
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const isMobile = useIsMobile()

  // View state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(7)
  const [isWeekPreset, setIsWeekPreset] = useState(true)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<SortOption>('next-project')
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [calendarMode, setCalendarMode] = useState<'timeline' | 'simple'>('simple')
  const [simpleSelectedDay, setSimpleSelectedDay] = useState<string | null>(null)

  // Data state
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issueCountsMap, setIssueCountsMap] = useState<Record<string, number>>({})
  const [supplyListCountsMap, setSupplyListCountsMap] = useState<Record<string, number>>({})
  const initialFetchDone = useRef(false)

  // Month-based caches
  const [projectCache, setProjectCache] = useState<Map<string, CleaningProject[]>>(new Map())
  const projectCacheRef = useRef<Map<string, CleaningProject[]>>(new Map())
  const [bookingCache, setBookingCache] = useState<Map<string, Booking[]>>(new Map())
  const bookingCacheRef = useRef<Map<string, Booking[]>>(new Map())
  const [fetchingMonths, setFetchingMonths] = useState<Set<string>>(new Set())
  const fetchingMonthsRef = useRef<Set<string>>(new Set())

  // Navigation epoch
  const [navigationEpoch, setNavigationEpoch] = useState(0)

  // Sticky header / scroll refs
  const stickyPortalRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Modal state
  const [selectedProject, setSelectedProject] = useState<CleaningProject | null>(null)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingPreview, setShowBookingPreview] = useState(false)
  const [showTimeChangeModal, setShowTimeChangeModal] = useState(false)
  const [selectedProjectForTimeChange, setSelectedProjectForTimeChange] = useState<CleaningProject | null>(null)
  const [showViewPendingTimeChangeModal, setShowViewPendingTimeChangeModal] = useState(false)
  const [viewPendingProject, setViewPendingProject] = useState<CleaningProject | null>(null)
  const [pendingTimeChangeProjectIds, setPendingTimeChangeProjectIds] = useState<Set<string>>(new Set())

  // Deep-link: read projectId from URL synchronously so we can skip calendar on reload
  const [restoringProjectId] = useState<string | null>(getInitialProjectId)
  const restoredRef = useRef(false)

  // Fetch the project from URL and open checklist immediately (before calendar renders)
  useEffect(() => {
    if (!restoringProjectId || restoredRef.current) return
    restoredRef.current = true

    const clearUrl = () => {
      if (typeof window === 'undefined') return
      const url = new URL(window.location.href)
      url.searchParams.delete('projectId')
      window.history.replaceState({}, '', url.toString())
    }

    const fetchAndOpen = async () => {
      try {
        const res = await getCleaningProjectById(restoringProjectId)
        if (res.status === 'success' && res.data.assignmentType !== 'implicit') {
          setSelectedProject(res.data)
          setShowChecklistModal(true)
        } else {
          clearUrl()
        }
      } catch {
        clearUrl()
      }
    }
    fetchAndOpen()
  }, [restoringProjectId])

  // Bookings toggle
  const [showBookings, setShowBookings] = useState(true)

  // Keep refs in sync
  useEffect(() => { projectCacheRef.current = projectCache }, [projectCache])
  useEffect(() => { bookingCacheRef.current = bookingCache }, [bookingCache])
  useEffect(() => { fetchingMonthsRef.current = fetchingMonths }, [fetchingMonths])

  // Cleaner ref for filtering
  const cleanerRef = useRef<Cleaner | null>(null)

  // Format date as YYYY-MM-DD in local time
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Date range for current view
  const dateRange = useMemo(() => {
    if (zoomLevel === 'month') {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0)
      return { start: formatLocalDate(start), end: formatLocalDate(end) }
    }
    const start = new Date(currentDate)
    start.setHours(0, 0, 0, 0)
    // For week preset, normalize to Sunday start (matching SimpleCalendarView)
    if (isWeekPreset && zoomLevel === 7) {
      start.setDate(start.getDate() - start.getDay())
    }
    const end = new Date(start)
    end.setDate(end.getDate() + (zoomLevel as number) - 1)
    return { start: formatLocalDate(start), end: formatLocalDate(end) }
  }, [currentDate, zoomLevel, isWeekPreset])

  // Fetch months that buffer around centerDate touches (using unified schedule endpoint)
  const fetchMonthsForRange = useCallback(async (centerDate: Date, _userId?: string) => {
    const bufferStart = new Date(centerDate)
    bufferStart.setDate(bufferStart.getDate() - 17)
    const bufferEnd = new Date(centerDate)
    bufferEnd.setDate(bufferEnd.getDate() + (zoomLevel === 'month' ? 45 : (zoomLevel as number) + 17))

    const months: string[] = []
    const cursor = new Date(bufferStart.getFullYear(), bufferStart.getMonth(), 1)
    while (cursor <= bufferEnd) {
      months.push(getMonthKey(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }

    const currentProjectCache = projectCacheRef.current
    const currentBookingCache = bookingCacheRef.current
    const currentFetching = fetchingMonthsRef.current

    const neededMonths = months.filter(m =>
      (!currentProjectCache.has(m) || !currentBookingCache.has(m)) && !currentFetching.has(m)
    )
    if (neededMonths.length === 0) return

    setFetchingMonths(prev => {
      const next = new Set(prev)
      neededMonths.forEach(m => next.add(m))
      return next
    })

    const fetchPromises = neededMonths.map(async (monthKey) => {
      const { startDate, endDate } = getMonthBounds(monthKey)
      try {
        // Skip if both caches already have this month
        if (currentBookingCache.has(monthKey) && currentProjectCache.has(monthKey)) {
          return { monthKey, bookings: null, projects: null }
        }
        const res = await getCleanerSchedule(startDate, endDate)
        if (res.status === 'success') {
          // On first fetch, set cleaner and properties from unified response
          if (!cleanerRef.current) {
            const cleanerData = { ...res.data.cleaner, assignedProperties: res.data.assignedProperties } as Cleaner
            setCleaner(cleanerData)
            cleanerRef.current = cleanerData
            const assignedProps = (res.data.assignedProperties || []).map(ap => ({
              id: ap.propertyId,
              listingName: ap.propertyName || '',
              internalName: ap.propertyName || '',
              address: ap.propertyAddress || '',
              postalCode: '',
              province: '',
              propertyType: 'STR' as const,
              isActive: true,
              createdAt: '',
              updatedAt: '',
              owners: [],
              channels: [],
              licenses: [],
              cleaningManaged: true,
            } satisfies Property))
            setProperties(assignedProps)
            setSelectedPropertyIds(assignedProps.map(p => p.id))
          }
          return {
            monthKey,
            bookings: !currentBookingCache.has(monthKey) ? res.data.bookings : null,
            projects: !currentProjectCache.has(monthKey) ? res.data.cleaningProjects : null,
          }
        }
        return { monthKey, bookings: null, projects: null }
      } catch (err) {
        console.error(`Error fetching month ${monthKey}:`, err)
        return { monthKey, bookings: null, projects: null }
      }
    })

    const results = await Promise.all(fetchPromises)

    const centerKey = getMonthKey(centerDate)
    const [cy, cm] = centerKey.split('-').map(Number)
    const centerMonthNum = cy * 12 + cm

    setProjectCache(prev => {
      const next = new Map(prev)
      results.forEach(r => { if (r.projects) next.set(r.monthKey, r.projects) })
      for (const key of next.keys()) {
        const [ky, km] = key.split('-').map(Number)
        if (Math.abs(ky * 12 + km - centerMonthNum) > 3) next.delete(key)
      }
      return next
    })

    setBookingCache(prev => {
      const next = new Map(prev)
      results.forEach(r => { if (r.bookings) next.set(r.monthKey, r.bookings) })
      for (const key of next.keys()) {
        const [ky, km] = key.split('-').map(Number)
        if (Math.abs(ky * 12 + km - centerMonthNum) > 3) next.delete(key)
      }
      return next
    })

    // Merge in extra properties discovered from implicit projects/bookings
    const extraProps: Property[] = []
    const seenExtra = new Set<string>()
    for (const r of results) {
      if (r.projects) {
        for (const p of r.projects) {
          if (!seenExtra.has(p.propertyId)) {
            seenExtra.add(p.propertyId)
            extraProps.push({
              id: p.propertyId,
              listingName: p.propertyName || '',
              internalName: p.propertyName || '',
              address: p.propertyAddress || '',
              postalCode: '',
              province: '',
              propertyType: 'STR' as const,
              isActive: true,
              createdAt: '',
              updatedAt: '',
              owners: [],
              channels: [],
              licenses: [],
              cleaningManaged: true,
            } satisfies Property)
          }
        }
      }
      if (r.bookings) {
        for (const b of r.bookings) {
          if (!seenExtra.has(b.propertyId)) {
            seenExtra.add(b.propertyId)
            extraProps.push({
              id: b.propertyId,
              listingName: b.propertyName || '',
              internalName: b.propertyName || '',
              address: b.propertyAddress || '',
              postalCode: '',
              province: '',
              propertyType: 'STR' as const,
              isActive: true,
              createdAt: '',
              updatedAt: '',
              owners: [],
              channels: [],
              licenses: [],
              cleaningManaged: true,
            } satisfies Property)
          }
        }
      }
    }
    if (extraProps.length > 0) {
      setProperties(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        const newProps = extraProps.filter(p => !existingIds.has(p.id))
        return newProps.length > 0 ? [...prev, ...newProps] : prev
      })
      setSelectedPropertyIds(prev => {
        const newIds = extraProps.map(p => p.id).filter(id => !prev.includes(id))
        return newIds.length > 0 ? [...prev, ...newIds] : prev
      })
    }

    setFetchingMonths(prev => {
      const next = new Set(prev)
      neededMonths.forEach(m => next.delete(m))
      return next
    })
  }, [zoomLevel])

  const bookingsLoading = fetchingMonths.size > 0

  // Flatten caches
  const allCachedProjects = useMemo(() => {
    const result: CleaningProject[] = []
    for (const monthProjects of projectCache.values()) {
      result.push(...monthProjects)
    }
    return result
  }, [projectCache])

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

  // Initial data fetch (unified schedule endpoint sets cleaner + properties on first call)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!profile?.id) return
      if (initialFetchDone.current) return

      setLoading(true)
      setError(null)

      try {
        // Fetch initial month data — the unified endpoint will set cleaner & properties
        await fetchMonthsForRange(currentDate)

        if (!cleanerRef.current) {
          // Fallback: if schedule endpoint didn't return cleaner (e.g. no data for this month),
          // fetch cleaner record directly
          const cleanerRes = await getCleanerByAuthUserId(profile.id)
          if (cleanerRes.status !== 'success') {
            throw new Error(cleanerRes.message || t('couldNotFindCleanerProfile'))
          }
          const cleanerData = cleanerRes.data
          setCleaner(cleanerData)
          cleanerRef.current = cleanerData

          const assignedProps = (cleanerData.assignedProperties || []).map(ap => ({
            id: ap.propertyId,
            listingName: ap.propertyName || '',
            internalName: ap.propertyName || '',
            address: ap.propertyAddress || '',
            postalCode: '',
            province: '',
            propertyType: 'STR' as const,
            isActive: true,
            createdAt: '',
            updatedAt: '',
            owners: [],
            channels: [],
            licenses: [],
            cleaningManaged: true,
          } satisfies Property))
          setProperties(assignedProps)
          setSelectedPropertyIds(assignedProps.map(p => p.id))
        }

        initialFetchDone.current = true
      } catch (err) {
        const message = err instanceof Error ? err.message : t('failedToLoadCalendarData')
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch months when navigating (after initial load)
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => {
    if (!initialFetchDone.current) return
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current)
    fetchDebounceRef.current = setTimeout(() => {
      fetchMonthsForRange(currentDate)
    }, 150)
    return () => { if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current) }
  }, [currentDate, fetchMonthsForRange])

  // Filter projects: backend already scopes to this cleaner's view (explicit + implicit)
  const filteredProjects = useMemo(() => {
    let result = allCachedProjects.filter(p => p.status !== 'cancelled')
    if (selectedPropertyIds.length > 0) {
      result = result.filter(p => selectedPropertyIds.includes(p.propertyId))
    }
    return result
  }, [allCachedProjects, selectedPropertyIds])

  // Filter bookings to visible date range (backend already scopes to cleaner's view)
  const visibleBookings = useMemo(() => {
    if (allCachedBookings.length === 0) return []
    return allCachedBookings.filter(b => {
      if (!b.checkOutDate) return false
      if (b.bookingStatus === 'cancelled') return false
      const checkIn = toLocalDateStr(b.checkInDate)
      const checkOut = toLocalDateStr(b.checkOutDate)
      return checkIn <= dateRange.end && checkOut >= dateRange.start
    })
  }, [allCachedBookings, dateRange.start, dateRange.end])

  const filteredBookings = useMemo(() => {
    if (selectedPropertyIds.length === 0) return visibleBookings
    return visibleBookings.filter(b => selectedPropertyIds.includes(b.propertyId))
  }, [visibleBookings, selectedPropertyIds])

  // Sort + filter properties
  const filteredProperties = useMemo(() => {
    let result = selectedPropertyIds.length === 0
      ? [...properties]
      : properties.filter(p => selectedPropertyIds.includes(p.id))
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
        for (const p of filteredProjects) {
          countMap.set(p.propertyId, (countMap.get(p.propertyId) || 0) + 1)
        }
        result.sort((a, b) => (countMap.get(b.id) || 0) - (countMap.get(a.id) || 0))
        break
      }
      case 'next-project': {
        const now = toLocalDateStr(new Date().toISOString())
        const nextMap = new Map<string, string>()
        for (const p of filteredProjects) {
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
  }, [properties, selectedPropertyIds, sortOption, filteredProjects])

  // Persist projectId in URL so page reload re-opens the checklist
  const setProjectIdInUrl = useCallback((projectId: string | null) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (projectId) {
      url.searchParams.set('projectId', projectId)
    } else {
      url.searchParams.delete('projectId')
    }
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Click-to-activate (first click activates, second opens modal)
  const openProjectModal = useCallback((project: CleaningProject) => {
    // Don't open modal for implicit (other cleaner's) projects
    if (project.assignmentType === 'implicit') return
    setSelectedProject(project)
    setShowChecklistModal(true)
    setProjectIdInUrl(project.id)
  }, [setProjectIdInUrl])


  const openBookingModal = useCallback((booking: Booking) => {
    setSelectedBooking(booking)
    setShowBookingPreview(true)
  }, [])

  const { activatedItem, handleProjectClick, handleBookingClick, clearActivatedItem } = useActivatedItem({
    onOpenProjectModal: openProjectModal,
    onOpenBookingModal: openBookingModal,
  })

  // Escape key deactivates
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') clearActivatedItem() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clearActivatedItem])

  // Navigation handlers
  const handleZoomChange = useCallback((level: ZoomLevel, isWeek?: boolean) => {
    if (level === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), 1))
    }
    setExpandedDate(null)
    setZoomLevel(level)
    setIsWeekPreset(isWeek ?? false)
  }, [])

  const handleDayClick = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    setCurrentDate(new Date(y, m - 1, d))
    setZoomLevel(1)
    setIsWeekPreset(false)
    setExpandedDate(null)
  }, [])

  const handleMonthDayClick = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    setCurrentDate(new Date(y, m - 1, d))
    setZoomLevel(7)
    setIsWeekPreset(true)
  }, [])

  const handlePrevWeek = useCallback(() => {
    setExpandedDate(null)
    setCurrentDate(prev => {
      if (zoomLevel === 'month') return new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      const d = new Date(prev)
      if (isWeekPreset && zoomLevel === 7) {
        const daysToSaturday = (d.getDay() + 1) % 7
        d.setDate(d.getDate() - daysToSaturday - 7)
      } else {
        d.setDate(d.getDate() - (zoomLevel as number))
      }
      return d
    })
    setNavigationEpoch(e => e + 1)
  }, [zoomLevel, isWeekPreset])

  const handleNextWeek = useCallback(() => {
    setExpandedDate(null)
    setCurrentDate(prev => {
      if (zoomLevel === 'month') return new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      const d = new Date(prev)
      if (isWeekPreset && zoomLevel === 7) {
        const daysToSaturday = (d.getDay() + 1) % 7
        d.setDate(d.getDate() - daysToSaturday + 7)
      } else {
        d.setDate(d.getDate() + (zoomLevel as number))
      }
      return d
    })
    setNavigationEpoch(e => e + 1)
  }, [zoomLevel, isWeekPreset])

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
    setSelectedDay(new Date())
    setExpandedDate(null)
    setNavigationEpoch(e => e + 1)
  }, [isWeekPreset, zoomLevel])

  // Calendar style toggle handler
  const handleCalendarStyleChange = useCallback((style: 'timeline' | 'simple') => {
    setCalendarMode(style)
    if (style === 'simple') {
      // Clamp zoom to week or month only
      if (zoomLevel !== 'month' && zoomLevel !== 7) {
        setZoomLevel(7)
        setIsWeekPreset(true)
      }
    }
  }, [zoomLevel])

  // Simple view zoom presets (week + month only)
  const simpleZoomPresets = useMemo(() => [
    { label: t('week'), value: 7 as ZoomLevel, isWeek: true },
    { label: t('monthLabel'), value: 'month' as ZoomLevel },
  ], [])

  // Simple view day click handler
  const handleSimpleDayClick = useCallback((dateStr: string) => {
    setSimpleSelectedDay(prev => prev === dateStr ? null : dateStr)
  }, [])

  // Projects for the selected simple-view day
  const simpleSelectedDayProjects = useMemo(() => {
    if (!simpleSelectedDay) return []
    return filteredProjects
      .filter(p => {
        const dateKey = p.projectDate.split('T')[0]
        return dateKey === simpleSelectedDay && p.assignmentType !== 'implicit'
      })
      .sort((a, b) =>
        (a.projectStartTime || '00:00:00').localeCompare(b.projectStartTime || '00:00:00')
      )
  }, [simpleSelectedDay, filteredProjects])

  // Project action handlers
  const handleAccept = async (projectId: string) => {
    try {
      const res = await acceptProject(projectId)
      if (res.status === 'success') {
        updateProjectInCache(projectId, res.data)
        if (selectedProject?.id === projectId) setSelectedProject(res.data)
        showNotification(t('taskAccepted'), 'success')
      } else {
        showNotification(res.message || t('failedToAcceptTask'), 'error')
      }
    } catch (err) {
      console.error('Error accepting task:', err)
      showNotification(t('errorAcceptingTask'), 'error')
    }
  }

  const handleDecline = async (projectId: string) => {
    try {
      const res = await declineProject(projectId)
      if (res.status === 'success') {
        removeProjectFromCache(projectId)
        showNotification(t('taskDeclined'), 'info')
      } else {
        showNotification(res.message || t('failedToDeclineTask'), 'error')
      }
    } catch (err) {
      console.error('Error declining task:', err)
      showNotification(t('errorDecliningTask'), 'error')
    }
  }

  const handleStart = async (projectId: string) => {
    try {
      const res = await startProject(projectId)
      if (res.status === 'success') {
        updateProjectInCache(projectId, res.data)
        if (selectedProject?.id === projectId) {
          setSelectedProject(res.data)
        } else {
          setSelectedProject(res.data)
          setShowChecklistModal(true)
          setProjectIdInUrl(res.data.id)
        }
        showNotification(t('taskStarted'), 'success')
      } else {
        showNotification(res.message || t('failedToStartTask'), 'error')
      }
    } catch (err) {
      console.error('Error starting task:', err)
      showNotification(t('errorStartingTask'), 'error')
    }
  }

  const handleComplete = async (projectId: string) => {
    try {
      const res = await completeProject(projectId)
      if (res.status === 'success') {
        updateProjectInCache(projectId, res.data)
        showNotification(t('taskCompleted'), 'success')
      } else {
        showNotification(res.message || t('failedToCompleteTask'), 'error')
      }
    } catch (err) {
      console.error('Error completing task:', err)
      showNotification(t('errorCompletingTask'), 'error')
    }
  }

  const handleProjectComplete = (completedProject: CleaningProject) => {
    updateProjectInCache(completedProject.id, completedProject)
  }

  // Cache helpers
  const updateProjectInCache = (projectId: string, updated: CleaningProject) => {
    setProjectCache(prev => {
      const next = new Map(prev)
      for (const [key, projects] of next) {
        const idx = projects.findIndex(p => p.id === projectId)
        if (idx !== -1) {
          const arr = [...projects]
          arr[idx] = updated
          next.set(key, arr)
        }
      }
      return next
    })
  }

  const removeProjectFromCache = (projectId: string) => {
    setProjectCache(prev => {
      const next = new Map(prev)
      for (const [key, projects] of next) {
        const filtered = projects.filter(p => p.id !== projectId)
        if (filtered.length !== projects.length) next.set(key, filtered)
      }
      return next
    })
  }

  // Time change handlers
  const handleRequestTimeChange = (project: CleaningProject) => {
    setSelectedProjectForTimeChange(project)
    setShowTimeChangeModal(true)
  }

  const handleViewPendingTimeChange = (project: CleaningProject) => {
    setViewPendingProject(project)
    setShowViewPendingTimeChangeModal(true)
  }

  const handleTimeChangeSubmitted = () => {
    if (selectedProjectForTimeChange) {
      setPendingTimeChangeProjectIds(prev => new Set(prev).add(selectedProjectForTimeChange.id))
    }
  }

  // Fetch pending time change requests for visible explicit projects
  useEffect(() => {
    if (!cleaner?.id || filteredProjects.length === 0) return
    const activeProjects = filteredProjects.filter(p =>
      p.assignmentType !== 'implicit' && ['assigned', 'confirmed', 'in_progress'].includes(p.status)
    )
    if (activeProjects.length === 0) return

    Promise.all(
      activeProjects.map(p => getPendingTimeChangeRequest(p.id).catch(() => null))
    ).then(results => {
      const tcIds = new Set<string>()
      results.forEach((res, idx) => {
        if (res?.status === 'success' && res.data) {
          tcIds.add(activeProjects[idx].id)
        }
      })
      setPendingTimeChangeProjectIds(tcIds)
    })
  }, [cleaner?.id, filteredProjects])

  // Fetch issue counts and supply list counts per explicit project only
  useEffect(() => {
    const explicitProjects = filteredProjects.filter(p => p.assignmentType !== 'implicit')
    if (explicitProjects.length === 0) return
    const uniqueProjectIds = [...new Set(explicitProjects.map(p => p.id))]

    // Issue counts
    Promise.all(
      uniqueProjectIds.map(id => getIssueCounts(id).catch(() => null))
    ).then(results => {
      const countsMap: Record<string, number> = {}
      results.forEach((res, idx) => {
        if (res?.status === 'success') {
          countsMap[uniqueProjectIds[idx]] = res.data.open + res.data.acknowledged
        }
      })
      setIssueCountsMap(countsMap)
    })

    // Supply list counts
    Promise.all(
      uniqueProjectIds.map(id => getSupplyListsByProject(id).catch(() => null))
    ).then(results => {
      const supplyMap: Record<string, number> = {}
      results.forEach((res, idx) => {
        if (res?.status === 'success') {
          supplyMap[uniqueProjectIds[idx]] = res.data.filter(l => l.status !== 'fulfilled').length
        }
      })
      setSupplyListCountsMap(supplyMap)
    })
  }, [filteredProjects])

  // Mobile day view helpers
  const weekDays = useMemo(() => {
    if (zoomLevel !== 1 || !isMobile) return []
    const start = new Date(currentDate)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(new Date(start))
      start.setDate(start.getDate() + 1)
    }
    return days
  }, [currentDate, zoomLevel, isMobile])

  const projectsByDate = useMemo(() => {
    const grouped: Record<string, CleaningProject[]> = {}
    filteredProjects.forEach(project => {
      const dateKey = project.projectDate.split('T')[0]
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(project)
    })
    Object.values(grouped).forEach(dayProjects => {
      dayProjects.sort((a, b) => {
        const timeA = a.projectStartTime || '00:00:00'
        const timeB = b.projectStartTime || '00:00:00'
        return timeA.localeCompare(timeB)
      })
    })
    return grouped
  }, [filteredProjects])

  const selectedDayKey = formatLocalDate(selectedDay)
  const selectedDayProjects = projectsByDate[selectedDayKey] || []

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString()
  const isSelectedDayFn = (date: Date) => date.toDateString() === selectedDay.toDateString()

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
          <p className="text-sm text-gray-500 font-medium">{t('loadingSchedule')}</p>
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
            <h3 className="font-semibold text-red-800">{t('errorLoadingSchedule')}</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Mobile day view (zoom=1 on mobile)
  const renderMobileDayView = () => (
    <div>
      {/* Day strip selector */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map(day => {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const dateKey = formatLocalDate(day)
          const taskCount = (projectsByDate[dateKey] || []).length
          const hasTasks = taskCount > 0
          const selected = isSelectedDayFn(day)
          const today = isToday(day)

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDay(new Date(day))}
              className={`
                min-h-[68px] px-1 py-2.5 text-center border-r border-gray-100 last:border-r-0
                cursor-pointer transition-colors active:scale-95
                ${selected
                  ? 'bg-amber-50'
                  : today
                    ? 'bg-purple-50/60'
                    : 'bg-white'
                }
              `}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${
                selected ? 'text-amber-700' : today ? 'text-purple-600' : 'text-gray-400'
              }`}>
                {dayNames[day.getDay()]}
              </p>
              <p className={`
                text-base font-bold mt-1
                ${selected
                  ? 'w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto shadow-sm'
                  : today
                    ? 'w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center mx-auto shadow-sm'
                    : 'text-gray-900'
                }
              `}>
                {day.getDate()}
              </p>
              {hasTasks && (
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    selected ? 'bg-amber-400' : 'bg-purple-400'
                  }`} />
                  {taskCount > 1 && (
                    <span className={`text-[9px] font-bold ${
                      selected ? 'text-amber-500' : 'text-purple-400'
                    }`}>{taskCount}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Project list for selected day */}
      <div className="p-3 sm:p-4">
        {/* Selected day label */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDayKey}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {selectedDayProjects.length > 0 ? (
              selectedDayProjects.map(project => {
                const implicit = project.assignmentType === 'implicit'
                return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isImplicit={implicit}
                  openIssueCount={implicit ? 0 : (issueCountsMap[project.id] || 0)}
                  hasPendingTimeChange={implicit ? false : pendingTimeChangeProjectIds.has(project.id)}
                  onAccept={implicit ? undefined : handleAccept}
                  onDecline={implicit ? undefined : handleDecline}
                  onStart={implicit ? undefined : handleStart}
                  onComplete={implicit ? undefined : handleComplete}
                  onViewChecklist={implicit ? undefined : (p) => { setSelectedProject(p); setShowChecklistModal(true); setProjectIdInUrl(p.id) }}
                  onRequestTimeChange={implicit ? undefined : handleRequestTimeChange}
                  onViewPendingTimeChange={implicit ? undefined : handleViewPendingTimeChange}
                />
                )
              })
            ) : (
              <div className="py-10 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto">
                  <CalendarDaysIcon className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400 mt-3">{t('noProjectsForDay')}</p>
                <p className="text-xs text-gray-300 mt-1">{t('tapAnotherDay')}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Calendar Container */}
      <div className="bg-white flex flex-col" style={{ maxHeight: isMobile ? 'calc(100vh - 4rem)' : 'calc(100vh - 5rem)' }}>
        {/* Header */}
        <CalendarHeader
          viewMode="property"
          onViewModeChange={() => {}}
          currentDate={currentDate}
          dateRange={dateRange}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
          showBookings={calendarMode === 'timeline' ? showBookings : undefined}
          onToggleBookings={calendarMode === 'timeline' ? (enabled) => setShowBookings(enabled) : undefined}
          bookingsLoading={calendarMode === 'timeline' ? bookingsLoading : undefined}
          properties={properties}
          selectedPropertyIds={selectedPropertyIds}
          onPropertyFilterChange={setSelectedPropertyIds}
          zoomLevel={zoomLevel}
          onZoomChange={handleZoomChange}
          isWeekPreset={isWeekPreset}
          sortOption={calendarMode === 'timeline' ? sortOption : undefined}
          onSortChange={calendarMode === 'timeline' ? setSortOption : undefined}
          hideViewToggle
          calendarStyle={calendarMode}
          onCalendarStyleChange={handleCalendarStyleChange}
          allowedZoomPresets={calendarMode === 'simple' ? simpleZoomPresets : undefined}
        />

        {/* Scroll container */}
        <div ref={scrollContainerRef} className="overflow-y-auto flex-1 min-h-0 relative" onClick={clearActivatedItem}>
          {/* Sticky header portal */}
          <div className="sticky top-0 z-20 h-0">
            <div ref={stickyPortalRef} />
          </div>

          {/* Calendar body */}
          {calendarMode === 'simple' ? (
            <div>
              <SimpleCalendarView
                projects={filteredProjects}
                currentDate={currentDate}
                zoomLevel={zoomLevel === 'month' ? 'month' : 7}
                selectedDay={simpleSelectedDay}
                onDayClick={handleSimpleDayClick}
                onProjectClick={openProjectModal}
                issueCountsMap={issueCountsMap}
              />

              {/* Selected day detail section */}
              {simpleSelectedDay && (
                <div className="p-3 sm:p-4 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                    {(() => {
                      const [y, m, d] = simpleSelectedDay.split('-').map(Number)
                      const date = new Date(y, m - 1, d)
                      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                    })()}
                  </p>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={simpleSelectedDay}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      {simpleSelectedDayProjects.length > 0 ? (
                        simpleSelectedDayProjects.map(project => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            isImplicit={false}
                            openIssueCount={issueCountsMap[project.id] || 0}
                            hasPendingTimeChange={pendingTimeChangeProjectIds.has(project.id)}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                            onStart={handleStart}
                            onComplete={handleComplete}
                            onViewChecklist={(p) => { setSelectedProject(p); setShowChecklistModal(true); setProjectIdInUrl(p.id) }}
                            onRequestTimeChange={handleRequestTimeChange}
                            onViewPendingTimeChange={handleViewPendingTimeChange}
                          />
                        ))
                      ) : (
                        <div className="py-10 text-center">
                          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto">
                            <CalendarDaysIcon className="w-7 h-7 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-400 mt-3">{t('noProjectsForDay')}</p>
                          <p className="text-xs text-gray-300 mt-1">{t('tapAnotherDay')}</p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
            </div>
          ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={zoomLevel === 'month' ? 'month' : zoomLevel === 1 && isMobile ? 'mobile-day' : 'grid'}
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
              ) : zoomLevel === 1 && isMobile ? (
                renderMobileDayView()
              ) : (
                <PropertyRowView
                  projects={filteredProjects}
                  properties={filteredProperties}
                  dateRange={dateRange}
                  onProjectClick={handleProjectClick}
                  onBookingClick={handleBookingClick}
                  issueCountsMap={issueCountsMap}
                  supplyListCountsMap={supplyListCountsMap}
                  bookings={showBookings ? filteredBookings : []}
                  zoomLevel={zoomLevel}
                  onRequestDateShift={handleRequestDateShift}
                  stickyPortal={stickyPortalRef}
                  expandedDate={expandedDate}
                  onExpandDate={setExpandedDate}
                  onDayClick={handleDayClick}
                  scrollContainer={scrollContainerRef}
                  navigationEpoch={navigationEpoch}
                  activatedItem={activatedItem}
                  onOpenProjectModal={openProjectModal}
                  onOpenBookingModal={openBookingModal}
                  disableDnd
                />
              )}
            </motion.div>
          </AnimatePresence>
          )}
        </div>
      </div>

      {/* Checklist Modal */}
      {selectedProject && (
        <ChecklistModal
          isOpen={showChecklistModal}
          onClose={() => {
            setShowChecklistModal(false)
            setSelectedProject(null)
            setProjectIdInUrl(null)
          }}
          project={selectedProject}
          onProjectComplete={handleProjectComplete}
          onProjectUpdated={(updatedProject) => {
            updateProjectInCache(updatedProject.id, updatedProject)
            setSelectedProject(updatedProject)
          }}
          onRequestTimeChange={() => {
            if (selectedProject) handleRequestTimeChange(selectedProject)
          }}
          onAccept={handleAccept}
          onDecline={async (projectId: string) => {
            await handleDecline(projectId)
            setShowChecklistModal(false)
            setSelectedProject(null)
            setProjectIdInUrl(null)
          }}
          onStart={handleStart}
        />
      )}

      {/* Booking Preview Modal (read-only, no financials) */}
      {selectedBooking && (
        <CleanerBookingPreviewModal
          isOpen={showBookingPreview}
          onClose={() => {
            setShowBookingPreview(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
        />
      )}

      {/* Request Time Change Modal */}
      {selectedProjectForTimeChange && cleaner && (
        <RequestTimeChangeModal
          isOpen={showTimeChangeModal}
          onClose={() => {
            setShowTimeChangeModal(false)
            setSelectedProjectForTimeChange(null)
          }}
          project={selectedProjectForTimeChange}
          cleanerId={cleaner.id}
          onSubmitted={handleTimeChangeSubmitted}
        />
      )}

      {/* View Pending Time Change Modal */}
      {viewPendingProject && (
        <ViewPendingTimeChangeModal
          isOpen={showViewPendingTimeChangeModal}
          onClose={() => {
            setShowViewPendingTimeChangeModal(false)
            setViewPendingProject(null)
          }}
          project={viewPendingProject}
        />
      )}
    </motion.div>
  )
}
