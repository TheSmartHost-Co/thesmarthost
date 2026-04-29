'use client'

import {
  CheckIcon,
  ExclamationTriangleIcon,
  MinusIcon,
} from '@heroicons/react/24/outline'
import type { WizardStepEntry } from '@/hooks/useSendToQbWizardDraft'

interface SendToQbStepProgressProps {
  steps: WizardStepEntry[]
  currentIndex: number
  onNavigate: (index: number) => void
}

/**
 * Horizontal step strip showing each expense in the wizard with a colored
 * status dot. Click a dot to jump to that step (allows revisiting staged
 * steps). The strip also shows a quick-glance summary of staged / skipped /
 * blocked counts so the user knows where they stand.
 *
 *   ● = currently on this step
 *   ✓ = staged (will be sent)
 *   ⚠ = blocked (preflight issue — can be skipped, not staged)
 *   – = skipped (explicitly excluded)
 *   ○ = pending-config (not yet reviewed)
 */
export default function SendToQbStepProgress({
  steps,
  currentIndex,
  onNavigate,
}: SendToQbStepProgressProps) {
  const stagedCount = steps.filter((s) => s.stepStatus === 'staged').length
  const skippedCount = steps.filter((s) => s.stepStatus === 'skipped').length
  const blockedCount = steps.filter((s) => s.stepStatus === 'blocked').length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">
          Expense {currentIndex + 1} of {steps.length}
        </span>
        <span className="text-gray-500">
          <span className="text-emerald-700 font-medium">{stagedCount} staged</span>
          {skippedCount > 0 && (
            <>
              {' · '}
              <span className="text-gray-500">{skippedCount} skipped</span>
            </>
          )}
          {blockedCount > 0 && (
            <>
              {' · '}
              <span className="text-amber-700 font-medium">{blockedCount} blocked</span>
            </>
          )}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {steps.map((step, i) => {
          const isCurrent = i === currentIndex
          let bg = 'bg-gray-200 text-gray-500'
          let icon: React.ReactNode = null
          let title = `Expense ${i + 1}`

          switch (step.stepStatus) {
            case 'staged':
              bg = 'bg-emerald-500 text-white'
              icon = <CheckIcon className="w-3 h-3" />
              title += ' · staged'
              break
            case 'blocked':
              bg = 'bg-amber-400 text-white'
              icon = <ExclamationTriangleIcon className="w-3 h-3" />
              title += ' · blocked'
              break
            case 'skipped':
              bg = 'bg-gray-300 text-gray-600'
              icon = <MinusIcon className="w-3 h-3" />
              title += ' · skipped'
              break
            case 'configured':
              bg = 'bg-blue-300 text-white'
              title += ' · configured'
              break
            default:
              title += ' · pending'
          }

          // Override for current step — outline ring regardless of inner color.
          const ring = isCurrent ? 'ring-2 ring-emerald-600 ring-offset-1' : ''

          return (
            <button
              key={step.expenseId}
              type="button"
              onClick={() => onNavigate(i)}
              title={title}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all ${bg} ${ring} hover:opacity-80`}
            >
              {icon || i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}
