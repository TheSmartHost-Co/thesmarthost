'use client'

import { useRef, useCallback, useEffect } from 'react'

interface UseCalendarScrollOptions {
  slotWidth: number
  onRequestDateShift: (days: number) => void
  isDraggingRef?: React.MutableRefObject<boolean>
  onScrollFrame?: (scrollOffset: number) => void
}

interface UseCalendarScrollReturn {
  scrollOffsetRef: React.MutableRefObject<number>
  timelineRef: React.RefObject<HTMLDivElement | null>
  resetOffset: () => void
}

export function useCalendarScroll({
  slotWidth,
  onRequestDateShift,
  isDraggingRef,
  onScrollFrame,
}: UseCalendarScrollOptions): UseCalendarScrollReturn {
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const scrollOffsetRef = useRef(0)
  const slotWidthRef = useRef(slotWidth)
  const onRequestDateShiftRef = useRef(onRequestDateShift)
  const onScrollFrameRef = useRef(onScrollFrame)

  useEffect(() => { slotWidthRef.current = slotWidth }, [slotWidth])
  useEffect(() => { onRequestDateShiftRef.current = onRequestDateShift }, [onRequestDateShift])
  useEffect(() => { onScrollFrameRef.current = onScrollFrame }, [onScrollFrame])

  const resetOffset = useCallback(() => {
    scrollOffsetRef.current = 0
    onScrollFrameRef.current?.(0)
  }, [])

  // Advance offset, fire date-shift when crossing a column boundary
  // All callback refs are stable, so applyDelta never changes → listeners stay attached
  const applyDelta = useCallback((delta: number) => {
    const w = slotWidthRef.current
    let next = scrollOffsetRef.current + delta

    while (next >= w) {
      next -= w
      onRequestDateShiftRef.current(1)
    }
    while (next <= -w) {
      next += w
      onRequestDateShiftRef.current(-1)
    }

    scrollOffsetRef.current = next
    onScrollFrameRef.current?.(next)
  }, [])

  useEffect(() => {
    const el = timelineRef.current
    if (!el) return

    // --- Wheel / trackpad ---
    const handleWheel = (e: WheelEvent) => {
      let h = e.deltaX
      if (e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) h = e.deltaY
      const absH = Math.abs(h)
      const absV = Math.abs(e.shiftKey ? 0 : e.deltaY)
      // If there's any horizontal component, prevent browser back/forward navigation
      if (absH > 0) {
        e.preventDefault()
        e.stopPropagation()
      }

      // Skip tiny deltas or predominantly vertical scrolls for calendar movement
      if (absH < 2 || absH < absV) return

      // Mouse wheel gives large discrete deltas — scale down for smoother movement
      const scale = Math.abs(h) > 50 ? 0.4 : 1.0
      applyDelta(h * scale)
    }

    // --- Pointer drag ---
    let isDragging = false
    let lastX = 0

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest('button, a, [role="button"], [data-no-drag]')) return
      if (isDraggingRef?.current) return
      if (target.closest('[data-dnd-item]')) return
      isDragging = true
      lastX = e.clientX
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      e.preventDefault()
      const delta = lastX - e.clientX // drag left = move forward in time
      lastX = e.clientX
      applyDelta(delta)
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return
      isDragging = false
      el.releasePointerCapture(e.pointerId)
      el.style.cursor = ''
      el.style.userSelect = ''
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('pointerdown', handlePointerDown)
    el.addEventListener('pointermove', handlePointerMove)
    el.addEventListener('pointerup', handlePointerUp)
    el.addEventListener('pointercancel', handlePointerUp)

    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('pointerdown', handlePointerDown)
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', handlePointerUp)
      el.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [applyDelta])

  return { scrollOffsetRef, timelineRef, resetOffset }
}
