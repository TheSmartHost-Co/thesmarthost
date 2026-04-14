'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useImpersonationStore } from '@/store/useImpersonationStore'

/**
 * Maps portal path prefixes to the roles that are allowed to access them.
 */
const PORTAL_ROLES: Record<string, string[]> = {
  '/property-manager': ['PROPERTY-MANAGER', 'TEAM_MEMBER', 'ADMIN'],
  '/cleaner': ['CLEANER'],
  '/client': ['CLIENT'],
}

interface RoleGuardProps {
  /** The portal path prefix, e.g. "/property-manager" or "/cleaner" */
  portal: string
  children: React.ReactNode
}

/**
 * Wraps page content (NOT the navbar/sidebar) and blocks rendering
 * if the user's role doesn't match the portal. Shows a friendly
 * "Page Not Available" message and auto-redirects after 3 seconds.
 *
 * Place this inside the layout around {children} only — the navbar
 * and sidebar should render outside of this guard so they remain
 * visible during the redirect.
 */
export default function RoleGuard({ portal, children }: RoleGuardProps) {
  const router = useRouter()
  const profile = useUserStore((s) => s.profile)
  const getRedirectPath = useUserStore((s) => s.getRedirectPath)
  const { isImpersonating, target } = useImpersonationStore()
  const [blocked, setBlocked] = useState(false)

  const allowedRoles = PORTAL_ROLES[portal] || []
  const userRole = profile?.role

  useEffect(() => {
    // Wait until profile is loaded
    if (!profile) return

    // Allow access when PM or team member is impersonating and the target role matches this portal
    if (isImpersonating && target && allowedRoles.includes(target.role)) {
      setBlocked(false)
      return
    }
    // Team members impersonating: their role is TEAM_MEMBER but they should access client/cleaner portals
    if (isImpersonating && target && userRole === 'TEAM_MEMBER') {
      const portalForTarget = target.role === 'CLIENT' ? '/client' : target.role === 'CLEANER' ? '/cleaner' : null
      if (portalForTarget === portal) {
        setBlocked(false)
        return
      }
    }

    if (!userRole || !allowedRoles.includes(userRole)) {
      setBlocked(true)
      // Redirect to the correct dashboard after a brief delay
      const timer = setTimeout(() => {
        router.replace(getRedirectPath())
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [profile, userRole, allowedRoles, router, getRedirectPath, isImpersonating, target])

  if (blocked) {
    const portalLabel = portal === '/cleaner' ? 'cleaner' : portal === '/client' ? 'property owner' : 'property manager'
    const roleLabel = userRole === 'CLEANER' ? 'cleaner' : userRole === 'CLIENT' ? 'property owner' : 'property manager'

    return (
      <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 5rem)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-5 bg-amber-50 rounded-2xl flex items-center justify-center">
            <ShieldExclamationIcon className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Page Not Available
          </h2>
          <p className="text-gray-500 mb-6">
            This area is for {portalLabel}s. You&apos;re signed in as a {roleLabel}.
            Redirecting you to your dashboard...
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </motion.div>
      </div>
    )
  }

  return <>{children}</>
}
