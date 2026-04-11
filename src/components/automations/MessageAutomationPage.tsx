'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  BoltIcon,
  CogIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getMessageLog, getMessageLogCounts } from '@/services/messageAutomationService'
import type { MessageLogEntry, MessageLogCounts } from '@/services/types/messageAutomation'
import MessageLogCard from '@/components/automations/MessageLogCard'
import MessageDetailModal from '@/components/automations/MessageDetailModal'
import MessageAutomationSettingsPanel from '@/components/automations/MessageAutomationSettingsPanel'
import AIConversationLogs from '@/components/automations/AIConversationLogs'

type StatusFilter = 'all' | 'queued' | 'escalated' | 'auto_sent' | 'failed'

export default function MessageAutomationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MessageAutomationContent />
    </Suspense>
  )
}

function MessageAutomationContent() {
  const searchParams = useSearchParams()
  const { showNotification } = useNotificationStore()

  const [logs, setLogs] = useState<MessageLogEntry[]>([])
  const [counts, setCounts] = useState<MessageLogCounts>({
    queued: 0,
    escalated: 0,
    autoSent: 0,
    failed: 0,
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedLog, setSelectedLog] = useState<MessageLogEntry | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAILogs, setShowAILogs] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let statusParam: string | undefined
      if (statusFilter === 'queued') statusParam = 'queued'
      else if (statusFilter === 'escalated') statusParam = 'escalated'
      else if (statusFilter === 'auto_sent') statusParam = 'auto_sent'
      else if (statusFilter === 'failed') statusParam = 'failed'

      const [logsRes, countsRes] = await Promise.all([
        getMessageLog({ status: statusParam, limit: 50 }),
        getMessageLogCounts(),
      ])

      if (logsRes.status === 'success' && logsRes.data) {
        setLogs(logsRes.data)
      }

      if (countsRes.status === 'success' && countsRes.data) {
        setCounts(countsRes.data)
      }
    } catch {
      showNotification('Failed to load message logs', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, showNotification])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Deep-link: open detail modal when ?logId= is present
  useEffect(() => {
    const logId = searchParams.get('logId')
    if (logId && logs.length > 0) {
      const found = logs.find(l => l.id === logId)
      if (found) {
        setSelectedLog(found)
        setShowDetailModal(true)
      }
    }
  }, [searchParams, logs])

  const handleSelectLog = (log: MessageLogEntry) => {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  const handleLogUpdated = () => {
    fetchData()
  }

  const totalCount =
    counts.queued + counts.escalated + counts.autoSent + counts.failed

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'queued', label: 'Queued', count: counts.queued },
    { key: 'escalated', label: 'Escalated', count: counts.escalated },
    { key: 'auto_sent', label: 'Auto-Sent', count: counts.autoSent },
    { key: 'failed', label: 'Failed', count: counts.failed },
  ]

  const emptyStateMessage =
    statusFilter === 'all'
      ? 'No message logs yet'
      : `No ${statusFilter.replace('_', '-')} messages`

  const emptyStateHint =
    statusFilter === 'all'
      ? 'Enable message automation in Settings to start auto-replying to guest messages.'
      : 'Messages with this status will appear here.'

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        href="/property-manager/ai-automations/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        Automation Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Message Automation</h1>
            <p className="text-sm text-gray-500">
              AI-powered auto-replies and escalation for guest messages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* AI Logs toggle */}
          <button
            onClick={() => setShowAILogs(prev => !prev)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showAILogs
                ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ClipboardDocumentListIcon className="w-4 h-4" />
            {showAILogs ? 'Action View' : 'AI Logs'}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            <CogIcon className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Queued for Review" count={counts.queued} color="amber" />
        <SummaryCard label="Escalated" count={counts.escalated} color="red" />
        <SummaryCard label="Auto-Sent" count={counts.autoSent} color="green" />
        <SummaryCard label="Failed" count={counts.failed} color="rose" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
              statusFilter === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusFilter === tab.key
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {showAILogs ? (
        <AIConversationLogs />
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <BoltIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{emptyStateMessage}</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">{emptyStateHint}</p>
          {statusFilter === 'all' && (
            <button
              onClick={() => setShowSettings(true)}
              className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Open Settings
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {logs.map(log => (
            <MessageLogCard key={log.id} log={log} onReview={handleSelectLog} />
          ))}
        </div>
      )}

      {/* Modals */}
      <MessageDetailModal
        isOpen={showDetailModal}
        log={selectedLog}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedLog(null)
        }}
        onUpdated={handleLogUpdated}
      />

      <MessageAutomationSettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}

function SummaryCard({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: string
}) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
  }

  return (
    <div className={`px-4 py-3 rounded-xl border ${colorClasses[color] ?? colorClasses.blue}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-[11px] font-medium opacity-75">{label}</div>
    </div>
  )
}
