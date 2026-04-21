'use client'

import React from 'react'

interface MatchConfidenceBadgeProps {
  score: number // 0-1
  matchType?: 'exact' | 'fuzzy' | 'new' | 'none'
}

export default function MatchConfidenceBadge({ score, matchType }: MatchConfidenceBadgeProps) {
  if (matchType === 'new' || (!score && matchType === 'none')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        No match
      </span>
    )
  }

  const pct = Math.round(score * 100)

  let bg: string
  let text: string
  let dot: string

  if (score >= 0.8) {
    bg = 'bg-emerald-50'
    text = 'text-emerald-700'
    dot = 'bg-emerald-500'
  } else if (score >= 0.5) {
    bg = 'bg-amber-50'
    text = 'text-amber-700'
    dot = 'bg-amber-500'
  } else {
    bg = 'bg-red-50'
    text = 'text-red-700'
    dot = 'bg-red-500'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {pct}%
    </span>
  )
}
