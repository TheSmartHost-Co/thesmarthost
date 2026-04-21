'use client'

import { motion } from 'framer-motion'
import { DECK_CARDS } from './constants'

interface DeckTabsProps {
  activeIndex: number
  onTabClick: (index: number) => void
}

export default function DeckTabs({ activeIndex, onTabClick }: DeckTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Analytics sections"
      className="hidden items-center gap-1 sm:flex"
    >
      {DECK_CARDS.map((card, i) => (
        <button
          key={card.id}
          role="tab"
          aria-selected={i === activeIndex}
          aria-controls={`deck-panel-${card.id}`}
          onClick={() => onTabClick(i)}
          className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            i === activeIndex
              ? 'text-gray-900'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {card.label}
          {i === activeIndex && (
            <motion.div
              layoutId="deck-tab-indicator"
              className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-gray-900"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
