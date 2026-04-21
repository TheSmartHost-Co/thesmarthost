'use client'

import type { DashboardMetrics } from '@/services/types/dashboard'
import type { DeckCardId } from '../DeckCarousel/constants'
import MetricChip from './MetricChip'

interface MetricsStripProps {
  metrics: DashboardMetrics
  activeCardId?: DeckCardId
  onNavigateToCard?: (cardId: DeckCardId) => void
}

interface ChipDef {
  label: string
  value: string | number
  change?: number
  isCurrency?: boolean
  cardId?: DeckCardId
}

export default function MetricsStrip({
  metrics,
  activeCardId,
  onNavigateToCard,
}: MetricsStripProps) {
  const chips: ChipDef[] = [
    {
      label: 'Properties',
      value: metrics.properties.active,
    },
    {
      label: 'Clients',
      value: metrics.clients.total,
    },
    {
      label: 'Bookings',
      value: metrics.bookings.thisMonth,
      change: metrics.bookings.change,
      cardId: 'bookings',
    },
    {
      label: 'Revenue',
      value: metrics.revenue.thisMonth,
      change: metrics.revenue.change,
      isCurrency: true,
      cardId: 'bookings',
    },
    {
      label: 'Cleanings',
      value: metrics.cleaningProjects?.thisMonth ?? 0,
      change: metrics.cleaningProjects?.change,
      cardId: 'cleaners',
    },
    {
      label: 'Expenses',
      value: metrics.expenses.thisMonth,
      change: metrics.expenses.change,
      isCurrency: true,
      cardId: 'expenses',
    },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto px-0.5 pb-1 scrollbar-hide snap-x snap-mandatory sm:flex-wrap sm:overflow-visible">
      {chips.map(chip => (
        <MetricChip
          key={chip.label}
          label={chip.label}
          value={chip.value}
          change={chip.change}
          isCurrency={chip.isCurrency}
          isActive={chip.cardId !== undefined && chip.cardId === activeCardId}
          onClick={
            chip.cardId && onNavigateToCard
              ? () => onNavigateToCard(chip.cardId!)
              : undefined
          }
        />
      ))}
    </div>
  )
}
