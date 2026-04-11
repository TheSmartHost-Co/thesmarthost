'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import {
  getIssuesByProject,
  formatIssueAge,
  getIssueTypeDisplay,
  getIssueStatusDisplay
} from '@/services/projectIssueService'
import type { ProjectIssue, IssueType, IssueStatus } from '@/services/types/projectIssue'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  PhotoIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import IssueDetailPanel from './IssueDetailPanel'
import { useUnreadIssueIds } from '@/hooks/useUnreadIssueIds'
import { motion, AnimatePresence } from 'framer-motion'

interface ViewIssuesModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName?: string
  isPM?: boolean // Property Manager view vs Cleaner view
  onReportIssue?: () => void // Callback to open report modal
  onIssuesChanged?: () => void // Callback when issues are updated
}

const ISSUE_TYPE_ICONS: Record<IssueType, React.ComponentType<{ className?: string }>> = {
  damage: ExclamationTriangleIcon,
  missing_item: QuestionMarkCircleIcon,
  maintenance: WrenchScrewdriverIcon,
  other: DocumentTextIcon
}

const STATUS_COLORS: Record<IssueStatus, { bg: string; text: string; border: string }> = {
  open: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  acknowledged: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' }
}

const ViewIssuesModal: React.FC<ViewIssuesModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  isPM = true,
  onReportIssue,
  onIssuesChanged
}) => {
  const { t } = useTranslation('turnover')
  const [issues, setIssues] = useState<ProjectIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<ProjectIssue | null>(null)
  const [filterStatus, setFilterStatus] = useState<IssueStatus | 'all'>('all')
  const { unreadIssueIds, markIssueAsRead } = useUnreadIssueIds(isOpen)

  const showNotification = useNotificationStore((state) => state.showNotification)

  const fetchIssues = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const res = await getIssuesByProject(projectId)
      if (res.status === 'success') {
        setIssues(res.data)
      } else {
        showNotification(res.message || t('failedToLoadIssues'), 'error')
      }
    } catch (err) {
      console.error('Error fetching issues:', err)
      showNotification(t('failedToLoadIssues'), 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, showNotification])

  useEffect(() => {
    if (isOpen && projectId) {
      fetchIssues()
    }
  }, [isOpen, projectId, fetchIssues])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedIssue(null)
      setFilterStatus('all')
    }
  }, [isOpen])

  const filteredIssues = filterStatus === 'all'
    ? issues
    : issues.filter(i => i.status === filterStatus)

  const statusCounts = {
    all: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    acknowledged: issues.filter(i => i.status === 'acknowledged').length,
    resolved: issues.filter(i => i.status === 'resolved').length
  }

  const handleIssueUpdated = (updated: ProjectIssue) => {
    setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
    setSelectedIssue(updated)
    onIssuesChanged?.()
  }

  const handleIssueDeleted = (issueId: string) => {
    setIssues(prev => prev.filter(i => i.id !== issueId))
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
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
                <ExclamationTriangleIcon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedIssue ? t('issueDescription') : t('viewIssuesTitle')}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedIssue
                  ? `${t('reportedBy')} ${formatIssueAge(selectedIssue.createdAt)}`
                  : projectName || t('issueCountLabel', { count: issues.length })
                }
              </p>
            </div>
          </div>

          {!selectedIssue && onReportIssue && (
            <button
              onClick={onReportIssue}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              {t('reportIssue')}
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {selectedIssue ? (
            // Issue Detail View
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <IssueDetailPanel
                issue={selectedIssue}
                isPM={isPM}
                onIssueUpdated={handleIssueUpdated}
                onIssueDeleted={handleIssueDeleted}
                onViewed={() => markIssueAsRead(selectedIssue.id)}
              />
            </motion.div>
          ) : (
            // Issues List View
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
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {status === 'all' ? t('all') : getIssueStatusDisplay(status).label}
                    <span className="ml-1.5 text-xs opacity-60">
                      ({statusCounts[status]})
                    </span>
                  </button>
                ))}
              </div>

              {/* Issues List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="text-center py-12">
                  <ExclamationTriangleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {filterStatus === 'all' ? t('noIssuesForProject') : t('noIssuesFound')}
                  </p>
                  {onReportIssue && filterStatus === 'all' && (
                    <button
                      onClick={onReportIssue}
                      className="mt-4 text-amber-600 font-medium hover:text-amber-700"
                    >
                      {t('reportIssue')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {filteredIssues.map((issue) => {
                    const Icon = ISSUE_TYPE_ICONS[issue.issueType]
                    const typeInfo = getIssueTypeDisplay(issue.issueType)
                    const statusColors = STATUS_COLORS[issue.status]

                    return (
                      <button
                        key={issue.id}
                        onClick={() => setSelectedIssue(issue)}
                        className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`
                            p-2 rounded-lg
                            ${typeInfo.color === 'red' ? 'bg-red-100 text-red-600' : ''}
                            ${typeInfo.color === 'amber' ? 'bg-amber-100 text-amber-600' : ''}
                            ${typeInfo.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                            ${typeInfo.color === 'purple' ? 'bg-purple-100 text-purple-600' : ''}
                            ${typeInfo.color === 'gray' ? 'bg-gray-100 text-gray-600' : ''}
                          `}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {typeInfo.label}
                              </span>
                              <span className={`
                                px-2 py-0.5 rounded text-xs font-medium
                                ${statusColors.bg} ${statusColors.text}
                              `}>
                                {getIssueStatusDisplay(issue.status).label}
                              </span>
                              {unreadIssueIds.has(issue.id) && (
                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {issue.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span>{formatIssueAge(issue.createdAt)}</span>
                              {issue.reporterName && (
                                <span>{t('byReporter', { name: issue.reporterName })}</span>
                              )}
                              {issue.photoUrls.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <PhotoIcon className="w-3.5 h-3.5" />
                                  {issue.photoUrls.length}
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
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </Modal>
  )
}

export default ViewIssuesModal
