'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDownIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { getMessageLog } from '@/services/messageAutomationService'
import type { MessageLogEntry } from '@/services/types/messageAutomation'

// ─── Status config (matches MessageLogCard) ───────────────────────────────────

const statusConfig: Record<string, { label: string; color: string }> = {
  queued:         { label: 'Queued',         color: 'bg-amber-100 text-amber-700' },
  escalated:      { label: 'Escalated',      color: 'bg-red-100 text-red-700' },
  auto_sent:      { label: 'Auto-sent',      color: 'bg-green-100 text-green-700' },
  pm_approved:    { label: 'Approved',       color: 'bg-blue-100 text-blue-700' },
  pm_edited_sent: { label: 'Sent (edited)',  color: 'bg-blue-100 text-blue-700' },
  dismissed:      { label: 'Dismissed',      color: 'bg-gray-100 text-gray-500' },
  skipped:        { label: 'Skipped',        color: 'bg-gray-100 text-gray-500' },
  failed:         { label: 'Failed',         color: 'bg-red-100 text-red-700' },
  pending:        { label: 'Processing…',    color: 'bg-yellow-100 text-yellow-700' },
  host_responded: { label: 'Host Responded', color: 'bg-emerald-100 text-emerald-700' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function truncate(text: string, maxLen = 80): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

// ─── Confidence dot ───────────────────────────────────────────────────────────

function ConfidenceDot({ confidence }: { confidence: MessageLogEntry['aiConfidence'] }) {
  if (!confidence) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
        <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
        —
      </span>
    )
  }

  const config = {
    high:   { dot: 'bg-green-500',  label: 'High' },
    medium: { dot: 'bg-amber-500',  label: 'Medium' },
    low:    { dot: 'bg-red-500',    label: 'Low' },
  }[confidence]

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
      {config.label}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.pending
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ─── Expanded detail section ──────────────────────────────────────────────────

function ExpandedDetail({ log }: { log: MessageLogEntry }) {
  const [showPrompt, setShowPrompt] = useState(false)

  const confidenceColors = {
    high:   'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-red-100 text-red-700',
  }
  const confidenceCls = log.aiConfidence
    ? confidenceColors[log.aiConfidence]
    : 'bg-gray-100 text-gray-500'

  return (
    <div className="bg-gray-50 px-4 py-4 border-b border-gray-200">
      <div className="max-w-3xl space-y-4">

        {/* 1. Full Incoming Message */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Full Incoming Message
          </p>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {log.incomingMessage}
            </p>
          </div>
        </div>

        {/* 2. AI Response */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            AI Response
          </p>
          {log.aiResponse ? (
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {log.aiResponse}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No reply generated (low confidence)
            </p>
          )}
        </div>

        {/* 3. Confidence + Reasoning */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Confidence
            </p>
            {log.aiConfidence && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${confidenceCls}`}>
                {log.aiConfidence}
              </span>
            )}
          </div>
          {log.aiReasoning ? (
            <p className="text-sm text-gray-600 leading-relaxed">
              {log.aiReasoning}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">No reasoning provided</p>
          )}
        </div>

        {/* 4. Topic */}
        {log.aiTopic && (
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Topic
            </p>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
              {log.aiTopic}
            </span>
          </div>
        )}

        {/* 5. Suggested Action */}
        {log.aiSuggestedAction && (
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Suggested Action
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <p className="text-sm text-blue-800 leading-relaxed">
                {log.aiSuggestedAction}
              </p>
            </div>
          </div>
        )}

        {/* 6. AI Prompt (collapsible) */}
        {log.aiPromptUsed && (
          <div>
            <button
              onClick={() => setShowPrompt(prev => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showPrompt
                ? <ChevronDownIcon className="w-3.5 h-3.5" />
                : <ChevronRightIcon className="w-3.5 h-3.5" />
              }
              {showPrompt ? 'Hide AI Prompt' : 'View Full AI Prompt'}
            </button>
            {showPrompt && (
              <div className="mt-2">
                <pre className="text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap font-mono leading-relaxed">
                  {log.aiPromptUsed}
                </pre>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Collapsed row ────────────────────────────────────────────────────────────

function LogRow({
  log,
  isExpanded,
  onToggle,
}: {
  log: MessageLogEntry
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      {/* Collapsed row */}
      <div
        onClick={onToggle}
        className="border-b border-gray-100 py-3 px-4 hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Expand indicator */}
          <span className="flex-shrink-0 text-gray-400">
            {isExpanded
              ? <ChevronDownIcon className="w-4 h-4" />
              : <ChevronRightIcon className="w-4 h-4" />
            }
          </span>

          {/* Timestamp */}
          <span className="text-xs text-gray-500 flex-shrink-0 w-32 hidden sm:block">
            {formatTimestamp(log.incomingMessageAt)}
          </span>

          {/* Guest + Property */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-sm font-medium text-gray-900 truncate">
              {log.guestName || 'Unknown Guest'}
            </span>
            <span className="text-gray-300 flex-shrink-0 hidden sm:block">·</span>
            <span className="text-xs text-gray-500 truncate hidden sm:block">
              {log.listingName || 'Unknown Property'}
            </span>
          </div>

          {/* Message preview */}
          <p className="text-xs text-gray-500 truncate flex-[2] hidden md:block">
            {truncate(log.incomingMessage, 80)}
          </p>

          {/* Confidence + Status */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            <ConfidenceDot confidence={log.aiConfidence} />
            <StatusBadge status={log.status} />
          </div>
        </div>

        {/* Mobile: timestamp + preview on second line */}
        <div className="mt-1.5 sm:hidden pl-6">
          <span className="text-[11px] text-gray-400 block">
            {formatTimestamp(log.incomingMessageAt)}
          </span>
          <p className="text-xs text-gray-500 truncate">
            {truncate(log.incomingMessage, 60)}
          </p>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && <ExpandedDetail log={log} />}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIConversationLogs() {
  const [logs, setLogs] = useState<MessageLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Fetch on mount — no status filter, show ALL logs
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMessageLog({ limit: 50 })
      .then(res => {
        if (!cancelled && res.status === 'success' && res.data) {
          setLogs(res.data)
        }
      })
      .catch(err => {
        console.error('AIConversationLogs: failed to load', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Client-side filtering
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (confidenceFilter !== 'all' && log.aiConfidence !== confidenceFilter) return false
      if (statusFilter === 'all') return true
      // Map display label back to raw status values
      const statusMap: Record<string, string[]> = {
        'auto-sent':      ['auto_sent'],
        queued:           ['queued'],
        escalated:        ['escalated'],
        approved:         ['pm_approved', 'pm_edited_sent'],
        failed:           ['failed'],
        dismissed:        ['dismissed'],
        skipped:          ['skipped'],
        'host-responded': ['host_responded'],
      }
      const allowed = statusMap[statusFilter] ?? [statusFilter]
      return allowed.includes(log.status)
    })
  }, [logs, confidenceFilter, statusFilter])

  // CSV export (client-side)
  const handleExport = () => {
    const csv = [
      'Timestamp,Guest,Property,Platform,Message,AI Response,Confidence,Reasoning,Topic,Status',
      ...filteredLogs.map(l => [
        l.incomingMessageAt,
        l.guestName || '',
        l.listingName || '',
        l.platform || '',
        `"${(l.incomingMessage || '').replace(/"/g, '""')}"`,
        `"${(l.aiResponse || '').replace(/"/g, '""')}"`,
        l.aiConfidence || '',
        `"${(l.aiReasoning || '').replace(/"/g, '""')}"`,
        l.aiTopic || '',
        l.status,
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'message-automation-logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleToggleRow = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">AI Conversation Logs</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Complete transparency into every AI decision
        </p>
      </div>

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
        {/* Confidence filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 font-medium">Confidence:</label>
          <select
            value={confidenceFilter}
            onChange={e => setConfidenceFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="all">All</option>
            <option value="auto-sent">Auto-sent</option>
            <option value="queued">Queued</option>
            <option value="escalated">Escalated</option>
            <option value="approved">Approved</option>
            <option value="failed">Failed</option>
            <option value="dismissed">Dismissed</option>
            <option value="skipped">Skipped</option>
            <option value="host-responded">Host Responded</option>
          </select>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export CSV */}
        <button
          onClick={handleExport}
          disabled={filteredLogs.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* ── Column headers (desktop) ── */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div className="w-4 flex-shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-32 flex-shrink-0">Timestamp</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 flex-1">Guest · Property</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 flex-[2] hidden md:block">Message</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 flex-shrink-0 w-20">Confidence</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 flex-shrink-0 w-24">Status</span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 px-4">
          <p className="text-sm font-medium text-gray-600 mb-1">No logs found</p>
          <p className="text-xs text-gray-400">
            {logs.length === 0
              ? 'No AI interactions have been recorded yet.'
              : 'Try adjusting the filters above.'}
          </p>
        </div>
      ) : (
        <div>
          {filteredLogs.map(log => (
            <LogRow
              key={log.id}
              log={log}
              isExpanded={expandedId === log.id}
              onToggle={() => handleToggleRow(log.id)}
            />
          ))}
        </div>
      )}

      {/* ── Footer count ── */}
      {!loading && filteredLogs.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
          <p className="text-[11px] text-gray-400">
            Showing {filteredLogs.length} of {logs.length} log{logs.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
