'use client'

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export type DashboardTab = 'overview' | 'cleaner-earnings' | 'analytics'

interface DashboardTabsProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
}

const TABS: { id: DashboardTab; labelKey: string }[] = [
  { id: 'overview', labelKey: 'tabs.overview' },
  { id: 'cleaner-earnings', labelKey: 'tabs.cleanerEarnings' },
  { id: 'analytics', labelKey: 'tabs.analytics' },
]

const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation('dashboard')

  return (
    <div className="flex gap-0.5 border-b border-gray-200">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === tab.id
              ? 'text-slate-800'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="dashboard-tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
            />
          )}
          <span className="relative z-10">{t(tab.labelKey)}</span>
        </button>
      ))}
    </div>
  )
}

export default DashboardTabs
