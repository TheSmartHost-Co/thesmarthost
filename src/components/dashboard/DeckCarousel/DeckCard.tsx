'use client'

import { motion } from 'framer-motion'
import {
  DECK_SPRING,
  DECK_INSTANT,
  DEPTH_CONFIG,
  BEHIND_CARD_MAX_HEIGHT,
  SWIPE_THRESHOLD,
  VELOCITY_THRESHOLD,
} from './constants'

interface DeckCardProps {
  depth: number // 0 = active, 1 = behind, 2 = deeper
  onNext: () => void
  onPrev: () => void
  reducedMotion: boolean
  enableDrag: boolean
  children: React.ReactNode
}

export default function DeckCard({
  depth,
  onNext,
  onPrev,
  reducedMotion,
  enableDrag,
  children,
}: DeckCardProps) {
  const clampedDepth = Math.min(depth, DEPTH_CONFIG.length - 1)
  const config = DEPTH_CONFIG[clampedDepth]
  const isActive = depth === 0
  const transition = reducedMotion ? DECK_INSTANT : DECK_SPRING

  return (
    <motion.div
      animate={{
        scale: reducedMotion ? 1 : config.scale,
        y: reducedMotion ? 0 : config.y,
        boxShadow: config.shadow,
        opacity: reducedMotion && !isActive ? 0 : 1,
      }}
      transition={transition}
      drag={isActive && enableDrag && !reducedMotion ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      dragDirectionLock
      onDragEnd={(_, info) => {
        if (
          info.offset.x < -SWIPE_THRESHOLD ||
          info.velocity.x < -VELOCITY_THRESHOLD
        ) {
          onNext()
        } else if (
          info.offset.x > SWIPE_THRESHOLD ||
          info.velocity.x > VELOCITY_THRESHOLD
        ) {
          onPrev()
        }
      }}
      style={{
        zIndex: config.z,
        position: isActive ? 'relative' : 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        pointerEvents: isActive ? 'auto' : 'none',
        ...(isActive ? {} : { maxHeight: BEHIND_CARD_MAX_HEIGHT }),
      }}
      aria-hidden={!isActive}
      className={`rounded-2xl bg-white ${!isActive ? 'overflow-hidden border border-gray-200' : ''}`}
    >
      {children}
    </motion.div>
  )
}
