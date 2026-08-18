// Shared UI constants + negotiation predicates for maintenance tasks.
// One source of truth so status colors and turn-taking rules can't drift
// between the contractor portal, the PM maintenance page, and the task modals
// (precedent: issueTypeUi.tsx for issue types).

import type { MaintenanceTask, MaintenanceTaskStatus } from '@/services/types/maintenanceTask'

// Status badge palette (bg + text). Convention: pending/cancelled=gray,
// assigned=amber, confirmed=blue, in_progress=purple, completed=green;
// cancelled uses the muted gray-500 text.
export const TASK_STATUS_BADGE: Record<MaintenanceTaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  assigned: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

// Subtle chip border tints (used by TaskDetailModal's status chip)
export const TASK_STATUS_CHIP_BORDER: Record<MaintenanceTaskStatus, string> = {
  pending: 'border-gray-200',
  assigned: 'border-amber-200',
  confirmed: 'border-blue-200',
  in_progress: 'border-purple-200',
  completed: 'border-green-200',
  cancelled: 'border-gray-200',
}

// Stronger accent borders (used by MaintenanceTaskCard's left edge)
export const TASK_STATUS_ACCENT_BORDER: Record<MaintenanceTaskStatus, string> = {
  pending: 'border-gray-300',
  assigned: 'border-amber-400',
  confirmed: 'border-blue-400',
  in_progress: 'border-purple-400',
  completed: 'border-green-400',
  cancelled: 'border-gray-300',
}

/**
 * The ball is in the contractor's court: the task is assigned and either no
 * price has been proposed yet, or the PM's offer is standing.
 */
export function needsContractorResponse(task: MaintenanceTask): boolean {
  return (
    task.status === 'assigned' &&
    (task.priceStatus === 'awaiting_proposal' ||
      (task.priceStatus === 'offered' && task.pricingLastActor === 'pm'))
  )
}

/**
 * The ball is in the PM's court: the contractor's offer is standing.
 */
export function isWaitingOnManager(task: MaintenanceTask): boolean {
  return (
    task.status === 'assigned' &&
    task.priceStatus === 'offered' &&
    task.pricingLastActor === 'contractor'
  )
}
