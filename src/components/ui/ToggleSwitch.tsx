'use client'

/**
 * The project's switch control.
 *
 * The 8-line switch markup was previously copy-pasted into every settings page
 * and into AutomationSettingsPanel. The notification preferences matrix renders
 * up to ~150 of them, so it lives here now.
 *
 * Presentational only: it owns no state and does no saving. Callers decide
 * whether a change saves immediately or accumulates into a batch.
 */

type ToggleSize = 'sm' | 'md' | 'lg'
type ToggleColor = 'blue' | 'amber' | 'green' | 'purple'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  size?: ToggleSize
  color?: ToggleColor
  /** Required: these switches are usually rendered in a grid with no visible label. */
  ariaLabel: string
  className?: string
}

// `lg` is the touch-first size: 28x48 on phones, collapsing to the desktop 24x44
// at sm:. It exists because neither sm (20x36) nor md (24x44) meets the 44x44
// minimum, and the primary users of the preferences matrix are on phones.
// Matches the repo's established `min-h-[44px] sm:min-h-0` convention.
const TRACK: Record<ToggleSize, string> = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
  lg: 'h-7 w-12 sm:h-6 sm:w-11',
}

const KNOB: Record<ToggleSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6 sm:h-5 sm:w-5',
}

// Travel must be recomputed per breakpoint: a w-12 track with a w-6 knob needs
// translate-x-6, not translate-x-5. The hand-rolled copies of this switch on the
// cleaner/contractor settings pages get this wrong and under-travel by 4px.
const KNOB_ON: Record<ToggleSize, string> = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  lg: 'translate-x-6 sm:translate-x-5',
}

const ON_COLOR: Record<ToggleColor, string> = {
  blue: 'bg-blue-600',
  amber: 'bg-amber-500',
  green: 'bg-green-600',
  purple: 'bg-purple-600',
}

export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  color = 'blue',
  ariaLabel,
  className = '',
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${TRACK[size]} flex-shrink-0 touch-manipulation rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? ON_COLOR[color] : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <span
        className={`pointer-events-none inline-block ${KNOB[size]} transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? KNOB_ON[size] : 'translate-x-0'
        }`}
      />
    </button>
  )
}
