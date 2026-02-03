'use client'

import { useUserStore } from '@/store/useUserStore'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

export default function CleanerDashboardPage() {
  const profile = useUserStore(s => s.profile)

  const firstName = profile?.fullName?.split(' ')[0] || 'there'

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {firstName}!
        </h1>
        <p className="mt-1 text-gray-600">
          Here&apos;s an overview of your cleaning assignments and tasks.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={HomeIcon}
          label="Assigned Properties"
          value="--"
          color="purple"
        />
        <StatCard
          icon={ClipboardDocumentListIcon}
          label="Pending Tasks"
          value="--"
          color="amber"
        />
        <StatCard
          icon={CalendarDaysIcon}
          label="Upcoming This Week"
          value="--"
          color="blue"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Completed This Month"
          value="--"
          color="green"
        />
      </div>

      {/* Placeholder Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Today&apos;s Tasks
          </h2>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <ClipboardDocumentListIcon className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">No tasks scheduled for today</p>
            <p className="text-xs text-gray-400 mt-1">
              Tasks will appear here once assigned
            </p>
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Schedule
          </h2>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <CalendarDaysIcon className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">No upcoming cleanings scheduled</p>
            <p className="text-xs text-gray-400 mt-1">
              Your schedule will appear here
            </p>
          </div>
        </div>
      </div>

      {/* My Properties */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          My Assigned Properties
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <HomeIcon className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-sm">No properties assigned yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Properties you&apos;re assigned to will appear here
          </p>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: string
  color: 'purple' | 'amber' | 'blue' | 'green'
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}
