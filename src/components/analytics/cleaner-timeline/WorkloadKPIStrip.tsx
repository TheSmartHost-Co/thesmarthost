'use client'

import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import type { CleanerPortfolioData } from '@/services/types/cleanerAnalytics'

interface WorkloadKPIStripProps {
  portfolio: CleanerPortfolioData
}

export default function WorkloadKPIStrip({ portfolio }: WorkloadKPIStripProps) {
  const router = useRouter()
  const { current, delta } = portfolio

  const avgPerCleaner =
    current.activeCleanerCount > 0
      ? (current.totalProjects / current.activeCleanerCount).toFixed(1)
      : '0'

  const cards = [
    {
      label: 'Completed',
      value: current.completedProjects,
      subtitle: `${current.totalHoursWorked.toFixed(1)} hrs worked`,
      icon: <CheckCircleIcon className="h-4 w-4" />,
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      iconClass: 'text-emerald-500',
      deltaVal: delta?.completedProjects ?? null,
    },
    {
      label: 'On the Calendar',
      value: current.pendingProjects,
      subtitle: 'cleanings scheduled',
      icon: <CalendarDaysIcon className="h-4 w-4" />,
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      iconClass: 'text-blue-500',
      deltaVal: delta?.pendingProjects ?? null,
    },
    {
      label: 'Needs a Cleaner',
      value: current.unassignedProjects,
      subtitle: 'unassigned cleanings',
      icon: <ExclamationTriangleIcon className="h-4 w-4" />,
      bgClass: current.unassignedProjects > 0 ? 'bg-red-50' : 'bg-gray-50',
      textClass: current.unassignedProjects > 0 ? 'text-red-700' : 'text-gray-700',
      iconClass: current.unassignedProjects > 0 ? 'text-red-500' : 'text-gray-400',
      deltaVal: delta?.unassignedProjects ?? null,
      cta:
        current.unassignedProjects > 0
          ? {
              label: 'Assign now',
              onClick: () => router.push('/property-manager/schedule-turnovers'),
            }
          : undefined,
    },
    {
      label: 'Team Size',
      value: current.activeCleanerCount,
      subtitle: `avg ${avgPerCleaner} cleanings/cleaner`,
      icon: <UsersIcon className="h-4 w-4" />,
      bgClass: 'bg-slate-50',
      textClass: 'text-slate-700',
      iconClass: 'text-slate-500',
      deltaVal: delta?.activeCleanerCount ?? null,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-3 lg:grid-cols-4">
      {cards.map(card => (
        <div key={card.label} className={`relative rounded-xl ${card.bgClass} px-4 py-3`}>
          <div className="flex items-center gap-2">
            <span className={card.iconClass}>{card.icon}</span>
            <p className="text-[11px] font-medium text-gray-500">{card.label}</p>
          </div>
          <p className={`mt-1 text-xl font-bold tabular-nums ${card.textClass}`}>{card.value}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">{card.subtitle}</p>
            {card.deltaVal && card.deltaVal.absolute !== 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                  card.deltaVal.absolute > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {card.deltaVal.absolute > 0 ? '↑' : '↓'}
                {card.deltaVal.percentage !== null ? ` ${Math.abs(card.deltaVal.percentage).toFixed(0)}%` : ''}
              </span>
            )}
          </div>
          {card.cta && (
            <button
              onClick={card.cta.onClick}
              className="mt-2 rounded-lg bg-red-600 px-3 py-1 text-[10px] font-medium text-white transition-colors hover:bg-red-700"
            >
              {card.cta.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
