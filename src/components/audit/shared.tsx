'use client'

import type { TFunction } from 'i18next'
import { getCascadeKey } from '@/services/auditService'
import type { AuditEvent, AuditAction } from '@/services/types/audit'

const ACTION_DOT_COLORS: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
}

const ACTION_BADGE_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
}

export function ActionDot({ action }: { action: AuditAction | string }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${ACTION_DOT_COLORS[action] || 'bg-gray-400'}`} />
  )
}

export function ActionBadge({ action, t }: { action: AuditAction | string; t: TFunction }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_BADGE_COLORS[action] || 'bg-gray-100 text-gray-800'}`}>
      {t(`action.${action}`)}
    </span>
  )
}

export function getEventLabel(
  event: Pick<AuditEvent, 'action' | 'entityType' | 'metadata'>,
  t: TFunction,
): string {
  const cascadeKey = getCascadeKey(event)
  if (cascadeKey) return t(`cascade.${cascadeKey}`, { defaultValue: cascadeKey })
  return `${t(`action.${event.action}`)} ${t(`entityType.${event.entityType}`)}`
}

export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '∅'
  if (typeof v === 'object') return JSON.stringify(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}
