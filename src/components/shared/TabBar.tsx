'use client'

export interface Tab {
  key: string
  label: string
  badge?: number | string
  badgeColor?: string // Tailwind bg color class, e.g. 'bg-blue-500'
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (key: string) => void
}

export default function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex-shrink-0 flex border-b border-gray-200 bg-white">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer relative ${
            activeTab === tab.key
              ? 'text-blue-700 border-b-2 border-blue-600 font-semibold'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {tab.label}
            {tab.badge !== undefined && tab.badge !== 0 && (
              <span
                className={`min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-bold text-white rounded-full ${
                  tab.badgeColor || 'bg-gray-400'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
