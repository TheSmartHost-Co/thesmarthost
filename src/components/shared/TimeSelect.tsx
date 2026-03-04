'use client'

import { ChevronUpDownIcon } from '@heroicons/react/24/outline'

interface TimeSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

// Generate 15-minute interval time options (96 total)
function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`
      options.push({ value, label })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

/**
 * Rounds a time string (HH:MM or HH:MM:SS) to the nearest 15-minute interval.
 * Use when pre-populating from existing data that may not be on a 15-min boundary.
 */
export function roundToNearest15(time: string): string {
  if (!time) return ''
  const parts = time.split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return ''
  const roundedM = Math.round(m / 15) * 15
  const adjustedH = roundedM === 60 ? (h + 1) % 24 : h
  const finalM = roundedM === 60 ? 0 : roundedM
  return `${String(adjustedH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`
}

export default function TimeSelect({ value, onChange, placeholder = 'Select time' }: TimeSelectProps) {
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
        {TIME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronUpDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}
