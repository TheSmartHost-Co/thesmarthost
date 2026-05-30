'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface SettingsNavSection {
  id: string
  label: string
  icon?: React.ReactNode
}

interface SettingsSectionNavProps {
  sections: SettingsNavSection[]
}

// Distance from the top of the viewport where a section is considered "active".
// Clears the fixed app navbar (~72px) plus this sticky tab bar (~52px).
const ACTIVE_OFFSET = 160

/**
 * Sticky horizontal tab bar for the Settings page. Clicking a tab smooth-scrolls
 * to the matching section; the active tab tracks scroll position. The section
 * elements are expected to carry matching `id`s and a `scroll-mt-*` so they land
 * below this bar when jumped to.
 */
const SettingsSectionNav: React.FC<SettingsSectionNavProps> = ({ sections }) => {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  // While a tab-click smooth-scroll is in flight, hold this id active and ignore
  // the intermediate sections the scrollspy would otherwise flicker through.
  const pendingTargetRef = useRef<string | null>(null)
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const computeActive = useCallback(() => {
    let current = sections[0]?.id ?? ''
    for (const section of sections) {
      const el = document.getElementById(section.id)
      if (!el) continue
      // The last section whose top has scrolled above the offset is the active one.
      if (el.getBoundingClientRect().top - ACTIVE_OFFSET <= 0) {
        current = section.id
      }
    }

    // At (or near) the bottom of the page the last sections can't reach the top,
    // so force the final section active once we've scrolled all the way down.
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 4
    if (atBottom && sections.length > 0) {
      current = sections[sections.length - 1].id
    }

    // Hold the clicked tab until the scroll actually arrives at it.
    if (pendingTargetRef.current) {
      if (current === pendingTargetRef.current) {
        pendingTargetRef.current = null
        setActiveId(current)
      }
      return
    }

    setActiveId(current)
  }, [sections])

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(computeActive)
    }
    computeActive()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [computeActive])

  // Keep the active tab visible within the horizontally scrollable bar.
  useEffect(() => {
    tabRefs.current[activeId]?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth',
    })
  }, [activeId])

  const handleClick = (id: string) => {
    pendingTargetRef.current = id
    setActiveId(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    // Safety release: if the target can't ever satisfy the offset (e.g. a short
    // section), drop the lock after the scroll has had time to settle.
    if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current)
    lockTimeoutRef.current = setTimeout(() => {
      pendingTargetRef.current = null
    }, 900)
  }

  // Clean up the safety timeout on unmount.
  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current)
    }
  }, [])

  return (
    <div className="sticky top-20 sm:top-[4.5rem] z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 bg-white border-b border-gray-100 shadow-sm">
      <style>{`.settings-tabs-scroll::-webkit-scrollbar{display:none}`}</style>
      <nav
        className="settings-tabs-scroll flex items-center gap-1.5 overflow-x-auto py-2.5"
        style={{ scrollbarWidth: 'none' }}
        aria-label="Settings sections"
      >
        {sections.map((section) => {
          const isActive = section.id === activeId
          return (
            <button
              key={section.id}
              ref={(el) => {
                tabRefs.current[section.id] = el
              }}
              type="button"
              onClick={() => handleClick(section.id)}
              aria-current={isActive ? 'true' : undefined}
              className={`group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              {section.icon && (
                <span
                  className={`h-4 w-4 ${
                    isActive ? 'text-white' : 'text-blue-500 group-hover:text-blue-600'
                  }`}
                >
                  {section.icon}
                </span>
              )}
              {section.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default SettingsSectionNav
