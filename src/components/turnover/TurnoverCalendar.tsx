'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getCleaningProjects, getCleaningProjectStats } from '@/services/cleaningProjectService'
import { getCleaners } from '@/services/cleanerService'
import { getProperties } from '@/services/propertyService'
import { getOpenIssues } from '@/services/projectIssueService'
import { getPendingSupplyLists } from '@/services/supplyListService'
import { getBookings, getMonthKey, getMonthBounds } from '@/services/bookingService'
import type { CleaningProject, CleaningProjectStats } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import CalendarHeader from './CalendarHeader'
import PropertyRowView from './PropertyRowView'
import CleanerRowView from './CleanerRowView'
import ProjectDetailModal from './ProjectDetailModal'
import CreateProjectModal from './create/CreateProjectModal'
import CreateChecklistModal from '@/components/checklist/create/CreateChecklistModal'
import DuplicateChecklistModal from '@/components/checklist/duplicate/DuplicateChecklistModal'
import PreviewBookingModal from '@/components/booking/preview/previewBookingModal'
import UpdateBookingModal from '@/components/booking/update/updateBookingModal'

export type ViewMode = 'property' | 'cleaner'

interface TurnoverCalendarProps {
  initialProperties?: Property[]
  initialCleaners?: Cleaner[]
}

