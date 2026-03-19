'use client'

import { useState, useEffect } from 'react'

function getInitialValue(breakpoint: number): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches
}

export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(() => getInitialValue(breakpoint))

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mql.matches)

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}
