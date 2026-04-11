'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  HomeModernIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { getClientPortalCleaningProjects, getClientPortalProjectById } from '@/services/clientPortalService'
import type {
  ClientPortalCleaningProject,
  ClientPortalProjectDetail,
  ClientPortalProjectChecklistItem,
} from '@/services/types/clientPortal'

/* ═══ Config ═══ */

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:     { label: 'Pending',     bg: 'bg-gray-100',   text: 'text-gray-700' },
  assigned:    { label: 'Assigned',    bg: 'bg-blue-100',   text: 'text-blue-700' },
  confirmed:   { label: 'Confirmed',   bg: 'bg-indigo-100', text: 'text-indigo-700' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-100',  text: 'text-amber-700' },
  completed:   { label: 'Completed',   bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-red-100',    text: 'text-red-700' },
}

const ISSUE_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  damage:       { label: 'Damage',       icon: ExclamationTriangleIcon, color: 'bg-red-100 text-red-600' },
  missing_item: { label: 'Missing Item', icon: QuestionMarkCircleIcon,  color: 'bg-purple-100 text-purple-600' },
  maintenance:  { label: 'Maintenance',  icon: WrenchScrewdriverIcon,   color: 'bg-amber-100 text-amber-600' },
  other:        { label: 'Other',        icon: DocumentTextIcon,        color: 'bg-gray-100 text-gray-600' },
}

