'use client'

import { motion } from 'framer-motion'
import { DECK_CARDS } from './constants'

interface DeckDotIndicatorProps {
  activeIndex: number
  onDotClick: (index: number) => void
}

export default function DeckDotIndicator({
  activeIndex,
  onDotClick,
}: DeckDotIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3 sm:hidden">
      {DECK_CARDS.map((card, i) => (
        <button
          key={card.id}
          onClick={() => onDotClick(i)}
          aria-label={`Go to ${card.label} analytics`}
          className="relative flex h-6 w-6 items-center justify-center"
        >
          <motion.div
            animate={{
              scale: i === activeIndex ? 1 : 0.75,
              opacity: i === activeIndex ? 1 : 0.35,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`h-2 w-2 rounded-full ${
              i === activeIndex ? 'bg-gray-900' : 'bg-gray-400'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
