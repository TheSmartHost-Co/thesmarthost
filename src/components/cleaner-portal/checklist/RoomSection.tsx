'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import type { ProjectChecklistItem } from '@/services/types/cleaningProject'
import ChecklistItemRow from './ChecklistItemRow'

interface RoomSectionProps {
  roomName: string
  items: ProjectChecklistItem[]
  isExpanded: boolean
  onToggle: () => void
  onToggleItem: (item: ProjectChecklistItem) => void
  onUploadPhoto: (itemId: string, file: File) => void
  onDeletePhoto: (itemId: string) => void
  onViewPhoto: (url: string) => void
  uploadingItems: Set<string>
  togglingItems: Set<string>
  readOnly?: boolean
  sectionRef?: (el: HTMLDivElement | null) => void
}

export default function RoomSection({
  roomName,
  items,
  isExpanded,
  onToggle,
  onToggleItem,
  onUploadPhoto,
  onDeletePhoto,
  onViewPhoto,
  uploadingItems,
  togglingItems,
  readOnly,
  sectionRef,
}: RoomSectionProps) {
  const completedCount = items.filter(i => i.isCompleted).length
  const allComplete = completedCount === items.length

  return (
    <div
      ref={sectionRef}
      className={`bg-white rounded-xl border overflow-hidden transition-colors ${
        allComplete ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
      }`}
    >
      {/* Room Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">{roomName}</h3>
          <span className={`
            text-xs font-medium px-2 py-0.5 rounded-full
            ${allComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
          `}>
            {completedCount}/{items.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Room Items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-gray-100">
              {items.map(item => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => onToggleItem(item)}
                  onUploadPhoto={(file) => onUploadPhoto(item.id, file)}
                  onDeletePhoto={() => onDeletePhoto(item.id)}
                  onViewPhoto={onViewPhoto}
                  isUploading={uploadingItems.has(item.id)}
                  isToggling={togglingItems.has(item.id)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
