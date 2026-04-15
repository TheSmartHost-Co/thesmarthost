'use client'

import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import type { DashboardTab } from '@/components/dashboard/DashboardTabs/DashboardTabs'
import {
  UserPlusIcon,
  HomeModernIcon,
  SparklesIcon,
  UsersIcon,
  CloudArrowUpIcon,
  DocumentChartBarIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

interface QuickActionsGridProps {
  onAddClient: () => void
  onAddProperty: () => void
  onAddCleaner: () => void
  onAddTeamMember: () => void
  onGenerateReport: () => void
  onCreateProject: () => void
  onSwitchTab: (tab: DashboardTab) => void
}

const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onAddClient,
  onAddProperty,
  onAddCleaner,
  onAddTeamMember,
  onGenerateReport,
  onCreateProject,
  onSwitchTab,
}) => {
  const router = useRouter()
  const { t } = useTranslation('dashboard')

  const actions = [
    { label: t('quickActions.addClient'), icon: UserPlusIcon, onClick: onAddClient },
    { label: t('quickActions.addProperty'), icon: HomeModernIcon, onClick: onAddProperty },
    { label: t('quickActions.addCleaner'), icon: SparklesIcon, onClick: onAddCleaner },
    { label: t('quickActions.addTeamMember'), icon: UsersIcon, onClick: onAddTeamMember },
    { label: t('quickActions.importBookings'), icon: CloudArrowUpIcon, onClick: () => router.push('/property-manager/upload-bookings') },
    { label: t('quickActions.generateReport'), icon: DocumentChartBarIcon, onClick: onGenerateReport },
    { label: t('quickActions.createProject'), icon: WrenchScrewdriverIcon, onClick: onCreateProject },
    { label: t('quickActions.viewAnalytics'), icon: ChartBarIcon, onClick: () => onSwitchTab('analytics') },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
        >
          <action.icon className="h-4 w-4 text-slate-500" />
          {action.label}
        </button>
      ))}
    </div>
  )
}

export default QuickActionsGrid
