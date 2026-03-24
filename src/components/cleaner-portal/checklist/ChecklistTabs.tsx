'use client'

export type ChecklistTab = 'checklist' | 'walkthrough' | 'info'

interface ChecklistTabsProps {
  activeTab: ChecklistTab
  onTabChange: (tab: ChecklistTab) => void
  issueCount?: number
  supplyListCount?: number
  showWalkthrough?: boolean
  walkthroughBadge?: string | null
}

export default function ChecklistTabs({
  activeTab,
  onTabChange,
  issueCount = 0,
  supplyListCount = 0,
  showWalkthrough,
  walkthroughBadge,
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
      {showWalkthrough && (
        <button
          onClick={() => onTabChange('walkthrough')}
          className={`flex-1 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'walkthrough'
              ? 'text-purple-700 border-b-2 border-purple-600 font-semibold'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="inline-flex items-center gap-1">
            Walkthrough
            {walkthroughBadge && (
              <span className="min-w-[16px] h-4 px-1 inline-flex items-center justify-center text-[10px] font-bold text-white bg-purple-500 rounded-full">
                {walkthroughBadge}
              </span>
            )}
          </span>
        </button>
      )}
      <button
        onClick={() => onTabChange('info')}
        className={`flex-1 text-sm font-medium transition-colors cursor-pointer ${
          activeTab === 'info'
            ? 'text-purple-700 border-b-2 border-purple-600 font-semibold'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <span className="inline-flex items-center gap-1">
          Info
          {showInfoDot && (
            <span className="min-w-[16px] h-4 px-1 inline-flex items-center justify-center text-[10px] font-bold text-white bg-amber-500 rounded-full">
              {issueCount + supplyListCount}
            </span>
          )}
        </span>
      </button>
    </div>
  )
}
