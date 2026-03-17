'use client'

import { useState, useCallback } from 'react'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Booking } from '@/services/types/booking'
import type { ActivatedItem } from '../dnd/types'

interface UseActivatedItemOptions {
  onOpenProjectModal: (project: CleaningProject) => void
  onOpenBookingModal: (booking: Booking) => void
}

export function useActivatedItem({ onOpenProjectModal, onOpenBookingModal }: UseActivatedItemOptions) {
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

  const clearActivatedItem = useCallback(() => {
    setActivatedItem(null)
  }, [])

  return {
    activatedItem,
    handleProjectClick,
    handleBookingClick,
    clearActivatedItem,
  }
}
