'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BoltIcon, CogIcon, ArrowPathIcon, PlayIcon, ChatBubbleLeftRightIcon, StarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getAutomationTasks,
  getAutomationTaskCounts,
  retryAutomationTask,
  triggerAutomationScan,
  triggerAutomationProcess,
  processOneAutomationTask,
  bulkApproveTasks,
  bulkRejectTasks,
  bulkDeleteTasks,
} from '@/services/automationService'
import type { AutomationTask, AutomationTaskCounts, AutomationType } from '@/services/types/automation'
import AutomationTaskCard from '@/components/automations/AutomationTaskCard'
import ApproveTaskModal from '@/components/automations/ApproveTaskModal'
import BulkActionBar from '@/components/automations/BulkActionBar'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const typeFilter = fixedType || null
  const isDashboard = !typeFilter
  const meta = typeFilter ? pageMeta[typeFilter] : null
  const pageTitle = meta?.title || 'AI Automations'
  const pageDescription = meta?.description || 'Overview of all AI-powered automations'

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

  const handleSelect = (taskId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(tasks.map(t => t.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds)
    const res = await bulkApproveTasks(ids)
    showNotification(res.message || 'Tasks approved', res.status === 'success' ? 'success' : 'error')
    setSelectedIds(new Set())
    fetchData()
  }

  const handleBulkReject = async () => {
    const ids = Array.from(selectedIds)
    const res = await bulkRejectTasks(ids)
    showNotification(res.message || 'Tasks rejected', res.status === 'success' ? 'success' : 'error')
    setSelectedIds(new Set())
    fetchData()
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    const res = await bulkDeleteTasks(ids)
    showNotification(res.message || 'Tasks deleted', res.status === 'success' ? 'success' : 'error')
    setSelectedIds(new Set())
    fetchData()
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
      const scanRes = await triggerAutomationScan({ startDate, endDate, types: typeFilter ? [typeFilter] : undefined })
      if (scanRes.status === 'success') {
        showNotification(scanRes.message || 'Scan complete', 'success')
      } else {
        showNotification(scanRes.message || 'Scan failed', 'error')
        setScanning(false)
        return
      }

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
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Back to Dashboard */}
      {!isDashboard && (
        <Link
          href="/property-manager/ai-automations/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Automation Dashboard
        </Link>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <BoltIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-sm text-gray-500">{pageDescription}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* Dashboard: Automation Type Cards */}
      {isDashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <AutomationTypeCard
            title="Review Nudge"
            description="Send personalized messages encouraging guests to leave reviews"
            icon={ChatBubbleLeftRightIcon}
            href="/property-manager/ai-automations/review-nudge"
            color="amber"
          />
          <AutomationTypeCard
            title="Guest Review"
            description="Generate host reviews of guests based on their stay"
            icon={StarIcon}
            href="/property-manager/ai-automations/guest-review"
            color="violet"
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Awaiting Approval" count={counts.awaitingApproval} color="amber" />
        <SummaryCard label="Upcoming" count={counts.upcoming} color="blue" />
        <SummaryCard label="Completed" count={counts.completed} color="green" />
        <SummaryCard label="Failed" count={counts.failed} color="red" />
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
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === tab.key ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Select All */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={selectedIds.size === tasks.length && tasks.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-xs text-gray-500">
            {selectedIds.size > 0 ? `${selectedIds.size} of ${tasks.length} selected` : 'Select all'}
          </span>
        </div>
      )}

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
              ? 'Enable automations in Settings and run a scan to find recent checkouts.'
              : 'Tasks with this status will appear here.'}
          </p>
          {statusFilter === 'all' && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Open Settings
              </button>
              <button
                onClick={() => setShowScanModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Run Scan
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {tasks.map(task => (
            <AutomationTaskCard
              key={task.id}
              task={task}
              onReview={handleReview}
              onRetry={handleRetry}
              onProcess={handleProcessOne}
              processingTaskId={processingTaskId}
              selected={selectedIds.has(task.id)}
              onSelect={handleSelect}
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

      <BulkActionBar
        selectedCount={selectedIds.size}
        hasAwaitingApproval={tasks.some(t => selectedIds.has(t.id) && t.status === 'awaiting_approval')}
        onApprove={handleBulkApprove}
        onReject={handleBulkReject}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  )
}

function AutomationTypeCard({ title, description, icon: Icon, href, color }: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: 'amber' | 'violet'
}) {
  const colors = {
    amber: 'border-amber-200 hover:border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50',
    violet: 'border-violet-200 hover:border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50',
  }
  const iconColors = {
    amber: 'bg-amber-100 text-amber-600',
    violet: 'bg-violet-100 text-violet-600',
  }

  return (
    <Link
      href={href}
      className={`block p-5 rounded-xl border transition-all hover:shadow-md ${colors[color]}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </Link>
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
