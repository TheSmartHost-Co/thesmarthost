// Observe console — a white card with an optional header.
import { ReactNode } from 'react'

interface PanelProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}

export default function Panel({ title, subtitle, actions, children, className = '', padded = true }: PanelProps) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={padded ? 'px-5 pb-5' : 'pb-1'}>{children}</div>
    </section>
  )
}
