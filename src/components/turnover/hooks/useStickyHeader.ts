import { useRef, useState, useEffect, type RefObject } from 'react'

const NAVBAR_HEIGHT = 64

export function useStickyHeader(scrollRoot?: RefObject<HTMLElement | null>) {
  const headerRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return

    // When a scroll container is provided, use scroll-event-based detection
    if (scrollRoot?.current) {
      const container = scrollRoot.current
      const handleScroll = () => {
        setIsStuck(container.scrollTop > 0)
      }
      container.addEventListener('scroll', handleScroll, { passive: true })
      handleScroll() // check initial state
      return () => container.removeEventListener('scroll', handleScroll)
    }

    // Fallback: viewport-based IntersectionObserver
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting && entry.boundingClientRect.top < NAVBAR_HEIGHT)
      },
      { threshold: 0, rootMargin: `-${NAVBAR_HEIGHT}px 0px 0px 0px` }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollRoot])

  return { headerRef, isStuck }
}
