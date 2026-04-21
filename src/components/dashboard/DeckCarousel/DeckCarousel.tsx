'use client'

import { useState, useRef, useEffect } from 'react'
import { LayoutGroup } from 'framer-motion'
import { DECK_CARDS } from './constants'
import { useDeckNavigation } from './useDeckNavigation'
import DeckCard from './DeckCard'
import DeckTabs from './DeckTabs'
import DeckDotIndicator from './DeckDotIndicator'
import type { DeckCardId } from './constants'

interface DeckCarouselProps {
  children: React.ReactNode[]
  onActiveCardChange?: (cardId: DeckCardId) => void
  externalActiveIndex?: number
}

export default function DeckCarousel({
  children,
  onActiveCardChange,
  externalActiveIndex,
}: DeckCarouselProps) {
  const {
    activeIndex,
    goTo,
    goNext,
    goPrev,
    prefersReducedMotion,
    containerRef,
  } = useDeckNavigation()

  // Sync with external index (from metrics strip clicks)
  const lastExternalRef = useRef(externalActiveIndex)
  useEffect(() => {
    if (
      externalActiveIndex !== undefined &&
      externalActiveIndex !== lastExternalRef.current
    ) {
      goTo(externalActiveIndex)
      lastExternalRef.current = externalActiveIndex
    }
  }, [externalActiveIndex, goTo])

  // Notify parent of changes
  useEffect(() => {
    onActiveCardChange?.(DECK_CARDS[activeIndex].id)
  }, [activeIndex, onActiveCardChange])

  // Announce card change for screen readers
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    setAnnouncement(`Showing ${DECK_CARDS[activeIndex].label} analytics`)
  }, [activeIndex])

  return (
    <LayoutGroup>
      <div className="space-y-2">
        {/* Tab bar (desktop) */}
        <DeckTabs activeIndex={activeIndex} onTabClick={goTo} />

        {/* Card stack */}
        <div
          ref={containerRef}
          tabIndex={0}
          role="region"
          aria-label="Analytics card deck"
          className="relative pb-4 outline-none"
          style={{ minHeight: 200 }}
        >
          {/* Screen reader announcement */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {announcement}
          </div>

          {children.map((child, i) => {
            // Compute depth: 0 = active, 1 = one away, 2 = two away
            const depth = Math.abs(i - activeIndex)
            // Only render cards within depth range
            if (depth > 2) return null

            return (
              <DeckCard
                key={DECK_CARDS[i]?.id ?? i}
                depth={depth}
                onNext={goNext}
                onPrev={goPrev}
                reducedMotion={prefersReducedMotion}
                enableDrag={true}
              >
                {child}
              </DeckCard>
            )
          })}
        </div>

        {/* Dot indicator (mobile) */}
        <DeckDotIndicator activeIndex={activeIndex} onDotClick={goTo} />
      </div>
    </LayoutGroup>
  )
}

export { useDeckNavigation } from './useDeckNavigation'
export { DECK_CARDS, type DeckCardId } from './constants'
