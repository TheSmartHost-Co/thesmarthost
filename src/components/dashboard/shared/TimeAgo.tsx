'use client'

import { useEffect, useState } from 'react'

interface TimeAgoProps {
  timestamp: string
  className?: string
}

export const TimeAgo: React.FC<TimeAgoProps> = ({ timestamp, className = '' }) => {
  const [timeAgo, setTimeAgo] = useState('')

  useEffect(() => {
    const calculateTimeAgo = () => {
      const now = new Date()
      const past = new Date(timestamp)
      const diffMs = now.getTime() - past.getTime()

      const diffMinutes = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMinutes < 1) {
        return 'Just now'
      } else if (diffMinutes < 60) {
        return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`
      } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
      } else if (diffDays === 1) {
        return 'Yesterday'
      } else if (diffDays < 7) {
        return `${diffDays} days ago`
      } else {
        return past.toLocaleDateString()
      }
    }

    setTimeAgo(calculateTimeAgo())

    // Update every minute
    const interval = setInterval(() => {
      setTimeAgo(calculateTimeAgo())
    }, 60000)

    return () => clearInterval(interval)
  }, [timestamp])

  return <span className={className}>{timeAgo}</span>
}
