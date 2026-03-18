'use client'

export type ChecklistTab = 'checklist' | 'info'

interface ChecklistTabsProps {
  activeTab: ChecklistTab
  onTabChange: (tab: ChecklistTab) => void
  issueCount?: number
  supplyListCount?: number
}

export default function ChecklistTabs({
  activeTab,
  onTabChange,
  issueCount = 0,
  supplyListCount = 0,
}: ChecklistTabsProps) {
  const showInfoDot = issueCount > 0 || supplyListCount > 0

  return (
    <div className="flex-shrink-0 flex h-10 border-b border-gray-200 bg-white">
      <button
        onClick={() => onTabChange('checklist')}
        className={`flex-1 text-sm font-medium transition-colors cursor-pointer relative ${
          activeTab === 'checklist'
            ? 'text-purple-700 border-b-2 border-purple-600 font-semibold'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        Checklist
      </button>
      <button
        onClick={() => onTabChange('info')}
        className={`flex-1 text-sm font-medium transition-colors cursor-pointer relative ${
          activeTab === 'info'
            ? 'text-purple-700 border-b-2 border-purple-600 font-semibold'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        Info
        {showInfoDot && (
          <span className="absolute top-2 ml-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
        )}
      </button>
    </div>
  )
}
