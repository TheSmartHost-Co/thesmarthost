'use client'

import FeedbackBacklogView from '@/components/feedback/FeedbackBacklogView'

// Admin gating lives inside the view (and is re-checked server-side on every
// endpoint) — this shell is deliberately dumb.
export default function FeedbackBacklogPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <FeedbackBacklogView />
    </div>
  )
}
