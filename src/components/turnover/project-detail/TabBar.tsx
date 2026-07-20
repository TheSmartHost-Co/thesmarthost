'use client'

import { ReactNode } from 'react'
import type { TabId } from './types'

export interface TabBarItem {
  id: TabId
  label: string
  icon?: ReactNode
  badge?: ReactNode
}

interface TabBarProps {
  tabs: TabBarItem[]
  activeId: TabId
  onSelect: (id: TabId) => void
}

/**
 * Underline tab bar for the project-detail modal. Overflow wraps onto a
 * second row (no horizontal scroll) so every tab stays visible on narrow
 * screens.
 */
export default function TabBar({ tabs, activeId, onSelect }: TabBarProps) {
  return (
    <div role="tablist" className="flex items-center flex-wrap gap-x-5 px-6 border-b border-gray-100 flex-shrink-0">
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
            className={`inline-flex items-center gap-1.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
              active
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge}
          </button>
        )
      })}
    </div>
  )
}
