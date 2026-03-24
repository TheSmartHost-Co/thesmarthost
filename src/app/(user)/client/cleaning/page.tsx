'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { getClientPortalCleaningProjects } from '@/services/clientPortalService'
import type { ClientPortalCleaningProject } from '@/services/types/clientPortal'

type GroupKey = 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'completed'

const GROUP_LABELS: Record<GroupKey, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  thisWeek: 'This Week',
  later: 'Later',
  completed: 'Completed',
}

export default function ClientCleaningPage() {
  const [projects, setProjects] = useState<ClientPortalCleaningProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await getClientPortalCleaningProjects()
        if (res.status === 'success') {
          setProjects(res.data)
        }
      } catch (err) {
        console.error('Failed to load cleaning projects:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const grouped = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const endOfWeek = new Date(now)
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0]

    const groups: Record<GroupKey, ClientPortalCleaningProject[]> = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      completed: [],
    }

    for (const p of projects) {
      const dateStr = p.projectDate.split('T')[0]
      if (p.status.toLowerCase() === 'completed') {
        groups.completed.push(p)
      } else if (dateStr === todayStr) {
        groups.today.push(p)
      } else if (dateStr === tomorrowStr) {
        groups.tomorrow.push(p)
      } else if (dateStr <= endOfWeekStr && dateStr > tomorrowStr) {
        groups.thisWeek.push(p)
      } else {
        groups.later.push(p)
      }
    }

    return groups
  }, [projects])

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const statusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'in_progress':
        return 'bg-amber-100 text-amber-700'
      case 'assigned':
        return 'bg-blue-100 text-blue-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  const groupOrder: GroupKey[] = ['today', 'tomorrow', 'thisWeek', 'later', 'completed']
  const hasAny = projects.length > 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cleaning</h1>
        <p className="text-sm text-gray-500 mt-1">Cleaning projects for your properties</p>
      </div>

      {!hasAny ? (
        <div className="text-center py-12 text-sm text-gray-400">No cleaning projects found</div>
      ) : (
        <div className="space-y-8">
          {groupOrder.map((key) => {
            const items = grouped[key]
            if (items.length === 0) return null
            return (
              <div key={key}>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {GROUP_LABELS[key]} ({items.length})
                </h2>
                <div className="grid gap-3">
                  {items.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="rounded-lg bg-emerald-50 p-2.5 shrink-0">
                          <SparklesIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.propertyName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(p.projectDate)}
                            {p.projectStartTime ? ` at ${p.projectStartTime}` : ''}
                            {p.projectEndTime ? ` - ${p.projectEndTime}` : ''}
                          </p>
                          {p.cleanerName && (
                            <p className="text-xs text-gray-400 mt-0.5">Cleaner: {p.cleanerName}</p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ml-4 ${statusBadge(p.status)}`}>
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
