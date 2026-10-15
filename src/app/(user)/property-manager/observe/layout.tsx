import type { Metadata } from 'next'
import ObserveShell from '@/components/observe/ObserveShell'

// Platform-admin observability console. Admin gating lives in ObserveShell
// (and every /observe endpoint re-checks server-side, returning 403).
export const metadata: Metadata = {
  title: 'Observe',
  robots: { index: false, follow: false, nocache: true },
}

export default function ObserveLayout({ children }: { children: React.ReactNode }) {
  return <ObserveShell>{children}</ObserveShell>
}
