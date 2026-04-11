'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectChecklistItem } from '@/services/types/cleaningProject'
import { groupChecklistItemsByRoom } from '@/services/cleaningProjectService'
import RoomSection from './RoomSection'

interface ChecklistContentProps {
  items: ProjectChecklistItem[]
  loading: boolean
  onToggleItem: (item: ProjectChecklistItem) => void
  onUploadPhoto: (itemId: string, file: File) => void
  onDeletePhoto: (itemId: string) => void
  onViewPhoto: (url: string) => void
  uploadingItems: Set<string>
  togglingItems: Set<string>
  readOnly: boolean
}

export default function ChecklistContent({
  items,
  loading,
  onToggleItem,
  onUploadPhoto,
  onDeletePhoto,
  onViewPhoto,
  uploadingItems,
  togglingItems,
  readOnly,
}: ChecklistContentProps) {
  const { t } = useTranslation('cleanerPortal')
  const itemsByRoom = useMemo(() => groupChecklistItemsByRoom(items), [items])
  const roomEntries = useMemo(() => Object.entries(itemsByRoom), [itemsByRoom])

  // Find first incomplete room
  const firstIncompleteRoom = useMemo(
    () => roomEntries.find(([, roomItems]) => roomItems.some(item => !item.isCompleted)),
    [roomEntries]
  )

  // Smart expansion: only first incomplete room expanded initially
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set())
  const [hasInitialized, setHasInitialized] = useState(false)

  // Room refs for auto-scroll
  const roomRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Initialize expanded rooms after loading
  useEffect(() => {
    if (!loading && items.length > 0 && !hasInitialized) {
      if (firstIncompleteRoom) {
        setExpandedRooms(new Set([firstIncompleteRoom[0]]))
      } else {
        // All complete — expand first room
        const firstRoom = roomEntries[0]?.[0]
        if (firstRoom) setExpandedRooms(new Set([firstRoom]))
      }
      setHasInitialized(true)
    }
  }, [loading, items.length, hasInitialized, firstIncompleteRoom, roomEntries])

  // Auto-scroll to first incomplete room after initialization
  useEffect(() => {
    if (hasInitialized && firstIncompleteRoom) {
      const timeout = setTimeout(() => {
        const el = roomRefs.current[firstIncompleteRoom[0]]
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [hasInitialized, firstIncompleteRoom])

  const toggleRoom = useCallback((roomName: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev)
      if (next.has(roomName)) {
        next.delete(roomName)
      } else {
        next.add(roomName)
      }
      return next
    })
  }, [])

  const setRoomRef = useCallback((roomName: string) => (el: HTMLDivElement | null) => {
    roomRefs.current[roomName] = el
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{t('noChecklistItemsFound')}</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {roomEntries.map(([roomName, roomItems]) => (
        <RoomSection
          key={roomName}
          roomName={roomName}
          items={roomItems}
          isExpanded={expandedRooms.has(roomName)}
          onToggle={() => toggleRoom(roomName)}
          onToggleItem={onToggleItem}
          onUploadPhoto={onUploadPhoto}
          onDeletePhoto={onDeletePhoto}
          onViewPhoto={onViewPhoto}
          uploadingItems={uploadingItems}
          togglingItems={togglingItems}
          readOnly={readOnly}
          sectionRef={setRoomRef(roomName)}
        />
      ))}
    </div>
  )
}
