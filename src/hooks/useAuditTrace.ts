'use client'

import { useEffect, useState } from 'react'
import { getTrace, buildAuditTree, type AuditTreeNode } from '@/services/auditService'
import type { AuditEvent } from '@/services/types/audit'

export function useAuditTrace(correlationId: string | null | undefined) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [tree, setTree] = useState<AuditTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!correlationId) {
      setEvents([])
      setTree([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getTrace(correlationId)
      .then(res => {
        if (cancelled) return
        if (res.status === 'success') {
          setEvents(res.data)
          setTree(buildAuditTree(res.data))
        } else {
          setError(res.message || 'Failed to load trace')
        }
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load trace')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [correlationId])

  return { events, tree, loading, error }
}
