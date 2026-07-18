'use client'

import type { SectionId } from './types'

export interface SectionNavItem {
  id: SectionId
  label: string
}

interface SectionNavProps {
  items: SectionNavItem[]   // only sections that have content
  activeId?: SectionId | null
  onNavigate: (id: SectionId) => void
}

/**
 * Sticky pill nav for the project-detail modal. Sticks to the top of the
 * modal's own scroll container (the shared Modal box is `overflow-y-auto`).
 * Clicking a pill expands + scrolls to that section (handled by the parent);
 * the pill for the section currently in view renders in the modal's purple.
 */
export default function SectionNav({ items, activeId, onNavigate }: SectionNavProps) {
  if (items.length === 0) return null
  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-2 flex items-center gap-1.5 overflow-x-auto">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onNavigate(it.id)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
            it.id === activeId
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
