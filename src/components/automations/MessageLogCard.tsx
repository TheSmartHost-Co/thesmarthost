'use client'

import { useEffect, useState } from 'react'
import { BoltIcon, ChatBubbleLeftEllipsisIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import type { MessageLogEntry } from '@/services/types/messageAutomation'

interface MessageLogCardProps {
  log: MessageLogEntry
  onReview: (log: MessageLogEntry) => void
  selected?: boolean
  onSelect?: (logId: string, checked: boolean) => void
  onSync?: (log: MessageLogEntry) => void
  syncing?: string | null
}

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string }> = {
  queued:          { label: 'Queued',          color: 'bg-amber-100 text-amber-700' },
  escalated:       { label: 'Escalated',       color: 'bg-red-100 text-red-700' },
  auto_sent:       { label: 'Auto-sent',       color: 'bg-green-100 text-green-700' },
  pm_approved:     { label: 'Approved',        color: 'bg-blue-100 text-blue-700' },
  pm_edited_sent:  { label: 'Sent (edited)',   color: 'bg-blue-100 text-blue-700' },
  dismissed:       { label: 'Dismissed',       color: 'bg-gray-100 text-gray-500' },
  skipped:         { label: 'Skipped',         color: 'bg-gray-100 text-gray-500' },
  failed:          { label: 'Failed',          color: 'bg-red-100 text-red-700' },
  pending:         { label: 'Processing...',   color: 'bg-yellow-100 text-yellow-700' },
  host_responded:  { label: 'Host Responded',  color: 'bg-emerald-100 text-emerald-700' },
}

// ─── Border color by status ───────────────────────────────────────────────────

function borderColor(status: string): string {
  switch (status) {
    case 'queued':         return 'border-amber-200'
    case 'escalated':      return 'border-red-200'
    case 'auto_sent':      return 'border-green-200'
    case 'host_responded': return 'border-emerald-200'
    default:               return 'border-gray-200'
  }
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: MessageLogEntry['aiConfidence'] }) {
  if (!confidence) return null

  const config = {
    high:   { dot: 'bg-green-500', label: 'High confidence' },
    medium: { dot: 'bg-amber-400', label: 'Medium confidence' },
    low:    { dot: 'bg-red-400',   label: 'Low confidence' },
  }[confidence]

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
      {config.label}
    </span>
  )
}

// ─── Relative time ────────────────────────────────────────────────────────────

function useRelativeTime(timestamp: string) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    function compute() {
      const diffMs  = Date.now() - new Date(timestamp).getTime()
      const mins    = Math.floor(diffMs / 60_000)
      const hours   = Math.floor(diffMs / 3_600_000)
      const days    = Math.floor(diffMs / 86_400_000)

      if (diffMs < 60_000)    return 'Just now'
      if (mins  < 60)         return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`
      if (hours < 24)         return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
      // Older than 24 h → formatted date
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    }

    setLabel(compute())
    const id = setInterval(() => setLabel(compute()), 60_000)
    return () => clearInterval(id)
  }, [timestamp])

  return label
}

// ─── Platform badge ───────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700 capitalize">
      {platform}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MessageLogCard({ log, onReview, selected, onSelect, onSync, syncing }: MessageLogCardProps) {
  const timeLabel   = useRelativeTime(log.incomingMessageAt)
  const status      = statusConfig[log.status] ?? statusConfig.pending
  const preview     = log.incomingMessage.length > 120
    ? `${log.incomingMessage.slice(0, 120)}…`
    : log.incomingMessage

  return (
    <div
      onClick={() => onReview(log)}
      className={`bg-white border rounded-xl p-4 transition-shadow hover:shadow-md cursor-pointer ${
        selected ? 'border-blue-400 bg-blue-50/30' : borderColor(log.status)
      }`}
    >
      {/* Checkbox for bulk selection */}
      {onSelect && (
        <div className="float-left mr-3 mt-0.5">
          <input
            type="checkbox"
            checked={selected || false}
            onChange={(e) => { e.stopPropagation(); onSelect(log.id, e.target.checked) }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      )}
      {/* ── Row 1: guest · property · platform ── */}
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {log.guestName || 'Unknown guest'}
          </h3>
          {log.listingName && (
            <span className="text-xs text-gray-400 truncate hidden sm:block">
              {log.listingName}
            </span>
          )}
          <PlatformBadge platform={log.platform} />
        </div>

        {/* Confidence — top right */}
        <ConfidenceBadge confidence={log.aiConfidence} />
      </div>

      {/* ── Row 2: message preview ── */}
      <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2">
        {preview}
      </p>

      {/* ── Row 3: topic · timestamp · status · action ── */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: topic + timestamp */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-gray-400 flex-shrink-0">{timeLabel}</span>
          {log.aiTopic && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 truncate max-w-36">
              {log.aiTopic}
            </span>
          )}
        </div>

        {/* Right: status badge + optional action button */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
            {status.label}
          </span>

          {log.status === 'queued' && (
            <button
              onClick={(e) => { e.stopPropagation(); onReview(log) }}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <BoltIcon className="w-3.5 h-3.5" />
              Review
            </button>
          )}

          {log.status === 'escalated' && (
            <button
              onClick={(e) => { e.stopPropagation(); onReview(log) }}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5" />
              Respond
            </button>
          )}

          {onSync && (log.status === 'queued' || log.status === 'escalated') && (
            <button
              onClick={(e) => { e.stopPropagation(); onSync(log) }}
              disabled={syncing === log.id}
              className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              title="Sync conversation"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${syncing === log.id ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
