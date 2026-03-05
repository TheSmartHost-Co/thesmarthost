'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '@/components/shared/modal'
import {
  getIssuesByProject,
  acknowledgeIssue,
  resolveIssue,
  deleteIssue,
  getPhotoPublicUrl,
  formatIssueAge,
  getIssueTypeDisplay,
  getIssueStatusDisplay
} from '@/services/projectIssueService'
import { getNotesByIssue, createIssueNote } from '@/services/projectIssueNoteService'
import type { ProjectIssue, IssueType, IssueStatus } from '@/services/types/projectIssue'
import type { IssueNote } from '@/services/types/projectIssueNote'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  CubeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  TrashIcon,
  ChevronLeftIcon,
  PhotoIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { ArrowUpIcon } from '@heroicons/react/24/solid'
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
  supply: CubeIcon,
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
  const [issues, setIssues] = useState<ProjectIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<ProjectIssue | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPhotoViewer, setShowPhotoViewer] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [filterStatus, setFilterStatus] = useState<IssueStatus | 'all'>('all')

  // Notes state
  const [notes, setNotes] = useState<IssueNote[]>([])
  const [noteText, setNoteText] = useState('')
  const [notesLoading, setNotesLoading] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const notesEndRef = useRef<HTMLDivElement>(null)

  const showNotification = useNotificationStore((state) => state.showNotification)
  const userId = useUserStore((state) => state.profile?.id)

  const fetchIssues = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const res = await getIssuesByProject(projectId)
      if (res.status === 'success') {
        setIssues(res.data)
      } else {
        showNotification(res.message || 'Failed to load issues', 'error')
      }
    } catch (err) {
      console.error('Error fetching issues:', err)
      showNotification('Failed to load issues', 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, showNotification])

  const fetchNotes = useCallback(async (issueId: string) => {
    setNotesLoading(true)
    try {
      const res = await getNotesByIssue(issueId)
      if (res.status === 'success') {
        setNotes(res.data)
      }
    } catch (err) {
      console.error('Error fetching notes:', err)
    } finally {
      setNotesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && projectId) {
      fetchIssues()
    }
  }, [isOpen, projectId, fetchIssues])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedIssue(null)
      setNotes([])
      setNoteText('')
      setShowPhotoViewer(false)
      setFilterStatus('all')
    }
  }, [isOpen])

  // Fetch notes when selecting an issue
  useEffect(() => {
    if (selectedIssue) {
      fetchNotes(selectedIssue.id)
    } else {
      setNotes([])
      setNoteText('')
    }
  }, [selectedIssue, fetchNotes])

  // Auto-scroll notes to bottom
  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  const handlePublish = async () => {
    if (!selectedIssue || !userId || !noteText.trim()) return

    setPublishLoading(true)
    try {
      const res = await createIssueNote(selectedIssue.id, {
        authorId: userId,
        body: noteText.trim()
      })
      if (res.status === 'success') {
        setNotes(prev => [...prev, res.data])
        setNoteText('')
      } else {
        showNotification(res.message || 'Failed to post note', 'error')
      }
    } catch (err) {
      showNotification('Failed to post note', 'error')
    } finally {
      setPublishLoading(false)
    }
  }

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handlePublish()
    }
  }

  const handleAcknowledge = async (issue: ProjectIssue) => {
    setActionLoading(true)
    try {
      const res = await acknowledgeIssue(issue.id)
      if (res.status === 'success') {
        showNotification('Issue acknowledged', 'success')
        setIssues(prev => prev.map(i => i.id === issue.id ? res.data : i))
        setSelectedIssue(res.data)
        onIssuesChanged?.()
      } else {
        showNotification(res.message || 'Failed to acknowledge', 'error')
      }
    } catch (err) {
      showNotification('Failed to acknowledge issue', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolve = async (issue: ProjectIssue) => {
    setActionLoading(true)
    try {
      const res = await resolveIssue(issue.id)
      if (res.status === 'success') {
        showNotification('Issue resolved', 'success')
        setIssues(prev => prev.map(i => i.id === issue.id ? res.data : i))
        setSelectedIssue(res.data)
        onIssuesChanged?.()
      } else {
        showNotification(res.message || 'Failed to resolve', 'error')
      }
    } catch (err) {
      showNotification('Failed to resolve issue', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (issue: ProjectIssue) => {
    if (!confirm('Are you sure you want to delete this issue?')) return

    setActionLoading(true)
    try {
      const res = await deleteIssue(issue.id)
      if (res.status === 'success') {
        showNotification('Issue deleted', 'success')
        setIssues(prev => prev.filter(i => i.id !== issue.id))
        setSelectedIssue(null)
        onIssuesChanged?.()
      } else {
        showNotification(res.message || 'Failed to delete', 'error')
      }
    } catch (err) {
      showNotification('Failed to delete issue', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredIssues = filterStatus === 'all'
    ? issues
    : issues.filter(i => i.status === filterStatus)

  const statusCounts = {
    all: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    acknowledged: issues.filter(i => i.status === 'acknowledged').length,
    resolved: issues.filter(i => i.status === 'resolved').length
  }

  const formatNoteTime = (createdAt: string) => {
    const d = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
                {selectedIssue ? 'Issue Details' : 'Project Issues'}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedIssue
                  ? `Reported ${formatIssueAge(selectedIssue.createdAt)}`
                  : projectName || `${issues.length} issue${issues.length !== 1 ? 's' : ''}`
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
              Report Issue
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
              className="space-y-4"
            >
              {/* Type & Status */}
              <div className="flex items-center gap-3">
                <span className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                  ${getIssueTypeDisplay(selectedIssue.issueType).color === 'red' ? 'bg-red-100 text-red-700' : ''}
                  ${getIssueTypeDisplay(selectedIssue.issueType).color === 'amber' ? 'bg-amber-100 text-amber-700' : ''}
                  ${getIssueTypeDisplay(selectedIssue.issueType).color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                  ${getIssueTypeDisplay(selectedIssue.issueType).color === 'purple' ? 'bg-purple-100 text-purple-700' : ''}
                  ${getIssueTypeDisplay(selectedIssue.issueType).color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                `}>
                  {React.createElement(ISSUE_TYPE_ICONS[selectedIssue.issueType], { className: 'w-4 h-4' })}
                  {getIssueTypeDisplay(selectedIssue.issueType).label}
                </span>
                <span className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium
                  ${STATUS_COLORS[selectedIssue.status].bg}
                  ${STATUS_COLORS[selectedIssue.status].text}
                `}>
                  {getIssueStatusDisplay(selectedIssue.status).label}
                </span>
              </div>

              {/* Reporter */}
              {selectedIssue.reporterName && (
                <div className="text-sm text-gray-600">
                  Reported by <span className="font-medium">{selectedIssue.reporterName}</span>
                </div>
              )}

              {/* Description */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-800 whitespace-pre-wrap">{selectedIssue.description}</p>
              </div>

              {/* Photos */}
              {selectedIssue.photoUrls.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Photos ({selectedIssue.photoUrls.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedIssue.photoUrls.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentPhotoIndex(index)
                          setShowPhotoViewer(true)
                        }}
                        className="relative group"
                      >
                        <img
                          src={getPhotoPublicUrl(url)}
                          alt={`Issue photo ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <EyeIcon className="w-6 h-6 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Thread */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-700">
                    Notes {notes.length > 0 && `(${notes.length})`}
                  </h4>
                </div>

                {/* Notes list — scrollable chat bubbles */}
                <div className="max-h-[220px] overflow-y-auto space-y-2 mb-3 px-1">
                  {notesLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No notes yet. Start the conversation below.
                    </p>
                  ) : (
                    notes.map((note) => {
                      const isFromPM = note.authorType === 'pm'
                      return (
                        <div
                          key={note.id}
                          className={`flex ${isFromPM ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`
                              max-w-[80%] rounded-xl px-3.5 py-2.5
                              ${isFromPM
                                ? 'bg-amber-50 border border-amber-200'
                                : 'bg-gray-100 border border-gray-200'
                              }
                            `}
                          >
                            <div className={`flex items-center gap-2 mb-0.5 ${isFromPM ? 'justify-end' : ''}`}>
                              <span className={`text-xs font-medium ${isFromPM ? 'text-amber-700' : 'text-gray-600'}`}>
                                {note.authorName}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {formatNoteTime(note.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                              {note.body}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={notesEndRef} />
                </div>

                {/* Compose row */}
                {userId && (
                  <div className="flex items-end gap-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={handleNoteKeyDown}
                      placeholder="Type a note..."
                      rows={1}
                      className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none text-sm min-h-[38px] max-h-[80px]"
                      style={{ fieldSizing: 'content' } as React.CSSProperties}
                    />
                    <button
                      onClick={handlePublish}
                      disabled={publishLoading || !noteText.trim()}
                      className="p-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {publishLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ArrowUpIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* PM Actions */}
              {isPM && selectedIssue.status !== 'resolved' && (
                <div className="border-t pt-4">
                  <div className="flex gap-3">
                    {selectedIssue.status === 'open' && (
                      <button
                        onClick={() => handleAcknowledge(selectedIssue)}
                        disabled={actionLoading}
                        className="flex-1 py-2.5 px-4 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <ClockIcon className="w-5 h-5" />
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => handleResolve(selectedIssue)}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 px-4 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      Mark Resolved
                    </button>
                    <button
                      onClick={() => handleDelete(selectedIssue)}
                      disabled={actionLoading}
                      className="py-2.5 px-4 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Resolved Info */}
              {selectedIssue.status === 'resolved' && selectedIssue.resolvedAt && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700">Resolved</p>
                    <p className="text-sm text-green-600">
                      {new Date(selectedIssue.resolvedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
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
                    {status === 'all' ? 'All' : getIssueStatusDisplay(status).label}
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
                    {filterStatus === 'all' ? 'No issues reported' : `No ${filterStatus} issues`}
                  </p>
                  {onReportIssue && filterStatus === 'all' && (
                    <button
                      onClick={onReportIssue}
                      className="mt-4 text-amber-600 font-medium hover:text-amber-700"
                    >
                      Report an issue
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
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {issue.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
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

        {/* Photo Viewer Modal */}
        {showPhotoViewer && selectedIssue && selectedIssue.photoUrls.length > 0 && (
          <div
            className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center"
            onClick={() => setShowPhotoViewer(false)}
          >
            <button
              onClick={() => setShowPhotoViewer(false)}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            <img
              src={getPhotoPublicUrl(selectedIssue.photoUrls[currentPhotoIndex])}
              alt="Issue photo"
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {selectedIssue.photoUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {selectedIssue.photoUrls.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentPhotoIndex(index)
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      index === currentPhotoIndex ? 'bg-white' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ViewIssuesModal
