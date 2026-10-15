'use client'
// Observe console — a small pill-style segmented toggle.

interface Props<T extends string> {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  label?: (v: T) => string
  ariaLabel?: string
}

export default function SegmentedControl<T extends string>({ options, value, onChange, label, ariaLabel }: Props<T>) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`px-3 py-1 rounded-md text-xs font-semibold tabular-nums transition-colors ${
            value === o ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {label ? label(o) : o}
        </button>
      ))}
    </div>
  )
}
