'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { BoltIcon, CogIcon, ArrowPathIcon, PlayIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getAutomationTasks,
  getAutomationTaskCounts,
  retryAutomationTask,
  triggerAutomationScan,
  triggerAutomationProcess,
  processOneAutomationTask,
} from '@/services/automationService'
import type { AutomationTask, AutomationTaskCounts, AutomationType } from '@/services/types/automation'
import AutomationTaskCard from '@/components/automations/AutomationTaskCard'
import ApproveTaskModal from '@/components/automations/ApproveTaskModal'
import AutomationSettingsPanel from '@/components/automations/AutomationSettingsPanel'
import ScanModal from '@/components/automations/ScanModal'

type StatusFilter = 'all' | 'awaiting_approval' | 'completed' | 'failed'

const pageMeta: Record<string, { title: string; description: string }> = {
  review_nudge: { title: 'Review Nudge', description: 'AI-generated messages encouraging guests to leave reviews' },
  guest_review: { title: 'Guest Review', description: 'AI-generated host reviews of guests after checkout' },
}

export default function AIAutomationsPage({ automationType }: { automationType?: AutomationType }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AIAutomationsContent fixedType={automationType} />
    </Suspense>
  )
}

function AIAutomationsContent({ fixedType }: { fixedType?: AutomationType }) {
  const searchParams = useSearchParams()
  const { showNotification } = useNotificationStore()
  const [tasks, setTasks] = useState<AutomationTask[]>([])
  const [counts, setCounts] = useState<AutomationTaskCounts>({ awaitingApproval: 0, upcoming: 0, completed: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedTask, setSelectedTask] = useState<AutomationTask | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null)
  const [processingAll, setProcessingAll] = useState(false)

  const typeFilter = fixedType || null
  const meta = typeFilter ? pageMeta[typeFilter] : null
  const pageTitle = meta?.title || 'AI Automations'
  const pageDescription = meta?.description || 'AI-generated reviews and messages for your guests'

  const fetchData = useCallback(async () => {
    try {
      let statusParam: string | undefined
      if (statusFilter === 'awaiting_approval') statusParam = 'awaiting_approval'
      else if (statusFilter === 'completed') statusParam = 'approved'
      else if (statusFilter === 'failed') statusParam = 'failed'

      const [tasksRes, countsRes] = await Promise.all([
        getAutomationTasks({ status: statusParam, type: typeFilter || undefined, limit: 50 }),
        getAutomationTaskCounts(typeFilter || undefined),
      ])

      if (tasksRes.status === 'success' && tasksRes.data) {
        let filtered = tasksRes.data
        if (statusFilter === 'completed') {
          const allRes = await getAutomationTasks({ type: typeFilter || undefined, limit: 50 })
          if (allRes.status === 'success' && allRes.data) {
            filtered = allRes.data.filter(t => t.status === 'approved' || t.status === 'sent')
          }
        }
        setTasks(filtered)
      }

      if (countsRes.status === 'success' && countsRes.data) {
        setCounts(countsRes.data)
      }
    } catch {
      showNotification('Failed to load automation tasks', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, showNotification])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Deep-link: open specific task from notification
  useEffect(() => {
    const taskId = searchParams.get('taskId')
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        setSelectedTask(task)
        setShowApproveModal(true)
      }
    }
  }, [searchParams, tasks])

  const handleReview = (task: AutomationTask) => {
    setSelectedTask(task)
    setShowApproveModal(true)
  }

  const handleRetry = async (task: AutomationTask) => {
    try {
      const res = await retryAutomationTask(task.id)
      if (res.status === 'success') {
        showNotification('Task queued for retry', 'info')
        fetchData()
      } else {
        showNotification(res.message || 'Failed to retry', 'error')
      }
    } catch {
      showNotification('Failed to retry task', 'error')
    }
  }

  const handleTaskUpdated = () => {
    fetchData()
  }

  const handleProcessOne = async (task: AutomationTask) => {
    setProcessingTaskId(task.id)
    try {
      const res = await processOneAutomationTask(task.id)
      if (res.status === 'success') {
        showNotification('Task processed — ready for approval', 'success')
        fetchData()
      } else {
        showNotification(res.message || 'Failed to process', 'error')
      }
    } catch {
      showNotification('Failed to process task', 'error')
    } finally {
      setProcessingTaskId(null)
    }
  }

  const handleProcessAll = async () => {
    const pendingTasks = tasks.filter(t => t.status === 'pending')
    if (pendingTasks.length === 0) {
      showNotification('No scheduled tasks to process', 'info')
      return
    }
    setProcessingAll(true)
    let processed = 0
    let failed = 0
    for (const task of pendingTasks) {
      try {
        const res = await processOneAutomationTask(task.id)
        if (res.status === 'success') processed++
        else failed++
      } catch {
        failed++
      }
    }
    showNotification(`Processed ${processed} task${processed !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`, processed > 0 ? 'success' : 'error')
    fetchData()
    setProcessingAll(false)
  }

  const handleRunScan = async (startDate: string, endDate: string) => {
    setScanning(true)
    try {
      // Step 1: Scan for checkouts
      const scanRes = await triggerAutomationScan({ startDate, endDate })
      if (scanRes.status === 'success') {
        showNotification(scanRes.message || 'Scan complete', 'success')
      } else {
        showNotification(scanRes.message || 'Scan failed', 'error')
        setScanning(false)
        return
      }

      // Step 2: Process any due tasks (generate AI content)
      const processRes = await triggerAutomationProcess()
      if (processRes.status === 'success') {
        showNotification(processRes.message || 'Processing complete', 'success')
      } else {
        showNotification(processRes.message || 'Processing failed', 'error')
      }

      fetchData()
      setShowScanModal(false)
    } catch {
      showNotification('Scan failed', 'error')
    } finally {
      setScanning(false)
    }
  }

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.awaitingApproval + counts.upcoming + counts.completed + counts.failed },
    { key: 'awaiting_approval', label: 'Awaiting Approval', count: counts.awaitingApproval },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'failed', label: 'Failed', count: counts.failed },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-amber-500 rounded-xl flex items-center justify-center">
            <BoltIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-sm text-gray-500">{pageDescription}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Run Scan
          </button>
          {counts.upcoming > 0 && (
            <button
              onClick={handleProcessAll}
              disabled={processingAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {processingAll ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              {processingAll ? 'Processing...' : 'Process All'}
            </button>
          )}
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
      <div className="grid grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Awaiting Approval" count={counts.awaitingApproval} color="amber" />
        <SummaryCard label="Upcoming" count={counts.upcoming} color="blue" />
        <SummaryCard label="Completed" count={counts.completed} color="green" />
        <SummaryCard label="Failed" count={counts.failed} color="red" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 mb-4">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === tab.key ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <BoltIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {statusFilter === 'all' ? `No ${typeFilter ? pageMeta[typeFilter]?.title.toLowerCase() : 'automation'} tasks yet` : `No ${statusFilter.replace('_', ' ')} tasks`}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {statusFilter === 'all'
              ? 'Enable automations in Settings and tasks will appear here after guests check out.'
              : 'Tasks with this status will appear here.'}
          </p>
          {statusFilter === 'all' && (
            <button
              onClick={() => setShowSettings(true)}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Open Settings
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <AutomationTaskCard
              key={task.id}
              task={task}
              onReview={handleReview}
              onRetry={handleRetry}
              onProcess={handleProcessOne}
              processingTaskId={processingTaskId}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ApproveTaskModal
        isOpen={showApproveModal}
        task={selectedTask}
        onClose={() => { setShowApproveModal(false); setSelectedTask(null) }}
        onTaskUpdated={handleTaskUpdated}
        onProcess={handleProcessOne}
      />

      <AutomationSettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <ScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onScan={(startDate, endDate) => handleRunScan(startDate, endDate)}
        scanning={scanning}
      />
    </div>
  )
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }

  return (
    <div className={`px-4 py-3 rounded-xl border ${colorClasses[color] || colorClasses.blue}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-[11px] font-medium opacity-75">{label}</div>
    </div>
  )
}