export default function TurnoverCalendar({
  initialProperties,
  initialCleaners,
}: TurnoverCalendarProps) {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('property')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState<7 | 14>(7)

  // Static data state (not date-range dependent)
  const [properties, setProperties] = useState<Property[]>(initialProperties || [])
  const [cleaners, setCleaners] = useState<Cleaner[]>(initialCleaners || [])
  const [stats, setStats] = useState<CleaningProjectStats | null>(null)
  const [issueCountsMap, setIssueCountsMap] = useState<Record<string, number>>({})
  const [supplyListCountsMap, setSupplyListCountsMap] = useState<Record<string, number>>({})

  // Month-based cache for bookings
  const [bookingCache, setBookingCache] = useState<Map<string, Booking[]>>(new Map())
  const bookingCacheRef = useRef<Map<string, Booking[]>>(new Map())

  // Month-based cache for projects
  const [projectCache, setProjectCache] = useState<Map<string, CleaningProject[]>>(new Map())
  const projectCacheRef = useRef<Map<string, CleaningProject[]>>(new Map())

  // Shared fetch tracking
  const [fetchingMonths, setFetchingMonths] = useState<Set<string>>(new Set())
  const fetchingMonthsRef = useRef<Set<string>>(new Set())

  // Bookings overlay state
  const [showBookings, setShowBookings] = useState(true)

  // Property filter state
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])

  // Cleaner filter state
  const [selectedCleanerIds, setSelectedCleanerIds] = useState<string[]>([])

  // Loading state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialFetchDone = useRef(false)

  // Modal state
  const [selectedProject, setSelectedProject] = useState<CleaningProject | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateChecklistModal, setShowCreateChecklistModal] = useState(false)
  const [showDuplicateChecklistModal, setShowDuplicateChecklistModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingPreview, setShowBookingPreview] = useState(false)
  const [showBookingUpdate, setShowBookingUpdate] = useState(false)

  // Keep refs in sync with state
  useEffect(() => {
    bookingCacheRef.current = bookingCache
  }, [bookingCache])

  useEffect(() => {
    projectCacheRef.current = projectCache
  }, [projectCache])

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
    bufferEnd.setDate(bufferEnd.getDate() + zoomLevel + 17)

    const months: string[] = []
    const cursor = new Date(bufferStart.getFullYear(), bufferStart.getMonth(), 1)
    while (cursor <= bufferEnd) {
      months.push(getMonthKey(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }

    // Filter to uncached, non-fetching months
    const currentBookingCache = bookingCacheRef.current
    const currentProjectCache = projectCacheRef.current
    const currentFetching = fetchingMonthsRef.current

    const neededMonths = months.filter(m =>
      (!currentBookingCache.has(m) || !currentProjectCache.has(m)) &&
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
        const [bookingsRes, projectsRes] = await Promise.all([
          currentBookingCache.has(monthKey)
            ? Promise.resolve(null)
            : getBookings({ userId, startDate, endDate }),
          currentProjectCache.has(monthKey)
            ? Promise.resolve(null)
            : getCleaningProjects({ userId, startDate, endDate }),
        ])

        return {
          monthKey,
          bookings: bookingsRes?.status === 'success' ? bookingsRes.data : null,
          projects: projectsRes?.status === 'success' ? projectsRes.data : null,
        }
      } catch (err) {
        console.error(`Error fetching month ${monthKey}:`, err)
        return { monthKey, bookings: null, projects: null }
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

  // Initial data fetch (properties, cleaners, stats, issues, supply lists + first month cache)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!profile?.id) return
      if (initialFetchDone.current) return

      setLoading(true)
      setError(null)

      try {
        // Fetch static data in parallel
        const [propertiesRes, cleanersRes, statsRes, issuesRes, supplyRes] = await Promise.all([
          initialProperties ? Promise.resolve({ status: 'success' as const, data: initialProperties }) : getProperties(profile.id),
          initialCleaners ? Promise.resolve({ status: 'success' as const, data: initialCleaners }) : getCleaners(profile.id),
          getCleaningProjectStats(profile.id, dateRange.start, dateRange.end),
          getOpenIssues(profile.id),
          getPendingSupplyLists(profile.id),
        ])

        if (propertiesRes.status === 'success') setProperties(propertiesRes.data)
        if (cleanersRes.status === 'success') setCleaners(cleanersRes.data)
        if (statsRes.status === 'success') setStats(statsRes.data)

        if (issuesRes.status === 'success') {
          const countsMap: Record<string, number> = {}
          issuesRes.data.forEach(issue => {
            countsMap[issue.projectId] = (countsMap[issue.projectId] || 0) + 1
          })
          setIssueCountsMap(countsMap)
        }
        if (supplyRes.status === 'success') {
          const countsMap: Record<string, number> = {}
          supplyRes.data.forEach(list => {
            countsMap[list.projectId] = (countsMap[list.projectId] || 0) + 1
          })
          setSupplyListCountsMap(countsMap)
        }

        // Trigger month-based cache fetch for bookings + projects
        await fetchMonthsForRange(currentDate, profile.id)

        initialFetchDone.current = true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load calendar data'
        setError(message)
        showNotification(message, 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch months when navigating (after initial load)
  useEffect(() => {
    if (!profile?.id || !initialFetchDone.current) return
    fetchMonthsForRange(currentDate, profile.id)
  }, [currentDate, profile?.id, fetchMonthsForRange])

  // Refresh stats when dateRange changes
  useEffect(() => {
    if (!profile?.id || !initialFetchDone.current) return
    getCleaningProjectStats(profile.id, dateRange.start, dateRange.end)
      .then(res => {
        if (res.status === 'success') setStats(res.data)
      })
  }, [dateRange.start, dateRange.end, profile?.id])

  // Refresh issue counts (call after issues are modified)
  const refreshIssueCounts = async () => {
    if (!profile?.id) return
    try {
      const issuesRes = await getOpenIssues(profile.id)
      if (issuesRes.status === 'success') {
        const countsMap: Record<string, number> = {}
        issuesRes.data.forEach(issue => {
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
    if (!profile?.id) return
    try {
      const supplyRes = await getPendingSupplyLists(profile.id)
      if (supplyRes.status === 'success') {
        const countsMap: Record<string, number> = {}
        supplyRes.data.forEach(list => {
          countsMap[list.projectId] = (countsMap[list.projectId] || 0) + 1
        })
        setSupplyListCountsMap(countsMap)
      }
    } catch (err) {
      console.error('Error refreshing supply list counts:', err)
    }
  }

  // Handle bookings toggle — bookings are always in cache, just toggle visibility
  const handleToggleBookings = (enabled: boolean) => {
    setShowBookings(enabled)
  }

  // Filter bookings to those visible in the current date range
  const visibleBookings = useMemo(() => {
    if (!showBookings || allCachedBookings.length === 0) return []
    return allCachedBookings.filter(b =>
      b.checkOutDate &&
      b.checkInDate <= dateRange.end &&
      b.checkOutDate >= dateRange.start
    )
  }, [showBookings, allCachedBookings, dateRange.start, dateRange.end])

  // Filter projects and bookings by selected properties and cleaners
  const filteredProjects = useMemo(() => {
    let result = allCachedProjects
    if (selectedPropertyIds.length > 0) {
      result = result.filter(p => selectedPropertyIds.includes(p.propertyId))
    }
    if (selectedCleanerIds.length > 0) {
      result = result.filter(p => p.cleanerId && selectedCleanerIds.includes(p.cleanerId))
    }
    return result
  }, [allCachedProjects, selectedPropertyIds, selectedCleanerIds])

  const filteredProperties = useMemo(() => {
    if (selectedPropertyIds.length === 0) return properties
    return properties.filter(p => selectedPropertyIds.includes(p.id))
  }, [properties, selectedPropertyIds])

  const filteredCleaners = useMemo(() => {
    if (selectedCleanerIds.length === 0) return cleaners
    return cleaners.filter(c => selectedCleanerIds.includes(c.id))
  }, [cleaners, selectedCleanerIds])

  const filteredBookings = useMemo(() => {
    if (selectedPropertyIds.length === 0) return visibleBookings
    return visibleBookings.filter(b => selectedPropertyIds.includes(b.propertyId))
  }, [visibleBookings, selectedPropertyIds])

  // Handle project click
  const handleProjectClick = (project: CleaningProject) => {
    setSelectedProject(project)
    setShowDetailModal(true)
  }

  // Handle booking click
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowBookingPreview(true)
  }

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
    const projDate = new Date(newProject.scheduledDate + 'T00:00:00')
    const monthKey = getMonthKey(projDate)
    setProjectCache(prev => {
      const next = new Map(prev)
      const existing = next.get(monthKey) || []
      next.set(monthKey, [...existing, newProject])
      return next
    })
    setShowCreateModal(false)
    // Refresh stats
    if (profile?.id) {
      getCleaningProjectStats(profile.id, dateRange.start, dateRange.end)
        .then(res => {
          if (res.status === 'success') setStats(res.data)
        })
    }
  }

  // Ref for trackpad horizontal scroll
  const calendarContainerRef = useRef<HTMLDivElement>(null)

  // Arrow navigation handlers (snap to Saturday, shift by zoomLevel)
  const handlePrevWeek = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      const daysToSaturday = (d.getDay() + 1) % 7
      d.setDate(d.getDate() - daysToSaturday) // snap to Saturday
      d.setDate(d.getDate() - zoomLevel)       // then shift back
      return d
    })
  }, [zoomLevel])

  const handleNextWeek = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      const daysToSaturday = (d.getDay() + 1) % 7
      d.setDate(d.getDate() - daysToSaturday) // snap to Saturday
      d.setDate(d.getDate() + zoomLevel)       // then shift forward
      return d
    })
  }, [zoomLevel])

  // Trackpad scroll handlers (shift by 1 day, no snapping)
  const handleScrollForward = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 1)
      return d
    })
  }, [])

  const handleScrollBackward = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 1)
      return d
    })
  }, [])

  // Trackpad/mouse horizontal scroll to navigate calendar day-by-day
  useEffect(() => {
    const el = calendarContainerRef.current
    if (!el) return

    let accumulated = 0
    let resetTimer: ReturnType<typeof setTimeout>
    let cooldown = false

    const handleWheel = (e: WheelEvent) => {
      // Determine horizontal delta:
      // - Trackpads send deltaX directly
      // - On Windows, shift+scroll sends deltaY as horizontal intent
      let horizontalDelta = e.deltaX
      if (e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        horizontalDelta = e.deltaY
      }

      const absH = Math.abs(horizontalDelta)
      const absV = Math.abs(e.shiftKey ? 0 : e.deltaY)

      // Only handle predominantly horizontal gestures
      if (absH < 2 || absH < absV) return

      e.preventDefault()
      e.stopPropagation()

      accumulated += horizontalDelta

      // Reset accumulator after inactivity
      clearTimeout(resetTimer)
      resetTimer = setTimeout(() => { accumulated = 0 }, 200)

      // Only fire one day-shift per cooldown period (150ms) — max ~6/sec
      const threshold = 40
      if (!cooldown && Math.abs(accumulated) >= threshold) {
        if (accumulated > 0) {
          handleScrollForward()
        } else {
          handleScrollBackward()
        }
        accumulated = 0
        cooldown = true
        setTimeout(() => { cooldown = false }, 150)
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      clearTimeout(resetTimer)
    }
  }, [handleScrollForward, handleScrollBackward])

  // Mouse drag / touch drag to navigate calendar day-by-day
  useEffect(() => {
    const el = calendarContainerRef.current
    if (!el) return

    let isDragging = false
    let startX = 0
    let dragAccumulated = 0

    const handlePointerDown = (e: PointerEvent) => {
      // Only left mouse button, ignore clicks on interactive elements
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest('button, a, [role="button"], .fc-event')) return

      isDragging = true
      startX = e.clientX
      dragAccumulated = 0
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      e.preventDefault()

      const deltaX = startX - e.clientX  // inverted: drag left = move forward
      startX = e.clientX
      dragAccumulated += deltaX

      const threshold = 60  // pixels per day-shift
      while (dragAccumulated >= threshold) {
        handleScrollForward()
        dragAccumulated -= threshold
      }
      while (dragAccumulated <= -threshold) {
        handleScrollBackward()
        dragAccumulated += threshold
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return
      isDragging = false
      el.releasePointerCapture(e.pointerId)
      el.style.cursor = ''
      el.style.userSelect = ''
    }

    el.addEventListener('pointerdown', handlePointerDown)
    el.addEventListener('pointermove', handlePointerMove)
    el.addEventListener('pointerup', handlePointerUp)
    el.addEventListener('pointercancel', handlePointerUp)

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown)
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', handlePointerUp)
      el.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [handleScrollForward, handleScrollBackward])

  const handleToday = () => {
    setCurrentDate(new Date())
  }

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
      className="space-y-5"
    >
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard label="Pending" value={stats.pending} color="yellow" />
          <StatCard label="Assigned" value={stats.assigned} color="blue" />
          <StatCard label="Confirmed" value={stats.confirmed} color="indigo" />
          <StatCard label="In Progress" value={stats.inProgress} color="purple" />
          <StatCard label="Completed" value={stats.completed} color="green" />
          <StatCard label="Unassigned" value={stats.unassigned} color="amber" highlight />
          <StatCard
            label="Awaiting"
            value={allCachedProjects.filter(p => p.status === 'assigned' && p.cleanerAccepted === null).length}
            color="amber"
            highlight
          />
        </div>
      )}

      {/* Calendar Container */}
      <div ref={calendarContainerRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-grab">
        {/* Header with navigation and view toggle */}
        <CalendarHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentDate={currentDate}
          dateRange={dateRange}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
          onCreateProject={() => setShowCreateModal(true)}
          onCreateChecklist={() => setShowCreateChecklistModal(true)}
          onDuplicateChecklist={() => setShowDuplicateChecklistModal(true)}
          showBookings={showBookings}
          onToggleBookings={handleToggleBookings}
          bookingsLoading={bookingsLoading}
          properties={properties}
          selectedPropertyIds={selectedPropertyIds}
          onPropertyFilterChange={setSelectedPropertyIds}
          cleaners={cleaners}
          selectedCleanerIds={selectedCleanerIds}
          onCleanerFilterChange={setSelectedCleanerIds}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
        />

        {/* Calendar View */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'property' ? (
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
              />
            ) : (
              <CleanerRowView
                projects={filteredProjects}
                cleaners={filteredCleaners}
                dateRange={dateRange}
                onProjectClick={handleProjectClick}
                issueCountsMap={issueCountsMap}
                supplyListCountsMap={supplyListCountsMap}
                zoomLevel={zoomLevel}
              />
            )}
          </motion.div>
        </AnimatePresence>
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
        />
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleProjectCreate}
        properties={properties}
        cleaners={cleaners}
        initialDate={dateRange.start}
      />

      {/* Create Checklist Modal */}
      <CreateChecklistModal
        isOpen={showCreateChecklistModal}
        onClose={() => setShowCreateChecklistModal(false)}
        onAdd={() => {
          setShowCreateChecklistModal(false)
          showNotification('Checklist created successfully', 'success')
        }}
        properties={properties}
      />

      {/* Duplicate Checklist Modal */}
      <DuplicateChecklistModal
        isOpen={showDuplicateChecklistModal}
        onClose={() => setShowDuplicateChecklistModal(false)}
        onDuplicate={() => {
          setShowDuplicateChecklistModal(false)
          showNotification('Checklist duplicated successfully', 'success')
        }}
        properties={properties}
      />

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
        />
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
            // Update booking in the cache
            setBookingCache(prev => {
              const next = new Map(prev)
              for (const [key, bookings] of next) {
                const idx = bookings.findIndex(b => b.id === updatedBooking.id)
                if (idx !== -1) {
                  const updated = [...bookings]
                  updated[idx] = updatedBooking
                  next.set(key, updated)
                }
              }
              return next
            })
            setShowBookingUpdate(false)
            setSelectedBooking(null)
          }}
        />
      )}
    </motion.div>
  )
}

// Stat Card Component
function StatCard({
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
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  }

  const classes = colorClasses[color] || colorClasses.blue

  return (
    <div
      className={`
        ${classes.bg} ${classes.border} border rounded-xl p-3
        ${highlight && value > 0 ? 'ring-2 ring-amber-300 ring-offset-1' : ''}
      `}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold ${classes.text} mt-1`}>{value}</p>
    </div>
  )
}
