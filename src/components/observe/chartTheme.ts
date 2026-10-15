// Observe console — one light palette for every chart. Colour is semantic:
// amber is "the" series (SmartHost's accent), rose is errors, orange is
// warnings, emerald is healthy. Extra categorical series take the ordered list.
export const C = {
  primary: '#f59e0b', // amber-500
  bad: '#e11d48', // rose-600
  warn: '#f97316', // orange-500
  good: '#10b981', // emerald-500
  sky: '#0ea5e9', // sky-500
  pink: '#ec4899', // pink-500 — browser errors
  muted: '#6b7280', // gray-500
  text: '#111827', // gray-900
  grid: '#f3f4f6', // gray-100
  series: ['#f59e0b', '#0ea5e9', '#8b5cf6', '#10b981', '#64748b', '#ec4899', '#f97316', '#14b8a6'],
}

export const axisProps = { tick: { fill: C.muted, fontSize: 11 }, axisLine: false, tickLine: false } as const

export const tooltipProps = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    fontSize: 12,
    color: C.text,
    boxShadow: '0 10px 25px -10px rgba(17,24,39,0.15)',
  },
  labelStyle: { color: '#6b7280', marginBottom: 4 },
  itemStyle: { color: C.text, padding: 0 },
  cursor: { stroke: '#d1d5db' },
} as const

export const legendStyle = { fontSize: 11, color: '#6b7280' } as const
