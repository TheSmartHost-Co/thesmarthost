'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CameraIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import ImagePreviewModal from '@/components/shared/ImagePreviewModal'
import { getProjectPhotos, downloadChecklistPhotoWatermarked, downloadWalkthroughPhotoWatermarked, getStatusDisplay } from '@/services/cleaningProjectService'
import { downloadIssuePhotoWatermarked } from '@/services/projectIssueService'
import { parseLocalDate } from '@/utils/dateUtils'
import type { ProjectWithPhotos, ChecklistPhotoItem, IssuePhotoItem, WalkthroughPhotoItem } from '@/services/types/cleaningProject'

interface PhotoGalleryModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  initialStartDate?: string
  initialEndDate?: string
}

interface FlatPhoto {
  url: string
  label: string
  roomName?: string
  photoTakenAt: string | null
  photoUploadedAt: string | null
  type: 'checklist' | 'issue' | 'walkthrough'
  projectId: string
  itemId?: string
  issueId?: string
  photoIndex?: number
  walkthroughPhotoId?: string
  walkthroughProjectId?: string
}

function getThirtyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ProgressiveImage({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg" />
      )}
      {error ? (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center rounded-lg">
          <CameraIcon className="w-6 h-6 text-gray-300" />
        </div>
      ) : (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </>
  )
}

