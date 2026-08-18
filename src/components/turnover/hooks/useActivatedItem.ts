'use client'

import { useState, useCallback } from 'react'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Booking } from '@/services/types/booking'
import type { MaintenanceTask } from '@/services/types/maintenanceTask'
import type { ActivatedItem } from '../dnd/types'

interface UseActivatedItemOptions {
  onOpenProjectModal: (project: CleaningProject) => void
  onOpenBookingModal: (booking: Booking) => void
  onOpenTaskModal?: (task: MaintenanceTask) => void
}

export function useActivatedItem({ onOpenProjectModal, onOpenBookingModal, onOpenTaskModal }: UseActivatedItemOptions) {
  const [activatedItem, setActivatedItem] = useState<ActivatedItem>(null)

  const handleProjectClick = useCallback((project: CleaningProject) => {
    if (activatedItem?.type === 'project' && activatedItem.id === project.id) {
      onOpenProjectModal(project)
    } else {
      setActivatedItem({ type: 'project', id: project.id })
    }
  }, [activatedItem, onOpenProjectModal])

  const handleBookingClick = useCallback((booking: Booking) => {
    if (activatedItem?.type === 'booking' && activatedItem.id === booking.id) {
      onOpenBookingModal(booking)
    } else {
      setActivatedItem({ type: 'booking', id: booking.id })
    }
  }, [activatedItem, onOpenBookingModal])

  const handleTaskClick = useCallback((task: MaintenanceTask) => {
    if (activatedItem?.type === 'task' && activatedItem.id === task.id) {
      onOpenTaskModal?.(task)
    } else {
      setActivatedItem({ type: 'task', id: task.id })
    }
  }, [activatedItem, onOpenTaskModal])

  const clearActivatedItem = useCallback(() => {
    setActivatedItem(null)
  }, [])

  return {
    activatedItem,
    handleProjectClick,
    handleBookingClick,
    handleTaskClick,
    clearActivatedItem,
  }
}
