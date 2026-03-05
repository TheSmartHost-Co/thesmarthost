'use client'

import { useState, useEffect, useMemo } from 'react'
import { formatLocalDate } from '../utils/calendarDateUtils'

interface NowPosition {
  dayIndex: number
  subDayFraction: number // 0-1 within the day
}

export function useNowIndicator(
  allDates: string[],
  hourStart: number = 0,
  hourEnd: number = 24,
): NowPosition | null {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return useMemo(() => {
    const todayStr = formatLocalDate(now)
    const dayIndex = allDates.indexOf(todayStr)
    if (dayIndex === -1) return null

    const totalMinutes = (hourEnd - hourStart) * 60
    const currentMinutes = (now.getHours() - hourStart) * 60 + now.getMinutes()
    const subDayFraction = Math.max(0, Math.min(1, currentMinutes / totalMinutes))

    return { dayIndex, subDayFraction }
  }, [now, allDates, hourStart, hourEnd])
}