/* ═══ Helpers ═══ */

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatAge(dateStr: string): string {
  const created = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

function groupItemsByRoom(items: ClientPortalProjectChecklistItem[]): Record<string, ClientPortalProjectChecklistItem[]> {
  const groups: Record<string, ClientPortalProjectChecklistItem[]> = {}
  for (const item of items) {
    const room = item.roomName || 'General'
    if (!groups[room]) groups[room] = []
    groups[room].push(item)
  }
  // Sort items within each room by sortOrder
  for (const room of Object.keys(groups)) {
    groups[room].sort((a, b) => a.sortOrder - b.sortOrder)
  }
  return groups
}

/* ═══ Photo entry for lightbox ═══ */

interface PhotoEntry {
  url: string
  label: string
  roomName?: string
  timestamp?: string | null
}

/* ═══ Main Page ═══ */

export default function ClientProjectsPage() {
  const { t } = useTranslation('clientPortal')
  const [projects, setProjects] = useState<ClientPortalCleaningProject[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ClientPortalProjectDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [photoViewer, setPhotoViewer] = useState<{ photos: PhotoEntry[]; index: number } | null>(null)

  const detailCache = useRef<Map<string, ClientPortalProjectDetail>>(new Map())

  // Load all projects
  useEffect(() => {
    async function load() {
      try {
        const res = await getClientPortalCleaningProjects()
        if (res.status === 'success') {
          setProjects(res.data)
        }
      } catch (err) {
        console.error('Failed to load projects:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Load project detail
  const openDetail = useCallback(async (id: string) => {
    setSelectedProjectId(id)
    const cached = detailCache.current.get(id)
    if (cached) {
      setDetail(cached)
      return
    }
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await getClientPortalProjectById(id)
      if (res.status === 'success') {
        detailCache.current.set(id, res.data)
        setDetail(res.data)
      }
    } catch (err) {
      console.error('Failed to load project detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const goBack = useCallback(() => {
    setSelectedProjectId(null)
    setDetail(null)
  }, [])

  // Filter logic
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return projects
    return projects.filter(p => p.status === statusFilter)
  }, [projects, statusFilter])

  // Only show statuses that actually have projects
  const availableStatuses = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of projects) {
      counts[p.status] = (counts[p.status] || 0) + 1
    }
    return counts
  }, [projects])

  // Group by property
  const groupedByProperty = useMemo(() => {
    const groups: Record<string, { propertyName: string; projects: ClientPortalCleaningProject[] }> = {}
    for (const project of filtered) {
      const key = project.propertyId || 'unknown'
      if (!groups[key]) groups[key] = { propertyName: project.propertyName || 'Unknown', projects: [] }
      groups[key].projects.push(project)
    }
    // Sort projects within each group by date descending
    for (const g of Object.values(groups)) {
      g.projects.sort((a, b) => b.projectDate.localeCompare(a.projectDate))
    }
    return Object.values(groups).sort((a, b) => a.propertyName.localeCompare(b.propertyName))
  }, [filtered])

  // Build flat photo list from detail for lightbox
  const buildPhotoList = useCallback((d: ClientPortalProjectDetail): PhotoEntry[] => {
    const photos: PhotoEntry[] = []
    // Checklist item photos
    for (const item of d.checklist.items) {
      if (item.photoUrl) {
        photos.push({
          url: item.photoUrl,
          label: 'Checklist',
          roomName: item.roomName,
          timestamp: item.photoTakenAt || item.photoUploadedAt,
        })
      }
    }
    // Walkthrough photos (from the new effective-template structure)
    if (d.walkthrough) {
      const wt = d.walkthrough
      for (const group of wt.effectiveTemplate.groups) {
        for (const photo of group.photos) {
          photos.push({
            url: photo.photoUrl,
            label: 'Walkthrough',
            roomName: group.name,
            timestamp: photo.photoTakenAt || photo.photoUploadedAt,
          })
        }
        for (const item of group.items) {
          for (const photo of item.photos) {
            photos.push({
              url: photo.photoUrl,
              label: 'Walkthrough',
              roomName: `${group.name} — ${item.name}`,
              timestamp: photo.photoTakenAt || photo.photoUploadedAt,
            })
          }
        }
      }
      for (const bucket of wt.orphanedGroups) {
        for (const photo of bucket.photos) {
          photos.push({
            url: photo.photoUrl,
            label: 'Walkthrough',
            roomName: bucket.groupNameSnapshot,
            timestamp: photo.photoTakenAt || photo.photoUploadedAt,
          })
        }
      }
      for (const photo of wt.freeformPhotos) {
        photos.push({
          url: photo.photoUrl,
          label: 'Walkthrough',
          roomName: undefined,
          timestamp: photo.photoTakenAt || photo.photoUploadedAt,
        })
      }
    }
    // Issue photos
    for (const issue of d.issues) {
      for (const url of issue.photoUrls) {
        photos.push({
          url,
          label: 'Issue',
          roomName: undefined,
          timestamp: issue.createdAt,
        })
      }
    }
    return photos
  }, [])

  const openPhotoViewer = useCallback((url: string, allPhotos: PhotoEntry[]) => {
    const index = allPhotos.findIndex(p => p.url === url)
    setPhotoViewer({ photos: allPhotos, index: index >= 0 ? index : 0 })
  }, [])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!photoViewer) return
    function handleKey(e: KeyboardEvent) {
      if (!photoViewer) return
      if (e.key === 'Escape') setPhotoViewer(null)
      if (e.key === 'ArrowRight') {
        setPhotoViewer(prev => prev ? { ...prev, index: Math.min(prev.index + 1, prev.photos.length - 1) } : null)
      }
      if (e.key === 'ArrowLeft') {
        setPhotoViewer(prev => prev ? { ...prev, index: Math.max(prev.index - 1, 0) } : null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [photoViewer])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {selectedProjectId && (
          <button
            onClick={goBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedProjectId ? 'Project Details' : 'Projects'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedProjectId && detail
              ? `${detail.propertyName} \u00B7 ${formatDate(detail.projectDate)}`
              : 'All cleaning projects across your properties'
            }
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedProjectId ? (
          /* ═══ DETAIL VIEW ═══ */
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {detailLoading ? (
              <DetailSkeleton />
            ) : detail ? (
              <ProjectDetailView
                detail={detail}
                onPhotoClick={(url) => openPhotoViewer(url, buildPhotoList(detail))}
              />
            ) : (
              <div className="text-center py-12 text-sm text-gray-500">
                Failed to load project details
              </div>
            )}
          </motion.div>
        ) : (
          /* ═══ LIST VIEW ═══ */
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Status Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
                <span className={`px-1.5 py-0.5 rounded text-xs ${statusFilter === 'all' ? 'bg-white/20' : 'bg-gray-200'}`}>
                  {projects.length}
                </span>
              </button>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = availableStatuses[key]
                if (!count) return null
                const isActive = statusFilter === key
                return (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? `${config.bg} ${config.text}`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {config.label}
                    <span className={`px-1.5 py-0.5 rounded text-xs ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Projects grouped by property */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-2xl bg-emerald-50 p-4 mb-4">
                  <WrenchScrewdriverIcon className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {statusFilter === 'all' ? 'No projects yet' : `No ${STATUS_CONFIG[statusFilter]?.label.toLowerCase() || statusFilter} projects`}
                </p>
                <p className="text-xs text-gray-400 mt-1">Projects will appear here once cleaning is scheduled</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedByProperty.map((group) => (
                  <div key={group.propertyName}>
                    <div className="flex items-center gap-2 mb-3">
                      <HomeModernIcon className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-gray-700">{group.propertyName}</span>
                      <span className="text-xs text-gray-400">({group.projects.length})</span>
                    </div>

                    <div className="grid gap-3">
                      {group.projects.map((project, i) => {
                        const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.pending
                        return (
                          <motion.button
                            key={project.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => openDetail(project.id)}
                            className="w-full text-left rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-4 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatDisplayDate(project.projectDate)}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusConfig.bg} ${statusConfig.text}`}>
                                    {statusConfig.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                  {project.projectStartTime && (
                                    <span className="flex items-center gap-1">
                                      <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
                                      {formatTime12(project.projectStartTime)}
                                      {project.projectEndTime ? ` - ${formatTime12(project.projectEndTime)}` : ''}
                                    </span>
                                  )}
                                  {project.cleanerName && (
                                    <span className="flex items-center gap-1">
                                      <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                                      {project.cleanerName}
                                    </span>
                                  )}
                                  {project.checklistName && (
                                    <span className="flex items-center gap-1">
                                      <DocumentTextIcon className="h-3.5 w-3.5 text-gray-400" />
                                      {project.checklistName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRightIcon className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      {photoViewer && (
        <PhotoLightbox
          photos={photoViewer.photos}
          index={photoViewer.index}
          onClose={() => setPhotoViewer(null)}
          onNavigate={(index) => setPhotoViewer(prev => prev ? { ...prev, index } : null)}
        />
      )}
    </div>
  )
}

/* ═══ Detail Skeleton ═══ */

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-xl bg-white border border-gray-100 p-6">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
      <div className="rounded-xl bg-white border border-gray-100 p-6">
        <div className="h-5 bg-gray-200 rounded w-1/4 mb-3" />
        <div className="h-4 bg-gray-100 rounded w-full mb-2" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
      <div className="rounded-xl bg-white border border-gray-100 p-6">
        <div className="h-5 bg-gray-200 rounded w-1/4 mb-3" />
        <div className="h-20 bg-gray-100 rounded w-full" />
      </div>
    </div>
  )
}

/* ═══ Project Detail View ═══ */

function ProjectDetailView({ detail, onPhotoClick }: { detail: ClientPortalProjectDetail; onPhotoClick: (url: string) => void }) {
  const statusConfig = STATUS_CONFIG[detail.status] || STATUS_CONFIG.pending
  const [collapsedRooms, setCollapsedRooms] = useState<Set<string>>(new Set())

  const toggleRoom = useCallback((room: string) => {
    setCollapsedRooms(prev => {
      const next = new Set(prev)
      if (next.has(room)) next.delete(room)
      else next.add(room)
      return next
    })
  }, [])

  const roomGroups = useMemo(() => groupItemsByRoom(detail.checklist.items), [detail.checklist.items])

  return (
    <div className="space-y-5">
      {/* Metadata Card */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Project Info</h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusConfig.bg} ${statusConfig.text}`}>
            {statusConfig.label}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <MetaField label="Property" value={detail.propertyName} />
          {detail.propertyAddress && <MetaField label="Address" value={detail.propertyAddress} />}
          <MetaField label="Date" value={formatDate(detail.projectDate)} />
          {detail.projectStartTime && (
            <MetaField
              label="Time"
              value={`${formatTime12(detail.projectStartTime)}${detail.projectEndTime ? ` - ${formatTime12(detail.projectEndTime)}` : ''}`}
            />
          )}
          {detail.estimatedDurationMinutes != null && detail.estimatedDurationMinutes > 0 && (
            <MetaField label="Estimated Duration" value={formatDuration(detail.estimatedDurationMinutes)} />
          )}
          {detail.actualStart && (
            <MetaField
              label="Actual Time"
              value={`${formatTime12(detail.actualStart.split('T')[1]?.substring(0, 5) || detail.actualStart)}${detail.actualEnd ? ` - ${formatTime12(detail.actualEnd.split('T')[1]?.substring(0, 5) || detail.actualEnd)}` : ''}`}
            />
          )}
          {detail.cleanerName && <MetaField label="Cleaner" value={detail.cleanerName} />}
          {detail.checklistName && <MetaField label="Checklist" value={detail.checklistName} />}
          {detail.source && <MetaField label="Source" value={detail.source} />}
        </div>
      </div>

      {/* Booking Context */}
      {(detail.previousBookingCheckOut || detail.nextBookingCheckIn || detail.guestName) && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Booking Context</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {detail.guestName && <MetaField label="Guest" value={detail.guestName} />}
            {detail.previousBookingCheckOut && (
              <MetaField label="Previous Check-Out" value={formatDisplayDate(detail.previousBookingCheckOut)} />
            )}
            {detail.nextBookingCheckIn && (
              <MetaField
                label="Next Check-In"
                value={`${formatDisplayDate(detail.nextBookingCheckIn)}${detail.nextBookingGuestName ? ` (${detail.nextBookingGuestName})` : ''}`}
              />
            )}
          </div>
        </div>
      )}

      {/* PM Notes */}
      {detail.pmNotes && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5">
          <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Manager Notes</h4>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{detail.pmNotes}</p>
        </div>
      )}

      {/* Checklist Section */}
      {detail.checklist.items.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Checklist</h3>
            {detail.checklist.progress && (
              <span className="text-xs text-gray-500">
                {detail.checklist.progress.completedItems}/{detail.checklist.progress.totalItems} completed
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {detail.checklist.progress && (
            <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${detail.checklist.progress.completionPercentage}%` }}
              />
            </div>
          )}

          {/* Items grouped by room */}
          <div className="space-y-4">
            {Object.entries(roomGroups).map(([roomName, items]) => {
              const isCollapsed = collapsedRooms.has(roomName)
              const completedCount = items.filter(i => i.isCompleted).length
              return (
                <div key={roomName}>
                  <button
                    onClick={() => toggleRoom(roomName)}
                    className="flex items-center gap-2 w-full text-left py-1.5 cursor-pointer"
                  >
                    {isCollapsed ? (
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{roomName}</span>
                    <span className="text-[11px] text-gray-400">
                      {completedCount}/{items.length}
                    </span>
                  </button>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1.5 pl-6 pt-1">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 py-1.5">
                              <div className={`mt-0.5 shrink-0 ${item.isCompleted ? 'text-emerald-500' : 'text-gray-300'}`}>
                                <CheckCircleIcon className="h-4.5 w-4.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${item.isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {item.taskDescription}
                                </p>
                                {item.notes && (
                                  <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
                                )}
                              </div>
                              {item.photoUrl && (
                                <button
                                  onClick={() => onPhotoClick(item.photoUrl!)}
                                  className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity cursor-pointer"
                                >
                                  <img src={item.photoUrl} alt="Task photo" className="w-full h-full object-cover" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Walkthrough Section */}
      {detail.walkthrough && (() => {
        const wt = detail.walkthrough
        const hasAnyPhotos =
          wt.effectiveTemplate.groups.some(
            g => g.photos.length > 0 || g.items.some(it => it.photos.length > 0)
          ) ||
          wt.orphanedGroups.some(og => og.photos.length > 0) ||
          wt.freeformPhotos.length > 0
        if (!hasAnyPhotos) return null
        const sortedGroups = [...wt.effectiveTemplate.groups].sort(
          (a, b) => a.sortOrder - b.sortOrder
        )
        return (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <EyeIcon className="h-4.5 w-4.5 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">Walkthrough Photos</h3>
            </div>

            <div className="space-y-5">
              {sortedGroups.map((group) => {
                const groupHasPhotos =
                  group.photos.length > 0 ||
                  group.items.some(it => it.photos.length > 0)
                if (!groupHasPhotos) return null
                const sortedItems = [...group.items].sort((a, b) => a.sortOrder - b.sortOrder)
                return (
                  <div key={group.id}>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{group.name}</p>
                    {group.photos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {group.photos.map((photo) => (
                          <button
                            key={photo.id}
                            onClick={() => onPhotoClick(photo.photoUrl)}
                            className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <img src={photo.photoUrl} alt={`${group.name} walkthrough`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    {sortedItems.map((item) =>
                      item.photos.length > 0 ? (
                        <div key={item.id} className="mb-3">
                          <p className="text-[11px] font-medium text-gray-500 mb-1.5">{item.name}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {item.photos.map((photo) => (
                              <button
                                key={photo.id}
                                onClick={() => onPhotoClick(photo.photoUrl)}
                                className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity cursor-pointer"
                              >
                                <img src={photo.photoUrl} alt={`${item.name} walkthrough`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                )
              })}

              {wt.orphanedGroups.length > 0 && wt.orphanedGroups.map((bucket) => (
                <div key={bucket.groupNameSnapshot}>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                    {bucket.groupNameSnapshot} (archived)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {bucket.photos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => onPhotoClick(photo.photoUrl)}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <img src={photo.photoUrl} alt={`${bucket.groupNameSnapshot} walkthrough`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {wt.freeformPhotos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Other Photos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {wt.freeformPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => onPhotoClick(photo.photoUrl)}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <img src={photo.photoUrl} alt="walkthrough" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Issues Section */}
      {detail.issues.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="h-4.5 w-4.5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Issues ({detail.issues.length})</h3>
          </div>

          <div className="space-y-4">
            {detail.issues.map((issue) => {
              const typeConfig = ISSUE_TYPE_CONFIG[issue.issueType] || ISSUE_TYPE_CONFIG.other
              const issueStatusConfig = STATUS_CONFIG[issue.status] || { label: issue.status, bg: 'bg-gray-100', text: 'text-gray-700' }
              const TypeIcon = typeConfig.icon

              return (
                <div key={issue.id} className="border border-gray-100 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg shrink-0 ${typeConfig.color}`}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900">{typeConfig.label}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${issueStatusConfig.bg} ${issueStatusConfig.text}`}>
                          {issueStatusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{issue.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                        <span>{formatAge(issue.createdAt)}</span>
                        {issue.reporterName && <span>by {issue.reporterName}</span>}
                      </div>
                    </div>
                  </div>

                  {issue.photoUrls.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-9">
                      {issue.photoUrls.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => onPhotoClick(url)}
                          className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <img src={url} alt={`Issue photo ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {issue.pmNotes && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 ml-9">
                      <p className="text-xs text-gray-900">
                        <span className="font-medium text-emerald-600">Manager: </span>
                        {issue.pmNotes}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══ Meta Field ═══ */

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  )
}

/* ═══ Photo Lightbox ═══ */

function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: PhotoEntry[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const photo = photos[index]
  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
        {index + 1} / {photos.length}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer"
      >
        <XMarkIcon className="w-6 h-6 text-white" />
      </button>

      {/* Prev arrow */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer"
        >
          <ChevronLeftIcon className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Next arrow */}
      {index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer"
        >
          <ChevronRightIcon className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Image */}
      <img
        src={photo.url}
        alt="Project photo"
        className="max-w-full max-h-[80vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Label bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 rounded-lg px-4 py-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          photo.label === 'Checklist' ? 'bg-emerald-500/20 text-emerald-300'
            : photo.label === 'Walkthrough' ? 'bg-blue-500/20 text-blue-300'
            : 'bg-red-500/20 text-red-300'
        }`}>
          {photo.label}
        </span>
        {photo.roomName && (
          <span className="text-sm text-white/80">{photo.roomName}</span>
        )}
        {photo.timestamp && (
          <span className="text-xs text-white/50">{formatDate(photo.timestamp)}</span>
        )}
      </div>
    </div>
  )
}
