'use client'

import { useMemo } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import {
  Bars3Icon,
  CameraIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

// Shared editable item interface used by both checklist and template edit modals
export interface EditableItem {
  id: string
  roomName: string
  taskDescription: string
  requiresPhoto: boolean
  sortOrder: number
  isNew: boolean
  isDirty: boolean
}

interface RoomGroup {
  id: string
  roomName: string
  items: EditableItem[]
}

interface GroupedItemsEditorProps {
  items: EditableItem[]
  onItemsChange: (items: EditableItem[]) => void
  onDeleteItem: (id: string) => void
  accentColor: 'blue' | 'emerald'
}

function deriveRooms(items: EditableItem[]): RoomGroup[] {
  const roomOrder: string[] = []
  const roomMap = new Map<string, EditableItem[]>()

  for (const item of items) {
    const key = item.roomName || ''
    if (!roomMap.has(key)) {
      roomMap.set(key, [])
      roomOrder.push(key)
    }
    roomMap.get(key)!.push(item)
  }

  return roomOrder.map((roomName) => {
    const roomItems = roomMap.get(roomName)!
    return {
      id: roomItems[0]?.id || `room-${roomName || 'general'}`,
      roomName,
      items: roomItems,
    }
  })
}

function flattenRooms(rooms: RoomGroup[]): EditableItem[] {
  let sortOrder = 0
  return rooms.flatMap((room) =>
    room.items.map((item) => ({ ...item, sortOrder: sortOrder++ }))
  )
}

export default function GroupedItemsEditor({
  items,
  onItemsChange,
  onDeleteItem,
  accentColor,
}: GroupedItemsEditorProps) {
  const rooms = useMemo(() => deriveRooms(items), [items])

  const handleRoomReorder = (newRooms: RoomGroup[]) => {
    onItemsChange(flattenRooms(newRooms))
  }

  const handleTaskReorder = (roomId: string, newTaskOrder: EditableItem[]) => {
    const newRooms = rooms.map((r) =>
      r.id === roomId ? { ...r, items: newTaskOrder } : r
    )
    onItemsChange(flattenRooms(newRooms))
  }

  const updateItem = (
    itemId: string,
    updates: Partial<Pick<EditableItem, 'taskDescription' | 'requiresPhoto'>>
  ) => {
    const newItems = items.map((item) =>
      item.id === itemId
        ? { ...item, ...updates, isDirty: item.isNew ? item.isDirty : true }
        : item
    )
    onItemsChange(newItems)
  }

  const updateRoomName = (oldRoomName: string, newRoomName: string) => {
    const newItems = items.map((item) =>
      (item.roomName || '') === oldRoomName
        ? { ...item, roomName: newRoomName, isDirty: item.isNew ? item.isDirty : true }
        : item
    )
    onItemsChange(newItems)
  }

  if (items.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-medium text-gray-700">
          {items.length} task{items.length !== 1 ? 's' : ''} · {rooms.length} room{rooms.length !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-500 text-xs">Drag handles to reorder</span>
      </div>
      <Reorder.Group
        axis="y"
        values={rooms}
        onReorder={handleRoomReorder}
        className="space-y-3"
      >
        {rooms.map((room) => (
          <RoomSection
            key={room.id}
            room={room}
            accentColor={accentColor}
            onTaskReorder={(newOrder) => handleTaskReorder(room.id, newOrder)}
            onRoomNameChange={(newName) => updateRoomName(room.roomName, newName)}
            onItemUpdate={updateItem}
            onDeleteItem={onDeleteItem}
          />
        ))}
      </Reorder.Group>
    </div>
  )
}

/* ─── Room Section ─── */

interface RoomSectionProps {
  room: RoomGroup
  accentColor: 'blue' | 'emerald'
  onTaskReorder: (newOrder: EditableItem[]) => void
  onRoomNameChange: (newName: string) => void
  onItemUpdate: (
    itemId: string,
    updates: Partial<Pick<EditableItem, 'taskDescription' | 'requiresPhoto'>>
  ) => void
  onDeleteItem: (id: string) => void
}

function RoomSection({
  room,
  accentColor,
  onTaskReorder,
  onRoomNameChange,
  onItemUpdate,
  onDeleteItem,
}: RoomSectionProps) {
  const dragControls = useDragControls()
  const focusColor = accentColor === 'blue'
    ? 'focus:border-blue-400 focus:ring-blue-500/20'
    : 'focus:border-emerald-400 focus:ring-emerald-500/20'

  return (
    <Reorder.Item
      value={room}
      dragListener={false}
      dragControls={dragControls}
      className="rounded-xl border border-gray-200 overflow-hidden"
    >
      {/* Room Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100/80 border-b border-gray-100">
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="cursor-grab active:cursor-grabbing touch-none p-0.5 flex-shrink-0"
        >
          <Bars3Icon className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={room.roomName}
          onChange={(e) => onRoomNameChange(e.target.value)}
          placeholder="General"
          className={`flex-1 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-transparent border border-transparent hover:border-gray-300 ${focusColor} focus:ring-1 rounded px-1.5 py-0.5 outline-none transition-colors`}
        />
        <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
          {room.items.length}
        </span>
      </div>

      {/* Tasks */}
      <Reorder.Group
        axis="y"
        values={room.items}
        onReorder={onTaskReorder}
        className="divide-y divide-gray-100"
      >
        {room.items.map((item) => (
          <TaskRow
            key={item.id}
            item={item}
            accentColor={accentColor}
            onUpdate={(updates) => onItemUpdate(item.id, updates)}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </Reorder.Group>
    </Reorder.Item>
  )
}

/* ─── Task Row ─── */

interface TaskRowProps {
  item: EditableItem
  accentColor: 'blue' | 'emerald'
  onUpdate: (updates: Partial<Pick<EditableItem, 'taskDescription' | 'requiresPhoto'>>) => void
  onDelete: () => void
}

function TaskRow({ item, accentColor, onUpdate, onDelete }: TaskRowProps) {
  const newBg = accentColor === 'blue' ? 'bg-blue-50/40' : 'bg-emerald-50/40'
  const newBadge = accentColor === 'blue'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-emerald-100 text-emerald-700'
  const focusColor = accentColor === 'blue'
    ? 'focus:border-blue-400 focus:ring-blue-500/20'
    : 'focus:border-emerald-400 focus:ring-emerald-500/20'

  // Prevent drag from starting when interacting with inputs/buttons
  const stopDrag = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <Reorder.Item
      value={item}
      className={`flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing ${item.isNew ? newBg : 'bg-white'}`}
    >
      <Bars3Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <input
        type="text"
        value={item.taskDescription}
        onChange={(e) => onUpdate({ taskDescription: e.target.value })}
        onPointerDownCapture={stopDrag}
        className={`flex-1 text-sm text-gray-900 bg-transparent border border-transparent hover:border-gray-200 ${focusColor} focus:ring-1 rounded px-1.5 py-0.5 outline-none transition-colors min-w-0 cursor-text`}
      />
      {item.isNew && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${newBadge}`}>
          NEW
        </span>
      )}
      <button
        type="button"
        onClick={() => onUpdate({ requiresPhoto: !item.requiresPhoto })}
        onPointerDownCapture={stopDrag}
        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
          item.requiresPhoto
            ? 'bg-amber-100 text-amber-700'
            : 'text-gray-300 hover:text-gray-500'
        }`}
      >
        <CameraIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        onPointerDownCapture={stopDrag}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </Reorder.Item>
  )
}
