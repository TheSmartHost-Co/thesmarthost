'use client'

import Modal from '@/components/shared/modal'
import MaintenanceTaskCard from './MaintenanceTaskCard'
import type { MaintenanceTask } from '@/services/types/maintenanceTask'

interface ContractorTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: MaintenanceTask
  onTaskUpdated: (task: MaintenanceTask) => void
}

/**
 * Thin modal wrapper around the contractor's full task action surface
 * (accept / modify / decline / start / complete) so the schedule calendar
 * can open a task without duplicating any of the card's logic.
 */
export default function ContractorTaskModal({ isOpen, onClose, task, onTaskUpdated }: ContractorTaskModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} zIndex={60} style="w-full max-w-lg">
      {/* Top padding clears the modal's close button; the card is otherwise
          edge-to-edge and brings its own border, accent stripe and rounding. */}
      <div className="pt-10">
        <MaintenanceTaskCard task={task} onTaskUpdated={onTaskUpdated} />
      </div>
    </Modal>
  )
}
