'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CameraIcon,
  HomeModernIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { getClientPortalIssues } from '@/services/clientPortalService'
import { parseLocalDate } from '@/utils/dateUtils'
import type { ClientPortalIssue } from '@/services/types/clientPortal'

type StatusFilter = 'all' | 'open' | 'acknowledged' | 'resolved'

const ISSUE_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  damage: { label: 'Damage', icon: ExclamationTriangleIcon, color: 'bg-red-100 text-red-600' },
  missing_item: { label: 'Missing Item', icon: QuestionMarkCircleIcon, color: 'bg-purple-100 text-purple-600' },
  maintenance: { label: 'Maintenance', icon: WrenchScrewdriverIcon, color: 'bg-amber-100 text-amber-600' },
  other: { label: 'Other', icon: DocumentTextIcon, color: 'bg-gray-100 text-gray-600' },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: 'Open', bg: 'bg-red-100', text: 'text-red-700' },
  acknowledged: { label: 'Acknowledged', bg: 'bg-amber-100', text: 'text-amber-700' },
  resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-700' },
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

export default function ClientIssuesPage() {
  const [issues, setIssues] = useState<ClientPortalIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedIssue, setSelectedIssue] = useState<ClientPortalIssue | null>(null)
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await getClientPortalIssues()
        if (res.status === 'success') {
          setIssues(res.data)
        }
      } catch (err) {
        console.error('Failed to load issues:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return issues
    return issues.filter(i => i.status === statusFilter)
  }, [issues, statusFilter])

  const statusCounts = useMemo(() => ({
    all: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    acknowledged: issues.filter(i => i.status === 'acknowledged').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  }), [issues])

  // Group by property
  const groupedByProperty = useMemo(() => {
    const groups: Record<string, { propertyName: string; issues: ClientPortalIssue[] }> = {}
    for (const issue of filtered) {
      const key = issue.propertyId || 'unknown'
      if (!groups[key]) groups[key] = { propertyName: issue.propertyName || 'Unknown', issues: [] }
      groups[key].issues.push(issue)
    }
    return Object.values(groups).sort((a, b) => a.propertyName.localeCompare(b.propertyName))
  }, [filtered])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading issues...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with back button when viewing detail */}
      <div className="flex items-center gap-3">
        {selectedIssue && (
          <button
            onClick={() => setSelectedIssue(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedIssue ? 'Issue Details' : 'Issues'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedIssue
              ? `${selectedIssue.propertyName} \u00B7 ${formatAge(selectedIssue.createdAt)}`
              : 'Property issues reported during cleaning projects'
            }
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedIssue ? (
          /* ═══ DETAIL VIEW ═══ */
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <IssueDetailCard issue={selectedIssue} onPhotoClick={setPhotoViewerUrl} />
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
              {(['all', 'open', 'acknowledged', 'resolved'] as const).map((status) => {
                const config = status === 'all'
                  ? { label: 'All' }
                  : STATUS_CONFIG[status]
                const isActive = statusFilter === status

                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? status === 'all' ? 'bg-emerald-600 text-white'
                          : `${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].text}`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {'label' in config ? config.label : status}
                    <span className={`px-1.5 py-0.5 rounded text-xs ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>
                      {statusCounts[status]}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Issues grouped by property */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-2xl bg-green-50 p-4 mb-4">
                  <CheckCircleIcon className="h-8 w-8 text-green-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {statusFilter === 'all' ? 'No issues reported' : `No ${statusFilter} issues`}
                </p>
                <p className="text-xs text-gray-400 mt-1">Everything looks good across your properties</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedByProperty.map((group) => (
                  <div key={group.propertyName}>
                    {/* Property header */}
                    <div className="flex items-center gap-2 mb-3">
                      <HomeModernIcon className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-gray-700">{group.propertyName}</span>
                      <span className="text-xs text-gray-400">({group.issues.length})</span>
                    </div>

                    {/* Issue cards */}
                    <div className="grid gap-3">
                      {group.issues.map((issue, i) => {
                        const typeConfig = ISSUE_TYPE_CONFIG[issue.issueType] || ISSUE_TYPE_CONFIG.other
                        const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open
                        const TypeIcon = typeConfig.icon

                        return (
                          <motion.button
                            key={issue.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => setSelectedIssue(issue)}
                            className="w-full text-left rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-4 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-start gap-4">
                              <div className={`p-1.5 rounded-lg shrink-0 ${typeConfig.color}`}>
                                <TypeIcon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-sm font-medium text-gray-900">{typeConfig.label}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                                    {statusConfig.label}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-1">{issue.description}</p>
                                <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1.5">
                                  <span>{formatAge(issue.createdAt)}</span>
                                  {issue.reporterName && <span>by {issue.reporterName}</span>}
                                  {issue.photoUrls && issue.photoUrls.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <CameraIcon className="h-3.5 w-3.5" />
                                      {issue.photoUrls.length}
                                    </span>
                                  )}
                                </div>
                              </div>
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

      {/* Photo Viewer Overlay */}
      {photoViewerUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPhotoViewerUrl(null)}
        >
          <button
            onClick={() => setPhotoViewerUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
          <img
            src={photoViewerUrl}
            alt="Issue photo"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

/* ═══ Issue Detail Card ═══ */
function IssueDetailCard({ issue, onPhotoClick }: { issue: ClientPortalIssue; onPhotoClick: (url: string) => void }) {
  const typeConfig = ISSUE_TYPE_CONFIG[issue.issueType] || ISSUE_TYPE_CONFIG.other
  const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open
  const TypeIcon = typeConfig.icon
  const isResolved = issue.status === 'resolved'

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl ${typeConfig.color}`}>
          <TypeIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{typeConfig.label}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <HomeModernIcon className="w-4 h-4" />
              {issue.propertyName}
            </span>
            <span>{formatAge(issue.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{issue.description}</p>
      </div>

      {/* Photos */}
      {issue.photoUrls && issue.photoUrls.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Photos ({issue.photoUrls.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
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
        </div>
      )}

      {/* PM Notes */}
      {issue.pmNotes && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Manager Note</h4>
          <p className="text-sm text-gray-900">{issue.pmNotes}</p>
        </div>
      )}

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
        {issue.reporterName && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Reported By</p>
            <p className="font-medium text-gray-900">{issue.reporterName}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Reported On</p>
          <p className="font-medium text-gray-900">{formatDate(issue.createdAt)}</p>
        </div>
        {issue.projectDate && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Cleaning Date</p>
            <p className="font-medium text-gray-900">{formatDate(issue.projectDate)}</p>
          </div>
        )}
        {issue.resolvedAt && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Resolved On</p>
            <p className="font-medium text-green-700">{formatDate(issue.resolvedAt)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
