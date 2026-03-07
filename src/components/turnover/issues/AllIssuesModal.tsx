'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/shared/modal'
import IssueDetailPanel from './IssueDetailPanel'
import {
  formatIssueAge,
  getIssueTypeDisplay,
  getIssueStatusDisplay
} from '@/services/projectIssueService'
import type { ProjectIssue, IssueType, IssueStatus } from '@/services/types/projectIssue'
import {
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  CubeIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  PhotoIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface AllIssuesModalProps {
  isOpen: boolean
  onClose: () => void
  issues: ProjectIssue[]
  loading?: boolean
  onIssuesChanged?: () => void
}

const ISSUE_TYPE_ICONS: Record<IssueType, React.ComponentType<{ className?: string }>> = {
  damage: ExclamationTriangleIcon,
  missing_item: QuestionMarkCircleIcon,
  maintenance: WrenchScrewdriverIcon,
  supply: CubeIcon,
  other: DocumentTextIcon
}

const STATUS_COLORS: Record<IssueStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-red-100', text: 'text-red-700' },
  acknowledged: { bg: 'bg-amber-100', text: 'text-amber-700' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700' }
}

export default function AllIssuesModal({
  isOpen,
  onClose,
  issues: propIssues,
  loading = false,
  onIssuesChanged,
}: AllIssuesModalProps) {
  const [localIssues, setLocalIssues] = useState<ProjectIssue[]>(propIssues)
  const [selectedIssue, setSelectedIssue] = useState<ProjectIssue | null>(null)
  const [filterStatus, setFilterStatus] = useState<IssueStatus | 'all'>('all')
  const [collapsedProperties, setCollapsedProperties] = useState<Set<string>>(new Set())

  // Sync from props
  useEffect(() => {
    setLocalIssues(propIssues)
  }, [propIssues])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedIssue(null)
      setFilterStatus('all')
      setCollapsedProperties(new Set())
    }
  }, [isOpen])

  const statusCounts = useMemo(() => ({
    all: localIssues.length,
    open: localIssues.filter(i => i.status === 'open').length,
    acknowledged: localIssues.filter(i => i.status === 'acknowledged').length,
    resolved: localIssues.filter(i => i.status === 'resolved').length,
  }), [localIssues])

  const filteredIssues = useMemo(() =>
    filterStatus === 'all'
      ? localIssues
      : localIssues.filter(i => i.status === filterStatus),
    [localIssues, filterStatus]
  )

  // Group filtered issues by propertyName
  const groupedByProperty = useMemo(() => {
    const groups: Record<string, { propertyName: string; propertyId: string; issues: ProjectIssue[] }> = {}
    for (const issue of filteredIssues) {
      const key = issue.propertyId || 'unknown'
      if (!groups[key]) {
        groups[key] = {
          propertyName: issue.propertyName || 'Unknown Property',
          propertyId: key,
          issues: [],
        }
      }
      groups[key].issues.push(issue)
    }
    return Object.values(groups).sort((a, b) => a.propertyName.localeCompare(b.propertyName))
  }, [filteredIssues])

  const toggleProperty = (propertyId: string) => {
    setCollapsedProperties(prev => {
      const next = new Set(prev)
      if (next.has(propertyId)) {
        next.delete(propertyId)
      } else {
        next.add(propertyId)
      }
      return next
    })
  }

  const handleIssueUpdated = (updated: ProjectIssue) => {
    setLocalIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
    setSelectedIssue(updated)
    onIssuesChanged?.()
  }

  const handleIssueDeleted = (issueId: string) => {
    setLocalIssues(prev => prev.filter(i => i.id !== issueId))
    setSelectedIssue(null)
    onIssuesChanged?.()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} closable style="w-11/12 max-w-2xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {selectedIssue ? (
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
                <ExclamationTriangleIcon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedIssue ? 'Issue Details' : 'All Issues'}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedIssue
                  ? `${selectedIssue.propertyName || 'Unknown'} · ${formatIssueAge(selectedIssue.createdAt)}`
                  : `${statusCounts.open + statusCounts.acknowledged} open across ${groupedByProperty.length} ${groupedByProperty.length === 1 ? 'property' : 'properties'}`
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
            >
              <IssueDetailPanel
                issue={selectedIssue}
                isPM
                onIssueUpdated={handleIssueUpdated}
                onIssueDeleted={handleIssueDeleted}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Filter Tabs */}
              <div className="flex gap-2 mb-4 border-b border-gray-200 pb-3">
                {(['all', 'open', 'acknowledged', 'resolved'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${filterStatus === status
                        ? status === 'open' ? 'bg-red-100 text-red-700'
                        : status === 'acknowledged' ? 'bg-amber-100 text-amber-700'
                        : status === 'resolved' ? 'bg-green-100 text-green-700'
                        : 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {status === 'all' ? 'All' : getIssueStatusDisplay(status).label}
                    <span className="ml-1.5 text-xs opacity-60">
                      ({statusCounts[status]})
                    </span>
                  </button>
                ))}
              </div>

              {/* Issues grouped by property */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="text-center py-12">
                  <ExclamationTriangleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {filterStatus === 'all' ? 'No issues found' : `No ${filterStatus} issues`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto">
                  {groupedByProperty.map((group) => {
                    const isCollapsed = collapsedProperties.has(group.propertyId)
                    return (
                      <div key={group.propertyId}>
                        {/* Property Header */}
                        <button
                          onClick={() => toggleProperty(group.propertyId)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                          <span className="font-medium text-gray-900 text-sm">{group.propertyName}</span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {group.issues.length} issue{group.issues.length !== 1 ? 's' : ''}
                          </span>
                        </button>

                        {/* Issue Cards */}
                        {!isCollapsed && (
                          <div className="mt-2 space-y-2 pl-2">
                            {group.issues.map((issue) => {
                              const Icon = ISSUE_TYPE_ICONS[issue.issueType]
                              const typeInfo = getIssueTypeDisplay(issue.issueType)
                              const statusColors = STATUS_COLORS[issue.status]

                              return (
                                <button
                                  key={issue.id}
                                  onClick={() => setSelectedIssue(issue)}
                                  className="w-full text-left p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`
                                      p-1.5 rounded-lg
                                      ${typeInfo.color === 'red' ? 'bg-red-100 text-red-600' : ''}
                                      ${typeInfo.color === 'amber' ? 'bg-amber-100 text-amber-600' : ''}
                                      ${typeInfo.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                                      ${typeInfo.color === 'purple' ? 'bg-purple-100 text-purple-600' : ''}
                                      ${typeInfo.color === 'gray' ? 'bg-gray-100 text-gray-600' : ''}
                                    `}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-gray-900 text-sm">
                                          {typeInfo.label}
                                        </span>
                                        <span className={`
                                          px-2 py-0.5 rounded text-xs font-medium
                                          ${statusColors.bg} ${statusColors.text}
                                        `}>
                                          {getIssueStatusDisplay(issue.status).label}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600 line-clamp-1">
                                        {issue.description}
                                      </p>
                                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                                        <span>{formatIssueAge(issue.createdAt)}</span>
                                        {issue.reporterName && (
                                          <span>by {issue.reporterName}</span>
                                        )}
                                        {issue.photoUrls.length > 0 && (
                                          <span className="flex items-center gap-1">
                                            <PhotoIcon className="w-3.5 h-3.5" />
                                            {issue.photoUrls.length}
                                          </span>
                                        )}
                                        {issue.scheduledDate && (
                                          <span className="flex items-center gap-1">
                                            <CalendarIcon className="w-3.5 h-3.5" />
                                            {new Date(issue.scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}
