'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  InboxArrowDownIcon,
  ClockIcon,
  BuildingOfficeIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { getContractorByAuthUserId } from '@/services/contractorService'
import { getMyMaintenanceTasks } from '@/services/maintenanceTaskService'
import type { Contractor } from '@/services/types/contractor'
import type { MaintenanceTask } from '@/services/types/maintenanceTask'

// Format a time string (HH:mm[:ss]) as 12-hour clock
function formatTime(time: string | null | undefined): string | null {
  if (!time) return null
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  if (isNaN(h)) return null
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

// Parse a task date (ISO timestamp or YYYY-MM-DD) to local midnight
function taskDateAtMidnight(dateStr: string): Date {
  const justDate = dateStr.split('T')[0]
  const d = new Date(justDate + 'T00:00:00')
  d.setHours(0, 0, 0, 0)
  return d
}

// Is this date (task date string) in the current calendar month?
function isInCurrentMonth(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const d = taskDateAtMidnight(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export default function ContractorDashboardPage() {
  const { t } = useTranslation('contractorPortal')
  const { profile } = useUserStore()
  const router = useRouter()

  // State
  const [contractor, setContractor] = useState<Contractor | null>(null)
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firstName = profile?.fullName?.split(' ')[0] || 'there'

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      // Contractor record + tasks in parallel
      const [contractorRes, tasksRes] = await Promise.all([
        getContractorByAuthUserId(profile.id),
        getMyMaintenanceTasks(),
      ])

      if (contractorRes.status !== 'success') {
        throw new Error(contractorRes.message || 'Could not find your contractor profile')
      }
      setContractor(contractorRes.data)

      if (tasksRes.status === 'success') {
        setTasks(tasksRes.data)
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  // Stats computed from real task data
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Needs-response: assigned && (awaiting_proposal || PM's offer stands)
    const pendingOffers = tasks.filter(task =>
      task.status === 'assigned' &&
      (task.priceStatus === 'awaiting_proposal' ||
        (task.priceStatus === 'offered' && task.pricingLastActor === 'pm'))
    ).length

    // Upcoming: scheduled today or later, still assigned/confirmed
    const upcoming = tasks.filter(task => {
      if (task.status !== 'assigned' && task.status !== 'confirmed') return false
      if (!task.scheduledDate) return false
      return taskDateAtMidnight(task.scheduledDate) >= today
    }).length

    const inProgress = tasks.filter(task => task.status === 'in_progress').length

    // Completed this month: actualEnd (or scheduledDate fallback) in current month
    const completedThisMonth = tasks.filter(task =>
      task.status === 'completed' &&
      isInCurrentMonth(task.actualEnd || task.scheduledDate)
    ).length

    return { pendingOffers, upcoming, inProgress, completedThisMonth }
  }, [tasks])

  // Earnings: agreed amounts over work completed this month.
  // The invoices phase will refine this into invoice-based earnings.
  const earnings = useMemo(() => {
    const currentMonth = tasks
      .filter(task =>
        task.status === 'completed' &&
        isInCurrentMonth(task.actualEnd || task.scheduledDate)
      )
      .reduce((sum, task) => sum + (Number(task.agreedAmount) || 0), 0)
    return { currentMonth }
  }, [tasks])

  // Today's tasks: scheduled today, confirmed or in progress
  const todaysTasks = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return tasks
      .filter(task => {
        if (task.status !== 'confirmed' && task.status !== 'in_progress') return false
        if (!task.scheduledDate) return false
        return taskDateAtMidnight(task.scheduledDate).getTime() === today.getTime()
      })
      .sort((a, b) => (a.scheduledStartTime || '00:00').localeCompare(b.scheduledStartTime || '00:00'))
  }, [tasks])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-5 sm:mb-8">
          <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-96 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-5 sm:mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-64 animate-pulse" />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-64 animate-pulse" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('welcomeUser', { name: firstName })}</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600">{t('dashboardOverview')}</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">{t('errorLoadingDashboard')}</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            {t('tryAgain')}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-5 sm:mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t('welcomeUser', { name: firstName })}
          </h1>
          {contractor?.trade && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">
              <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
              {contractor.trade}
            </span>
          )}
        </div>
        <p className="mt-0.5 sm:mt-1 text-sm sm:text-base text-gray-600">
          {t('dashboardOverview')}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-8">
        {[
          {
            label: t('myTasks'),
            icon: WrenchScrewdriverIcon,
            onClick: () => router.push('/contractor/tasks'),
            bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
            shadow: 'shadow-purple-200',
            hoverShadow: 'hover:shadow-purple-300',
          },
          {
            label: t('myInvoices'),
            icon: BanknotesIcon,
            onClick: () => router.push('/contractor/invoices'),
            bg: 'bg-gradient-to-br from-amber-500 to-amber-600',
            shadow: 'shadow-amber-200',
            hoverShadow: 'hover:shadow-amber-300',
          },
        ].map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={action.onClick}
            className={`${action.bg} ${action.shadow} ${action.hoverShadow} rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all text-left cursor-pointer min-h-[88px] sm:min-h-[96px]`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <action.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <span className="text-base sm:text-lg font-bold text-white">{action.label}</span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-5 sm:mb-8">
        <StatCard
          icon={InboxArrowDownIcon}
          label={t('pendingOffers')}
          value={stats.pendingOffers.toString()}
          color="amber"
          href="/contractor/tasks"
        />
        <StatCard
          icon={CalendarDaysIcon}
          label={t('upcoming')}
          value={stats.upcoming.toString()}
          color="blue"
          href="/contractor/tasks"
        />
        <StatCard
          icon={WrenchScrewdriverIcon}
          label={t('inProgress')}
          value={stats.inProgress.toString()}
          color="purple"
          href="/contractor/tasks"
        />
        <StatCard
          icon={CheckCircleIcon}
          label={t('completedThisMonth')}
          value={stats.completedThisMonth.toString()}
          color="green"
        />
      </div>

      {/* Earnings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-5 sm:mb-8"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('earnings')}</h2>
          <Link
            href="/contractor/invoices"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
          >
            {t('viewInvoices')} <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xs text-gray-500">{t('thisMonthCompletedWork')}</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">
            ${earnings.currentMonth.toFixed(2)}
          </p>
          {earnings.currentMonth === 0 && (
            <p className="text-[11px] text-gray-400 mt-2">{t('noCompletedWorkYet')}</p>
          )}
        </div>
      </motion.div>

      {/* Today's Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('todaysTasks')}</h2>
          {todaysTasks.length > 0 && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">
              {t('taskCount', { count: todaysTasks.length })}
            </span>
          )}
        </div>

        {todaysTasks.length > 0 ? (
          <>
            <div className="divide-y divide-gray-100">
              {todaysTasks.map((task, index) => (
                <TodayTaskRow key={task.id} task={task} index={index} />
              ))}
            </div>
            <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50">
              <Link
                href="/contractor/tasks"
                className="text-sm font-medium text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 min-h-[44px]"
              >
                {t('viewAllTasks')}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-gray-500">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
              <ClipboardDocumentListIcon className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">{t('noTasksScheduled')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('tasksWillAppearHere')}</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: string
  color: 'purple' | 'amber' | 'blue' | 'green'
  href?: string
}

function StatCard({ icon: Icon, label, value, color, href }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
  }

  const content = (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className={`p-2.5 sm:p-3 rounded-xl ${colorClasses[color]}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs sm:text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-amber-200 transition-all cursor-pointer"
        >
          {content}
        </motion.div>
      </Link>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
    >
      {content}
    </motion.div>
  )
}

// Task Row Component (for Today's Tasks)
function TodayTaskRow({ task, index }: { task: MaintenanceTask; index: number }) {
  const { t } = useTranslation('contractorPortal')

  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
  }

  const statusLabels: Record<string, string> = {
    confirmed: t('statusConfirmed'),
    in_progress: t('statusInProgress'),
  }

  return (
    <Link href="/contractor/tasks">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 + index * 0.05 }}
        className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-amber-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BuildingOfficeIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{task.title}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="truncate">{task.propertyName || t('unknownProperty')}</span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  <ClockIcon className="w-3.5 h-3.5" />
                  {formatTime(task.scheduledStartTime) || t('noTimeSet')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {task.status === 'in_progress' && (
              <PlayCircleIcon className="w-5 h-5 text-purple-500 animate-pulse" />
            )}
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${statusColors[task.status] || 'bg-gray-100 text-gray-700'}`}>
              {statusLabels[task.status] || task.status}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
