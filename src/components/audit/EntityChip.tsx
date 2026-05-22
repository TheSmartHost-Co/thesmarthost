'use client'

import {
  CalendarDaysIcon,
  HomeIcon,
  UserCircleIcon,
  SparklesIcon,
  ArchiveBoxXMarkIcon,
} from '@heroicons/react/24/outline'
import type { EntityRefType } from './auditFieldRegistry'

interface Props {
  entityType: EntityRefType
  entityId: string
  label?: string | null
  variant?: 'default' | 'deleted'
  onClick: () => void
}

const COLORS: Record<EntityRefType, {
  bg: string
  border: string
  text: string
  hoverBg: string
  hoverBorder: string
  ring: string
}> = {
  booking: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    hoverBg: 'hover:bg-sky-100',
    hoverBorder: 'hover:border-sky-300',
    ring: 'focus:ring-sky-300',
  },
  property: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    hoverBg: 'hover:bg-amber-100',
    hoverBorder: 'hover:border-amber-300',
    ring: 'focus:ring-amber-300',
  },
  cleaner: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    hoverBg: 'hover:bg-violet-100',
    hoverBorder: 'hover:border-violet-300',
    ring: 'focus:ring-violet-300',
  },
  cleaning_project: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    hoverBg: 'hover:bg-emerald-100',
    hoverBorder: 'hover:border-emerald-300',
    ring: 'focus:ring-emerald-300',
  },
}

const ICONS: Record<EntityRefType, React.ComponentType<{ className?: string }>> = {
  booking: CalendarDaysIcon,
  property: HomeIcon,
  cleaner: UserCircleIcon,
  cleaning_project: SparklesIcon,
}

export default function EntityChip({
  entityType,
  entityId,
  label,
  variant = 'default',
  onClick,
}: Props) {
  const Icon = variant === 'deleted' ? ArchiveBoxXMarkIcon : ICONS[entityType]
  const shortId = entityId.slice(0, 6)

  if (variant === 'deleted') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-gray-50 border-gray-200 text-gray-500 text-xs font-mono cursor-pointer hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
        title={entityId}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="line-through">#{shortId}</span>
      </button>
    )
  }

  const c = COLORS[entityType]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-mono cursor-pointer transition-all ${c.bg} ${c.border} ${c.text} ${c.hoverBg} ${c.hoverBorder} hover:shadow-sm focus:outline-none focus:ring-2 ${c.ring}`}
      title={entityId}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>#{shortId}</span>
      {label && (
        <>
          <span className="opacity-60">·</span>
          <span className="max-w-[8rem] truncate">{label}</span>
        </>
      )}
    </button>
  )
}
