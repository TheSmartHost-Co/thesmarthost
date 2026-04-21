export const DECK_SPRING = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 35,
  mass: 0.5,
}

export const DECK_INSTANT = {
  duration: 0,
}

export const DECK_CARDS = [
  { id: 'cleaners', label: 'Cleaners' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'expenses', label: 'Expenses' },
] as const

export type DeckCardId = (typeof DECK_CARDS)[number]['id']

export const DEPTH_CONFIG = [
  { scale: 1.0, y: 0, z: 30, shadow: '0 20px 40px -12px rgba(0,0,0,0.15)' },
  { scale: 0.98, y: 6, z: 20, shadow: '0 10px 20px -8px rgba(0,0,0,0.10)' },
  { scale: 0.96, y: 12, z: 10, shadow: '0 4px 12px -4px rgba(0,0,0,0.06)' },
] as const

// Max height for behind cards — just enough to show the rounded top edge peeking
export const BEHIND_CARD_MAX_HEIGHT = 56

export const SWIPE_THRESHOLD = 50
export const VELOCITY_THRESHOLD = 300