export default function PhotoGalleryModal({ isOpen, onClose, userId, initialStartDate, initialEndDate }: PhotoGalleryModalProps) {
  // Data
  const [projects, setProjects] = useState<ProjectWithPhotos[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, totalProjects: 0 })

  // Date range
  const [startDate, setStartDate] = useState(initialStartDate || getThirtyDaysAgo())
  const [endDate, setEndDate] = useState(initialEndDate || getToday())

  // View
  const [activeTab, setActiveTab] = useState<'project' | 'property'>('project')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Photo type filter
  const [photoFilter, setPhotoFilter] = useState<'all' | 'checklist' | 'issue' | 'walkthrough'>('all')

  // Preview (replaces lightbox)
  const [previewImage, setPreviewImage] = useState<{
    url: string
    title: string
    photoTakenAt?: string | null
    photoUploadedAt?: string | null
    downloadFn?: () => Promise<void>
  } | null>(null)

  // Fetch photos
  const fetchPhotos = useCallback(async (page: number = 1) => {
    if (!userId || !isOpen) return
    setLoading(true)
    try {
      const res = await getProjectPhotos(userId, startDate, endDate, page)
      if (res.status === 'success') {
        setProjects(res.data.projects)
        setPagination({
          page: res.data.pagination.page,
          totalPages: res.data.pagination.totalPages,
          totalProjects: res.data.pagination.totalProjects,
        })
      }
    } catch (err) {
      console.error('Failed to fetch photos:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, isOpen, startDate, endDate])

  useEffect(() => {
    if (isOpen) {
      fetchPhotos(1)
    }
  }, [isOpen, startDate, endDate, fetchPhotos])

  // Sync date range from calendar when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialStartDate) setStartDate(initialStartDate)
      if (initialEndDate) setEndDate(initialEndDate)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCollapsedGroups(new Set())
      setActiveTab('project')
      setPhotoFilter('all')
    }
  }, [isOpen])

  // Collapse all groups by default when data loads
  useEffect(() => {
    if (projects.length > 0) {
      const projectKeys = projects.map(p => p.projectId)
      const propertyKeys = [...new Set(projects.map(p => `prop-${p.propertyName}`))]
      setCollapsedGroups(new Set([...projectKeys, ...propertyKeys]))
    }
  }, [projects])

  // Total photo count (respects filter)
  const totalPhotoCount = useMemo(() => {
    return projects.reduce((sum, p) => {
      let count = 0
      if (photoFilter === 'all' || photoFilter === 'checklist') count += p.checklistPhotos.length
      if (photoFilter === 'all' || photoFilter === 'issue') count += p.issuePhotos.reduce((s, ip) => s + ip.photoUrls.length, 0)
      if (photoFilter === 'all' || photoFilter === 'walkthrough') count += (p.walkthroughPhotos?.length || 0)
      return sum + count
    }, 0)
  }, [projects, photoFilter])

  // Per-project filtered photo counts (checklist vs issue)
  const getProjectPhotoCounts = (project: ProjectWithPhotos): { checklist: number; issue: number; walkthrough: number; total: number } => {
    const checklist = (photoFilter === 'all' || photoFilter === 'checklist') ? project.checklistPhotos.length : 0
    const issue = (photoFilter === 'all' || photoFilter === 'issue') ? project.issuePhotos.reduce((s, ip) => s + ip.photoUrls.length, 0) : 0
    const walkthrough = (photoFilter === 'all' || photoFilter === 'walkthrough') ? (project.walkthroughPhotos?.length || 0) : 0
    return { checklist, issue, walkthrough, total: checklist + issue + walkthrough }
  }

  const getProjectPhotoCount = (project: ProjectWithPhotos): number => getProjectPhotoCounts(project).total

  // "By Property" grouping
  const byPropertyGroups = useMemo(() => {
    if (activeTab !== 'property') return []
    const map = new Map<string, { propertyName: string; propertyAddress: string; projects: ProjectWithPhotos[]; totalPhotos: number; totalChecklist: number; totalIssue: number; totalWalkthrough: number }>()
    for (const p of projects) {
      const key = p.propertyName
      if (!map.has(key)) {
        map.set(key, { propertyName: p.propertyName, propertyAddress: p.propertyAddress, projects: [], totalPhotos: 0, totalChecklist: 0, totalIssue: 0, totalWalkthrough: 0 })
      }
      const group = map.get(key)!
      group.projects.push(p)
      const counts = getProjectPhotoCounts(p)
      group.totalPhotos += counts.total
      group.totalChecklist += counts.checklist
      group.totalIssue += counts.issue
      group.totalWalkthrough += counts.walkthrough
    }
    return Array.from(map.values()).sort((a, b) => a.propertyName.localeCompare(b.propertyName))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, activeTab, photoFilter])

  // Toggle collapse
  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Open preview (replaces openLightbox)
  const openPreview = (photo: FlatPhoto) => {
    let downloadFn: (() => Promise<void>) | undefined
    if (photo.type === 'checklist' && photo.itemId) {
      downloadFn = () => downloadChecklistPhotoWatermarked(photo.projectId, photo.itemId!)
    } else if (photo.type === 'issue' && photo.issueId && photo.photoIndex !== undefined) {
      downloadFn = () => downloadIssuePhotoWatermarked(photo.issueId!, photo.photoIndex!)
    } else if (photo.type === 'walkthrough' && photo.walkthroughProjectId && photo.walkthroughPhotoId) {
      downloadFn = () => downloadWalkthroughPhotoWatermarked(photo.walkthroughProjectId!, photo.walkthroughPhotoId!)
    }
    setPreviewImage({
      url: photo.url,
      title: photo.roomName || photo.label,
      photoTakenAt: photo.photoTakenAt,
      photoUploadedAt: photo.photoUploadedAt,
      downloadFn,
    })
  }

  // Quick date presets
  const setPreset = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    setStartDate(d.toISOString().split('T')[0])
    setEndDate(getToday())
  }

  // Status badge
  const statusBadge = (status: string) => {
    const display = getStatusDisplay(status as Parameters<typeof getStatusDisplay>[0])
    const colorMap: Record<string, string> = {
      yellow: 'bg-yellow-100 text-yellow-700',
      blue: 'bg-blue-100 text-blue-700',
      indigo: 'bg-indigo-100 text-indigo-700',
      purple: 'bg-purple-100 text-purple-700',
      green: 'bg-green-100 text-green-700',
      gray: 'bg-gray-100 text-gray-600',
    }
    return (
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${colorMap[display.color] || colorMap.gray}`}>
        {display.label}
      </span>
    )
  }

  // Issue status border color
  const issueBorderColor = (status: string) => {
    if (status === 'open') return 'border-red-300 ring-1 ring-red-200'
    if (status === 'acknowledged') return 'border-amber-300 ring-1 ring-amber-200'
    return 'border-green-300 ring-1 ring-green-200'
  }

  // Render photo thumbnail
  const renderPhotoCard = (
    url: string,
    label: string,
    roomName: string | undefined,
    onClick: () => void,
    issueStatus?: string
  ) => (
    <button
      key={url}
      onClick={onClick}
      className={`
        group relative aspect-square rounded-lg overflow-hidden cursor-pointer
        border transition-all duration-150 hover:shadow-md
        ${issueStatus ? issueBorderColor(issueStatus) : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      <ProgressiveImage url={url} alt={label} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-white font-medium truncate">{roomName || label}</p>
      </div>
      {issueStatus && (
        <div className="absolute top-1 right-1">
          <ExclamationTriangleIcon className={`w-4 h-4 ${issueStatus === 'open' ? 'text-red-500' : issueStatus === 'acknowledged' ? 'text-amber-500' : 'text-green-500'}`} />
        </div>
      )}
    </button>
  )

  // Render a project's photos section
  const renderProjectPhotos = (project: ProjectWithPhotos) => {
    return (
      <div className="space-y-3">
        {/* Checklist photos */}
        {(photoFilter === 'all' || photoFilter === 'checklist') && project.checklistPhotos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Checklist Photos ({project.checklistPhotos.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {project.checklistPhotos.map((cp) =>
                renderPhotoCard(
                  cp.photoUrl,
                  cp.taskDescription,
                  cp.roomName,
                  () => openPreview({
                    url: cp.photoUrl,
                    label: cp.taskDescription,
                    roomName: cp.roomName,
                    photoTakenAt: cp.photoTakenAt,
                    photoUploadedAt: cp.photoUploadedAt,
                    type: 'checklist',
                    projectId: project.projectId,
                    itemId: cp.itemId,
                  }),
                )
              )}
            </div>
          </div>
        )}
        {/* Issue photos */}
        {(photoFilter === 'all' || photoFilter === 'issue') && project.issuePhotos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-600 mb-2 flex items-center gap-1">
              <ExclamationTriangleIcon className="w-3.5 h-3.5" />
              Issue Photos ({project.issuePhotos.reduce((s, ip) => s + ip.photoUrls.length, 0)})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {project.issuePhotos.flatMap((ip) =>
                ip.photoUrls.map((url, urlIndex) =>
                  renderPhotoCard(
                    url,
                    `${ip.issueType}: ${ip.description}`,
                    undefined,
                    () => openPreview({
                      url,
                      label: `${ip.issueType}: ${ip.description}`,
                      photoTakenAt: ip.photoTakenAt,
                      photoUploadedAt: ip.photoUploadedAt,
                      type: 'issue',
                      projectId: project.projectId,
                      issueId: ip.issueId,
                      photoIndex: urlIndex,
                    }),
                    ip.status,
                  )
                )
              )}
            </div>
          </div>
        )}
        {/* Walkthrough photos */}
        {(photoFilter === 'all' || photoFilter === 'walkthrough') && project.walkthroughPhotos && project.walkthroughPhotos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
              <CameraIcon className="w-3.5 h-3.5" />
              Walkthrough Photos ({project.walkthroughPhotos.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {project.walkthroughPhotos.map((wp) =>
                renderPhotoCard(
                  wp.photoUrl,
                  `Walkthrough: ${wp.roomName}`,
                  wp.roomName,
                  () => openPreview({
                    url: wp.photoUrl,
                    label: `Walkthrough: ${wp.roomName}`,
                    roomName: wp.roomName,
                    photoTakenAt: wp.photoTakenAt,
                    photoUploadedAt: wp.photoUploadedAt,
                    type: 'walkthrough',
                    projectId: project.projectId,
                    walkthroughPhotoId: wp.id,
                    walkthroughProjectId: wp.projectId,
                  }),
                )
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render group header
  const renderGroupHeader = (
    key: string,
    title: string,
    subtitle: string,
    photoCount: number,
    checklistCount: number,
    issueCount: number,
    extra?: React.ReactNode,
    walkthroughCount?: number,
  ) => {
    const isCollapsed = collapsedGroups.has(key)
    return (
      <button
        onClick={() => toggleGroup(key)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-left"
      >
        <motion.div animate={{ rotate: isCollapsed ? 0 : 90 }} transition={{ duration: 0.15 }}>
          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 truncate">{title}</span>
            {extra}
          </div>
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          {checklistCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
              {checklistCount} checklist
            </span>
          )}
          {issueCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
              {issueCount} issue{issueCount !== 1 ? 's' : ''}
            </span>
          )}
          {(walkthroughCount ?? 0) > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
              {walkthroughCount} walkthrough
            </span>
          )}
          <span className="text-xs text-gray-400">{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>
        </div>
      </button>
    )
  }

  // Pagination controls
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null
    const pages: number[] = []
    for (let i = 1; i <= pagination.totalPages; i++) pages.push(i)

    return (
      <div className="flex items-center justify-center gap-1 pt-4 border-t border-gray-100">
        <button
          onClick={() => fetchPhotos(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => fetchPhotos(p)}
            className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              p === pagination.page
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => fetchPhotos(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} style="max-w-4xl h-[70vh] !overflow-hidden">
        <div className="p-4 sm:p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CameraIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Photo Gallery</h2>
                <p className="text-xs text-gray-500">
                  {loading ? 'Loading...' : `${totalPhotoCount} photo${totalPhotoCount !== 1 ? 's' : ''} across ${pagination.totalProjects} project${pagination.totalProjects !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>

          {/* Date controls */}
          <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
              />
            </div>
            <div className="flex items-center gap-1">
              {[
                { label: '7d', days: 7 },
                { label: '30d', days: 30 },
                { label: '90d', days: 90 },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setPreset(preset.days)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 p-0.5 bg-gray-100 rounded-lg w-fit shrink-0">
            <button
              onClick={() => setActiveTab('project')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'project' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              By Project
            </button>
            <button
              onClick={() => setActiveTab('property')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'property' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              By Property
            </button>
          </div>

          {/* Photo type filter */}
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <span className="text-xs text-gray-500">Show:</span>
            <div className="flex items-center gap-1">
              {[
                { value: 'all', label: 'All Photos' },
                { value: 'checklist', label: 'Checklist' },
                { value: 'issue', label: 'Issues' },
                { value: 'walkthrough', label: 'Walkthrough' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPhotoFilter(opt.value as 'all' | 'checklist' | 'issue' | 'walkthrough')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    photoFilter === opt.value
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
            {loading ? (
              // Skeleton loader
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-10 bg-gray-100 rounded-lg mb-2" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map(j => (
                        <div key={j} className="aspect-square bg-gray-100 rounded-lg" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CameraIcon className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">No photos found in this date range</p>
                <p className="text-xs text-gray-400 mt-1">Try expanding the date range or selecting different dates</p>
              </div>
            ) : activeTab === 'project' ? (
              // By Project view
              projects.map(project => {
                const key = project.projectId
                const isCollapsed = collapsedGroups.has(key)
                const counts = getProjectPhotoCounts(project)
                if (counts.total === 0) return null
                return (
                  <div key={key}>
                    {renderGroupHeader(
                      key,
                      project.propertyName,
                      `${formatDate(project.projectDate)} · ${project.cleanerName}`,
                      counts.total,
                      counts.checklist,
                      counts.issue,
                      statusBadge(project.status),
                      counts.walkthrough,
                    )}
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                          style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 300px' }}
                        >
                          <div className="pt-3 pl-6">
                            {renderProjectPhotos(project)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })
            ) : (
              // By Property view
              byPropertyGroups.map(group => {
                const key = `prop-${group.propertyName}`
                const isCollapsed = collapsedGroups.has(key)
                if (group.totalPhotos === 0) return null
                return (
                  <div key={key}>
                    {renderGroupHeader(
                      key,
                      group.propertyName,
                      group.propertyAddress || `${group.projects.length} project${group.projects.length !== 1 ? 's' : ''}`,
                      group.totalPhotos,
                      group.totalChecklist,
                      group.totalIssue,
                      undefined,
                      group.totalWalkthrough,
                    )}
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                          style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 300px' }}
                        >
                          <div className="pt-2 pl-6 space-y-3">
                            {group.projects.map(project => {
                              const filteredCount = getProjectPhotoCount(project)
                              if (filteredCount === 0) return null
                              return (
                                <div key={project.projectId}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-medium text-gray-700">
                                      {formatDate(project.projectDate)}
                                    </span>
                                    <span className="text-xs text-gray-400">·</span>
                                    <span className="text-xs text-gray-500">{project.cleanerName}</span>
                                    {statusBadge(project.status)}
                                  </div>
                                  {renderProjectPhotos(project)}
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          <div className="shrink-0">
            {!loading && renderPagination()}
          </div>
        </div>
      </Modal>

      {/* Image Preview Modal (replaces custom lightbox) */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title}
        photoTakenAt={previewImage?.photoTakenAt}
        photoUploadedAt={previewImage?.photoUploadedAt}
        onDownloadWatermarked={previewImage?.downloadFn}
      />
    </>
  )
}
