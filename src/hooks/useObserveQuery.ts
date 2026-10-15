'use client'
// Observe console — one fetch per page. When the window (or a dep) changes the
// old data is cleared, so charts never draw old-window data under new-window
// labels. While Live is on it silently refreshes every 30 s, keeping the last
// good data on screen; polling pauses while the tab is hidden and catches up
// when it becomes visible again.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useObserveStore } from '@/store/useObserveStore'
import type { WindowKey } from '@/services/types/observe'

const LIVE_INTERVAL_MS = 30000

export function useObserveQuery<T>(fetcher: (window: WindowKey) => Promise<T>, deps: unknown[] = []) {
  const window = useObserveStore((s) => s.window)
  const live = useObserveStore((s) => s.live)
  const setLastRefreshed = useObserveStore((s) => s.setLastRefreshed)
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const seq = useRef(0)
  const lastLoadAt = useRef(0)

  const load = useCallback(
    async (silent: boolean) => {
      const id = ++seq.current
      lastLoadAt.current = Date.now()
      if (!silent) {
        // New window / deps: drop the previous result instead of showing it stale.
        setData(null)
        setError(null)
        setLoading(true)
      }
      try {
        const result = await fetcher(window)
        if (id !== seq.current) return
        setData(result)
        setError(null)
        setLastRefreshed(Date.now())
      } catch (e) {
        if (id !== seq.current) return
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (id === seq.current) setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [window, setLastRefreshed, ...deps]
  )

  useEffect(() => {
    load(false)
  }, [load])

  useEffect(() => {
    if (!live) return
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (!timer) timer = setInterval(() => load(true), LIVE_INTERVAL_MS)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }
    const onVisibility = () => {
      if (document.hidden) return stop()
      if (Date.now() - lastLoadAt.current >= LIVE_INTERVAL_MS) load(true)
      start()
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [live, load])

  return { data, error, loading, refetch: () => load(true), window }
}
