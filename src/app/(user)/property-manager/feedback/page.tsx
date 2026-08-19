'use client'

import MyFeedbackView from '@/components/feedback/MyFeedbackView'

// Thin shell: the list lives in MyFeedbackView so the property-manager and
// cleaner routes render exactly the same thing and can't drift.
export default function FeedbackPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <MyFeedbackView />
    </div>
  )
}
