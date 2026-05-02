'use client'

import React from 'react'

// ============================================
// Pill Types
// ============================================

export type PillKind = 'function' | 'column' | 'field_ref' | 'compare_op' | 'arithmetic_op'

export interface Pill {
  kind: PillKind
  label: string            // displayed text on the pill
  insertText: string       // text inserted into textarea on click
  description?: string     // tooltip text
  isFunctionWithParens?: boolean  // true → cursor positioned inside ()
}

export interface PillGroup {
  label?: string           // optional group header
  pills: Pill[]
  color: 'blue' | 'gray' | 'purple' | 'amber' | 'green'
}

// ============================================
// Color mapping
// ============================================

const COLOR_CLASSES: Record<PillGroup['color'], { bg: string; text: string; hoverBg: string; border: string }> = {
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   hoverBg: 'hover:bg-blue-200',   border: 'border-blue-200' },
  gray:   { bg: 'bg-gray-100',   text: 'text-gray-700',   hoverBg: 'hover:bg-gray-200',   border: 'border-gray-200' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', hoverBg: 'hover:bg-purple-200', border: 'border-purple-200' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  hoverBg: 'hover:bg-amber-200',  border: 'border-amber-200' },
  green:  { bg: 'bg-gray-100',   text: 'text-gray-600',   hoverBg: 'hover:bg-gray-200',   border: 'border-gray-200' },
}

// ============================================
// Component
// ============================================

interface ContextualPillBarProps {
  groups: PillGroup[]
  onPillClick: (pill: Pill) => void
  maxPillsPerGroup?: number
}

const ContextualPillBar: React.FC<ContextualPillBarProps> = ({
  groups,
  onPillClick,
  maxPillsPerGroup = 5,
}) => {
  // Filter out empty groups
  const visibleGroups = groups.filter(g => g.pills.length > 0)
  if (visibleGroups.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
      {visibleGroups.map((group, groupIdx) => {
        const colors = COLOR_CLASSES[group.color]
        const pills = group.pills.slice(0, maxPillsPerGroup)

        return (
          <React.Fragment key={`group-${groupIdx}`}>
            {/* Group separator */}
            {groupIdx > 0 && (
              <span className="text-xs text-gray-400 mx-0.5">|</span>
            )}

            {/* Optional group label */}
            {group.label && (
              <span className="text-[10px] text-gray-400 uppercase tracking-wider mr-0.5">
                {group.label}
              </span>
            )}

            {/* Pills */}
            {pills.map((pill) => (
              <button
                key={`${pill.kind}-${pill.insertText}`}
                type="button"
                onClick={() => onPillClick(pill)}
                className={`px-2 py-1 text-xs ${colors.bg} ${colors.text} ${colors.hoverBg} rounded border ${colors.border} font-mono transition-colors`}
                title={pill.description || pill.label}
              >
                {pill.label}
              </button>
            ))}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default ContextualPillBar
