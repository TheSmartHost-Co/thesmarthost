'use client'

interface SidebarTooltipProps {
  label: string
  children: React.ReactNode
}

export default function SidebarTooltip({ label, children }: SidebarTooltipProps) {
  return (
    <div className="group/tooltip relative">
      {children}
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150">
        <div className="whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
          {label}
        </div>
      </div>
    </div>
  )
}
