'use client'

import { useCallback, useEffect, useState } from 'react'
import { getRecordHistory } from '@/services/auditService'
import type { AuditEntityType, AuditEvent } from '@/services/types/audit'

export function useAuditHistory(
  entityType: AuditEntityType,
  entityId: string | null | undefined,
  opts: { limit?: number; autoLoad?: boolean } = {}
) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const limit = opts.limit ?? 100
  const autoLoad = opts.autoLoad !== false

  const refresh = useCallback(() => setRefreshTick(t => t + 1), [])

  useEffect(() => {
    if (!autoLoad || !entityId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getRecordHistory(entityType, entityId, { limit })
      .then(res => {
        if (cancelled) return
        if (res.status === 'success') {
          setEvents(res.data)
        } else {
          setError(res.message || 'Failed to load history')
        }
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load history')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [autoLoad, entityType, entityId, limit, refreshTick])

  return { events, loading, error, refresh }
}
