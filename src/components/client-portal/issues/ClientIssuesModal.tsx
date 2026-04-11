'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '@/components/shared/modal'
import {
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  PhotoIcon,
  CalendarIcon,
  ClockIcon,
  HomeModernIcon,
  CameraIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { getClientPortalIssues } from '@/services/clientPortalService'
import { parseLocalDate } from '@/utils/dateUtils'
import type { ClientPortalIssue } from '@/services/types/clientPortal'

interface ClientIssuesModalProps {
  isOpen: boolean
  onClose: () => void
}

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

function formatIssueAge(dateStr: string): string {
  const created = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

function formatDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ClientIssuesModal({ isOpen, onClose }: ClientIssuesModalProps) {
  const [issues, setIssues] = useState<ClientPortalIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<ClientPortalIssue | null>(null)
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [collapsedProperties, setCollapsedProperties] = useState<Set<string>>(new Set())
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchIssues()
    } else {
      setSelectedIssue(null)
      setFilterStatus('all')
      setCollapsedProperties(new Set())
      setPhotoViewerUrl(null)
    }
  }, [isOpen])

  const fetchIssues = async () => {
    setLoading(true)
    try {
      const res = await getClientPortalIssues()
      if (res.status === 'success') {
        setIssues(res.data)
      }
    } catch (err) {
      console.error('Error loading issues:', err)
    } finally {
      setLoading(false)
    }
  }

  const statusCounts = useMemo(() => ({
    all: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    acknowledged: issues.filter(i => i.status === 'acknowledged').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  }), [issues])

  const filteredIssues = useMemo(() =>
    filterStatus === 'all' ? issues : issues.filter(i => i.status === filterStatus),
    [issues, filterStatus]
  )

  // Group by property
  const groupedByProperty = useMemo(() => {
    const groups: Record<string, { propertyName: string; propertyId: string; issues: ClientPortalIssue[] }> = {}
    for (const issue of filteredIssues) {
      const key = issue.propertyId || 'unknown'
      if (!groups[key]) {
        groups[key] = { propertyName: issue.propertyName || 'Unknown Property', propertyId: key, issues: [] }
      }
      groups[key].issues.push(issue)
    }
    return Object.values(groups).sort((a, b) => a.propertyName.localeCompare(b.propertyName))
  }, [filteredIssues])

  const toggleProperty = (propertyId: string) => {
    setCollapsedProperties(prev => {
      const next = new Set(prev)
      next.has(propertyId) ? next.delete(propertyId) : next.add(propertyId)
      return next
    })
  }

  // Issue detail view
  const IssueDetailView = ({ issue }: { issue: ClientPortalIssue }) => {
    const typeConfig = ISSUE_TYPE_CONFIG[issue.issueType] || ISSUE_TYPE_CONFIG.other
    const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open
    const TypeIcon = typeConfig.icon
    const isResolved = issue.status === 'resolved'

    return (
      <div className="space-y-5">
        {/* Issue Header */}
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
              <span>{formatIssueAge(issue.createdAt)}</span>
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
                  onClick={() => setPhotoViewerUrl(url)}
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

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
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

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} closable style="w-11/12 max-w-2xl max-h-[85vh] overflow-hidden">
        <div className="p-4 sm:p-6 flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div className="flex items-center gap-3">
              {selectedIssue ? (
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
                  <ExclamationTriangleIcon className="w-6 h-6" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedIssue ? 'Issue Details' : 'Property Issues'}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedIssue
                    ? `${selectedIssue.propertyName} \u00B7 ${formatIssueAge(selectedIssue.createdAt)}`
                    : `${statusCounts.open + statusCounts.acknowledged} open across your properties`
                  }
                </p>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedIssue ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="overflow-y-auto flex-1"
              >
                <IssueDetailView issue={selectedIssue} />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col flex-1 overflow-hidden"
              >
                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-3 shrink-0">
                  {(['all', 'open', 'acknowledged', 'resolved'] as const).map((status) => {
                    const config = status === 'all'
                      ? { label: 'All', bg: 'bg-emerald-600 text-white', inactive: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' }
                      : { label: STATUS_CONFIG[status].label, bg: `${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].text}`, inactive: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' }

                    return (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          filterStatus === status ? config.bg : config.inactive
                        }`}
                      >
                        {config.label}
                        <span className="ml-1.5 text-xs opacity-60">({statusCounts[status]})</span>
                      </button>
                    )
                  })}
                </div>

                {/* Issues List */}
                <div className="overflow-y-auto flex-1">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredIssues.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="rounded-2xl bg-green-50 p-4 mx-auto w-fit mb-3">
                        <CheckCircleIcon className="w-8 h-8 text-green-400" />
                      </div>
                      <p className="text-gray-500 font-medium">
                        {filterStatus === 'all' ? 'No issues found' : `No ${filterStatus} issues`}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">Everything looks good across your properties</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedByProperty.map((group) => {
                        const isCollapsed = collapsedProperties.has(group.propertyId)
                        return (
                          <div key={group.propertyId}>
                            <button
                              onClick={() => toggleProperty(group.propertyId)}
                              className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                              <HomeModernIcon className="w-4 h-4 text-emerald-600" />
                              <span className="font-medium text-gray-900 text-sm">{group.propertyName}</span>
                              <span className="text-xs text-gray-400 ml-auto">
                                {group.issues.length} issue{group.issues.length !== 1 ? 's' : ''}
                              </span>
                            </button>

                            {!isCollapsed && (
                              <div className="mt-2 space-y-2 pl-2">
                                {group.issues.map((issue) => {
                                  const typeConfig = ISSUE_TYPE_CONFIG[issue.issueType] || ISSUE_TYPE_CONFIG.other
                                  const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open
                                  const TypeIcon = typeConfig.icon

                                  return (
                                    <button
                                      key={issue.id}
                                      onClick={() => setSelectedIssue(issue)}
                                      className="w-full text-left p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`p-1.5 rounded-lg ${typeConfig.color}`}>
                                          <TypeIcon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-900 text-sm">{typeConfig.label}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                                              {statusConfig.label}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-600 line-clamp-1">{issue.description}</p>
                                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400">
                                            <span>{formatIssueAge(issue.createdAt)}</span>
                                            {issue.reporterName && <span>by {issue.reporterName}</span>}
                                            {issue.photoUrls && issue.photoUrls.length > 0 && (
                                              <span className="flex items-center gap-1">
                                                <CameraIcon className="w-3.5 h-3.5" />
                                                {issue.photoUrls.length}
                                              </span>
                                            )}
                                            {issue.projectDate && (
                                              <span className="flex items-center gap-1">
                                                <CalendarIcon className="w-3.5 h-3.5" />
                                                {parseLocalDate(issue.projectDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Modal>

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
    </>
  )
}
