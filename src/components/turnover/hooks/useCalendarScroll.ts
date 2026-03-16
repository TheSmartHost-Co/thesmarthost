'use client'

import { useRef, useCallback, useEffect } from 'react'

interface UseCalendarScrollOptions {
  slotWidth: number
  onRequestDateShift: (days: number) => void
  isDraggingRef?: React.MutableRefObject<boolean>
  onScrollFrame?: (scrollOffset: number) => void
  dragScale?: number
}

interface UseCalendarScrollReturn {
  scrollOffsetRef: React.MutableRefObject<number>
  pendingShiftRef: React.MutableRefObject<number>
  timelineRef: React.RefObject<HTMLDivElement | null>
  resetOffset: () => void
}

export function useCalendarScroll({
  slotWidth,
  onRequestDateShift,
  isDraggingRef,
  onScrollFrame,
  dragScale = 1,
}: UseCalendarScrollOptions): UseCalendarScrollReturn {
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const scrollOffsetRef = useRef(0)
  const slotWidthRef = useRef(slotWidth)
  const onRequestDateShiftRef = useRef(onRequestDateShift)
  const onScrollFrameRef = useRef(onScrollFrame)
  const dragScaleRef = useRef(dragScale)
  const pendingShiftRef = useRef(0)
  const rafIdRef = useRef<number>(0)

  useEffect(() => { slotWidthRef.current = slotWidth }, [slotWidth])
  useEffect(() => { onRequestDateShiftRef.current = onRequestDateShift }, [onRequestDateShift])
  useEffect(() => { onScrollFrameRef.current = onScrollFrame }, [onScrollFrame])
  useEffect(() => { dragScaleRef.current = dragScale }, [dragScale])

  const resetOffset = useCallback(() => {
    scrollOffsetRef.current = 0
    pendingShiftRef.current = 0
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
    }
    onScrollFrameRef.current?.(0)
  }, [])

  // Advance offset and write raw (un-wrapped) value to the DOM.
  // Buffer columns absorb overshoot. Date shift is RAF-batched so
  // React commit and offset-wrap happen atomically in useLayoutEffect.
  const applyDelta = useCallback((delta: number) => {
    const w = slotWidthRef.current
    if (w <= 0) return

    scrollOffsetRef.current += delta

    // Write raw (un-wrapped) offset to DOM — buffer columns absorb overshoot
    onScrollFrameRef.current?.(scrollOffsetRef.current)

    // Schedule batched date shift when offset crosses column boundaries
    if (!rafIdRef.current && Math.abs(scrollOffsetRef.current) >= w) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = 0
        const w2 = slotWidthRef.current
        if (w2 <= 0) return
        const totalShifts = Math.trunc(scrollOffsetRef.current / w2)
        const newShifts = totalShifts - pendingShiftRef.current
        if (newShifts !== 0) {
          pendingShiftRef.current = totalShifts
          onRequestDateShiftRef.current(newShifts)
        }
      })
    }
  }, [])

  useEffect(() => {
    const el = timelineRef.current
    if (!el) return

    // Tell the browser horizontal gestures are handled by JS,
    // suppressing the back/forward navigation swipe on mobile.
    el.style.touchAction = 'pan-y'

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
      applyDelta(delta * dragScaleRef.current)
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
      el.style.touchAction = ''
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('pointerdown', handlePointerDown)
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', handlePointerUp)
      el.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [applyDelta])

  return { scrollOffsetRef, pendingShiftRef, timelineRef, resetOffset }
}
