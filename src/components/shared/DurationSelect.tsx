'use client'

import { ChevronUpDownIcon } from '@heroicons/react/24/outline'

interface DurationSelectProps {
  value: string // minutes as string
  onChange: (value: string) => void
  placeholder?: string
}

// Generate 15-minute interval duration options from 15m to 8h
function generateDurationOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let m = 15; m <= 480; m += 15) {
    const hours = Math.floor(m / 60)
    const mins = m % 60
    let label: string
    if (hours > 0 && mins > 0) label = `${hours}h ${mins}m`
    else if (hours > 0) label = `${hours} hour${hours > 1 ? 's' : ''}`
    else label = `${mins} min`
    options.push({ value: String(m), label })
  }
  return options
}

const DURATION_OPTIONS = generateDurationOptions()

/**
 * Rounds a duration in minutes to the nearest 15-minute interval.
 * Clamps between 15 and 480 (8 hours).
 */
export function roundDurationToNearest15(minutes: number): string {
  if (!minutes || minutes <= 0) return ''
  const rounded = Math.round(minutes / 15) * 15
  return String(Math.max(15, Math.min(480, rounded)))
}

export default function DurationSelect({ value, onChange, placeholder = 'Select duration' }: DurationSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none pl-3 pr-9 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer ${
          value ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        <option value="">{placeholder}</option>
        {DURATION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronUpDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}
