'use client'

import { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import type { SectionId } from './index'

// Kept in one place so SectionNav can time its scroll to land after the expand.
export const SECTION_ANIM_MS = 180

interface CollapsibleSectionProps {
  id: SectionId
  title: string
  icon?: ReactNode
  badge?: ReactNode          // small count pill next to the title
  headerRight?: ReactNode    // action buttons on the right of the header (e.g. Report Issue)
  collapsed: boolean
  onToggle: (id: SectionId) => void
  /** Callback ref so the parent can scroll this section into view from the nav. */
  sectionRef?: (el: HTMLDivElement | null) => void
  children: ReactNode
}

/**
 * A titled, collapsible section for the project-detail modal. Matches the
 * existing "border-t + uppercase label" section styling; the body animates
 * open/closed via framer-motion (already used elsewhere in the modal).
 */
export default function CollapsibleSection({
  id,
  title,
  icon,
  badge,
  headerRight,
  collapsed,
  onToggle,
  sectionRef,
  children,
}: CollapsibleSectionProps) {
  return (
    <div ref={sectionRef} className="border-t border-gray-100 pt-4 scroll-mt-2">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer min-w-0"
        >
          {icon}
          <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
          {badge}
          <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        {headerRight && <div className="flex items-center gap-1.5 flex-shrink-0">{headerRight}</div>}
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: SECTION_ANIM_MS / 1000 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
