'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { ArrowUpIcon } from '@heroicons/react/24/solid'
import {
  acknowledgeIssue,
  resolveIssue,
  deleteIssue,
  getPhotoPublicUrl,
  getIssueTypeDisplay,
  getIssueStatusDisplay,
  downloadIssuePhotoWatermarked
} from '@/services/projectIssueService'
import { getNotesByIssue, createIssueNote } from '@/services/projectIssueNoteService'
import type { ProjectIssue, IssueType, IssueStatus } from '@/services/types/projectIssue'
import type { IssueNote } from '@/services/types/projectIssueNote'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { usePermissions } from '@/hooks/usePermissions'

const ISSUE_TYPE_ICONS: Record<IssueType, React.ComponentType<{ className?: string }>> = {
  damage: ExclamationTriangleIcon,
  missing_item: QuestionMarkCircleIcon,
  maintenance: WrenchScrewdriverIcon,
  other: DocumentTextIcon
}

const STATUS_COLORS: Record<IssueStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-red-100', text: 'text-red-700' },
  acknowledged: { bg: 'bg-amber-100', text: 'text-amber-700' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700' }
}

interface IssueDetailPanelProps {
  issue: ProjectIssue
  isPM?: boolean
  onIssueUpdated?: (updated: ProjectIssue) => void
  onIssueDeleted?: (issueId: string) => void
  onViewed?: () => void
}

export default function IssueDetailPanel({
  issue,
  isPM = true,
  onIssueUpdated,
  onIssueDeleted,
  onViewed,
}: IssueDetailPanelProps) {
  const [notes, setNotes] = useState<IssueNote[]>([])
  const [noteText, setNoteText] = useState('')
  const [notesLoading, setNotesLoading] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPhotoViewer, setShowPhotoViewer] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isDownloadingPhoto, setIsDownloadingPhoto] = useState(false)
  const notesEndRef = useRef<HTMLDivElement>(null)

  const showNotification = useNotificationStore((state) => state.showNotification)
  const { effectiveUserId: userId } = usePermissions()

  const fetchNotes = useCallback(async () => {
    setNotesLoading(true)
    try {
      const res = await getNotesByIssue(issue.id)
      if (res.status === 'success') {
        setNotes(res.data)
      }
    } catch (err) {
      console.error('Error fetching notes:', err)
    } finally {
      setNotesLoading(false)
    }
  }, [issue.id])

  useEffect(() => {
    fetchNotes()
    setNoteText('')
  }, [fetchNotes])

  // Mark related notifications as read when issue is viewed
  useEffect(() => {
    onViewed?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue.id])

  // Auto-scroll notes
  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  const handlePublish = async () => {
    if (!userId || !noteText.trim()) return
    setPublishLoading(true)
    try {
      const res = await createIssueNote(issue.id, {
        authorId: userId,
        body: noteText.trim()
      })
      if (res.status === 'success') {
        setNotes(prev => [...prev, res.data])
        setNoteText('')
      } else {
        showNotification(res.message || 'Failed to post note', 'error')
      }
    } catch {
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

  const handleAcknowledge = async () => {
    setActionLoading(true)
    try {
      const res = await acknowledgeIssue(issue.id)
      if (res.status === 'success') {
        showNotification('Issue acknowledged', 'success')
        onIssueUpdated?.(res.data)
      } else {
        showNotification(res.message || 'Failed to acknowledge', 'error')
      }
    } catch {
      showNotification('Failed to acknowledge issue', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolve = async () => {
    setActionLoading(true)
    try {
      const res = await resolveIssue(issue.id)
      if (res.status === 'success') {
        showNotification('Issue resolved', 'success')
        onIssueUpdated?.(res.data)
      } else {
        showNotification(res.message || 'Failed to resolve', 'error')
      }
    } catch {
      showNotification('Failed to resolve issue', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this issue?')) return
    setActionLoading(true)
    try {
      const res = await deleteIssue(issue.id)
      if (res.status === 'success') {
        showNotification('Issue deleted', 'success')
        onIssueDeleted?.(issue.id)
      } else {
        showNotification(res.message || 'Failed to delete', 'error')
      }
    } catch {
      showNotification('Failed to delete issue', 'error')
    } finally {
      setActionLoading(false)
    }
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
    <div className="space-y-4">
      {/* Type & Status */}
      <div className="flex items-center gap-3">
        <span className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
          ${getIssueTypeDisplay(issue.issueType).color === 'red' ? 'bg-red-100 text-red-700' : ''}
          ${getIssueTypeDisplay(issue.issueType).color === 'amber' ? 'bg-amber-100 text-amber-700' : ''}
          ${getIssueTypeDisplay(issue.issueType).color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
          ${getIssueTypeDisplay(issue.issueType).color === 'purple' ? 'bg-purple-100 text-purple-700' : ''}
          ${getIssueTypeDisplay(issue.issueType).color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
        `}>
          {React.createElement(ISSUE_TYPE_ICONS[issue.issueType], { className: 'w-4 h-4' })}
          {getIssueTypeDisplay(issue.issueType).label}
        </span>
        <span className={`
          px-3 py-1.5 rounded-lg text-sm font-medium
          ${STATUS_COLORS[issue.status].bg}
          ${STATUS_COLORS[issue.status].text}
        `}>
          {getIssueStatusDisplay(issue.status).label}
        </span>
      </div>

      {/* Reporter */}
      {issue.reporterName && (
        <div className="text-sm text-gray-600">
          Reported by <span className="font-medium">{issue.reporterName}</span>
        </div>
      )}

      {/* Description */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-gray-800 whitespace-pre-wrap">{issue.description}</p>
      </div>

      {/* Photos */}
      {issue.photoUrls.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Photos ({issue.photoUrls.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {issue.photoUrls.map((url, index) => (
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
      {isPM && issue.status !== 'resolved' && (
        <div className="border-t pt-4">
          <div className="flex gap-3">
            {issue.status === 'open' && (
              <button
                onClick={handleAcknowledge}
                disabled={actionLoading}
                className="flex-1 py-2.5 px-4 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ClockIcon className="w-5 h-5" />
                Acknowledge
              </button>
            )}
            <button
              onClick={handleResolve}
              disabled={actionLoading}
              className="flex-1 py-2.5 px-4 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Mark Resolved
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="py-2.5 px-4 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Resolved Info */}
      {issue.status === 'resolved' && issue.resolvedAt && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircleIcon className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-medium text-green-700">Resolved</p>
            <p className="text-sm text-green-600">
              {new Date(issue.resolvedAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {showPhotoViewer && issue.photoUrls.length > 0 && (
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
          <button
            onClick={async (e) => {
              e.stopPropagation()
              if (isDownloadingPhoto) return
              setIsDownloadingPhoto(true)
              try {
                await downloadIssuePhotoWatermarked(issue.id, currentPhotoIndex)
              } catch (err) {
                console.error('Download failed:', err)
              } finally {
                setIsDownloadingPhoto(false)
              }
            }}
            disabled={isDownloadingPhoto}
            className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isDownloadingPhoto ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="w-4 h-4" />
            )}
            Download with Timestamp
          </button>
          <img
            src={getPhotoPublicUrl(issue.photoUrls[currentPhotoIndex])}
            alt="Issue photo"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {issue.photoUrls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {issue.photoUrls.map((_, index) => (
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
  )
}
