'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import type { ClientPortalCleaningSummary } from '@/services/types/clientPortal'

interface UpcomingCleaningListProps {
  cleanings: ClientPortalCleaningSummary[]
}

const statusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-green-100 text-green-700'
    case 'in_progress': return 'bg-amber-100 text-amber-700'
    case 'assigned': return 'bg-blue-100 text-blue-700'
    case 'cancelled': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export const UpcomingCleaningList: React.FC<UpcomingCleaningListProps> = ({ cleanings }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl bg-white shadow-sm border border-gray-100"
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Cleaning</h2>
        <Link
          href="/client/cleaning"
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          View All
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
      {cleanings.length === 0 ? (
        <div className="p-5 text-center text-sm text-gray-400">No upcoming cleaning projects</div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {cleanings.slice(0, 5).map((c) => (
            <li key={c.id} className="px-5 py-3 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 shrink-0">
                <SparklesIcon className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.propertyName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(c.projectDate)}
                  {c.projectStartTime ? ` at ${c.projectStartTime}` : ''}
                  {c.cleanerName ? ` \u00b7 ${c.cleanerName}` : ''}
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${statusBadge(c.status)}`}>
                {c.status.replace(/_/g, ' ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
