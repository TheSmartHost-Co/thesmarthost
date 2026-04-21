'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { DECK_CARDS, type DeckCardId } from './constants'

export function useDeckNavigation() {
  const [activeIndex, setActiveIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion() ?? false
  const containerRef = useRef<HTMLDivElement>(null)

  const goTo = useCallback((index: number) => {
    setActiveIndex(Math.max(0, Math.min(index, DECK_CARDS.length - 1)))
  }, [])

  const goNext = useCallback(() => {
    setActiveIndex(prev => Math.min(prev + 1, DECK_CARDS.length - 1))
  }, [])

  const goPrev = useCallback(() => {
    setActiveIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const goToCard = useCallback((cardId: DeckCardId) => {
    const idx = DECK_CARDS.findIndex(c => c.id === cardId)
    if (idx >= 0) setActiveIndex(idx)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev])

  return {
    activeIndex,
    activeCardId: DECK_CARDS[activeIndex].id,
    goTo,
    goNext,
    goPrev,
    goToCard,
    prefersReducedMotion,
    containerRef,
  }
}
