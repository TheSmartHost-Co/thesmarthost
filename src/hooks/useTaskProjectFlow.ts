'use client'

import { useState, useCallback } from 'react'
import type { MaintenanceTask } from '@/services/types/maintenanceTask'
import type { ProjectIssue } from '@/services/types/projectIssue'

export interface UseTaskProjectFlowOptions {
  onTaskCreated?: (task: MaintenanceTask) => void
}

/**
 * Orchestrates the two-step "Task Project" flow:
 *   Step 1 — ReportStandaloneIssueModal creates a property-scoped issue.
 *   Step 2 — CreateTaskModal creates a maintenance task from that issue.
 *
 * Also supports entering at step 2 directly from an existing issue
 * ("Create Task for this Issue").
 *
 * Abandoning step 2 just closes the modals — the created issue intentionally
 * remains open and recoverable via "Create Task for this Issue".
 */
export function useTaskProjectFlow(options?: UseTaskProjectFlowOptions) {
  const [showReportIssueModal, setShowReportIssueModal] = useState(false)
  const [pendingTaskIssue, setPendingTaskIssue] = useState<ProjectIssue | null>(null)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)

  const onTaskCreated = options?.onTaskCreated

  /** Entry point: start the two-step flow (report issue → create task) */
  const startTaskProjectFlow = useCallback(() => {
    setPendingTaskIssue(null)
    setShowCreateTaskModal(false)
    setShowReportIssueModal(true)
  }, [])

  /** Entry point: create a task for an already-existing issue */
  const startTaskFromIssue = useCallback((issue: ProjectIssue) => {
    setShowReportIssueModal(false)
    setPendingTaskIssue(issue)
    setShowCreateTaskModal(true)
  }, [])

  /** Step 1 done — carry the fresh issue into the create-task step */
  const handleIssueCreated = useCallback((issue: ProjectIssue) => {
    setPendingTaskIssue(issue)
    setShowReportIssueModal(false)
    setShowCreateTaskModal(true)
  }, [])

  /** Step 2 done — task created */
  const handleTaskCreated = useCallback(
    (task: MaintenanceTask) => {
      setShowCreateTaskModal(false)
      setPendingTaskIssue(null)
      onTaskCreated?.(task)
    },
    [onTaskCreated]
  )

  /** Close everything (abandoning step 2 keeps the created issue) */
  const closeAll = useCallback(() => {
    setShowReportIssueModal(false)
    setShowCreateTaskModal(false)
    setPendingTaskIssue(null)
  }, [])

  return {
    showReportIssueModal,
    pendingTaskIssue,
    showCreateTaskModal,
    startTaskProjectFlow,
    startTaskFromIssue,
    handleIssueCreated,
    handleTaskCreated,
    closeAll,
  }
}
