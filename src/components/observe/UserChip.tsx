'use client'
// Observe console — avatar initials + name, linking to the user detail page.
// `unverified` = identity decoded from a token the route never verified (no
// auth middleware on it); shown as a hollow dashed avatar.
import Link from 'next/link'
import type { ObserveUserRef } from '@/services/types/observe'
import { RolePill } from './pills'
import { useObserveLinks } from './paths'

const initials = (name: string) =>
  name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

interface Props {
  user: ObserveUserRef | null
  href?: boolean
  compact?: boolean
  unverified?: boolean
}

export default function UserChip({ user, href = true, compact = false, unverified = false }: Props) {
  const links = useObserveLinks()
  if (!user) return <span className="text-xs text-gray-400">—</span>
  const avatar = unverified ? 'bg-white border border-dashed border-gray-400 text-gray-500' : 'bg-amber-100 text-amber-800'
  const body = (
    <span className="inline-flex items-center gap-2 min-w-0" title={unverified ? `${user.name} — identity from an unverified token` : undefined}>
      <span className={`h-6 w-6 shrink-0 rounded-full text-[10px] font-semibold flex items-center justify-center ${avatar}`}>
        {initials(user.name) || '?'}
      </span>
      <span className={`truncate text-sm ${unverified ? 'text-gray-500 italic' : 'text-gray-800'}`}>{user.name}</span>
      {!compact && user.role && <RolePill role={user.role} />}
    </span>
  )
  return href ? (
    <Link href={links.user(user.id)} className="hover:underline underline-offset-4 min-w-0" onClick={(e) => e.stopPropagation()}>
      {body}
    </Link>
  ) : (
    body
  )
}
