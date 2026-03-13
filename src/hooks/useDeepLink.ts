'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'

export type DeepLinkSection = 'issues' | 'supplies'

export interface DeepLinkResult {
  projectId: string | null
  section: DeepLinkSection | null
  view: string | null
}

/**
 * Reads deep-link query params once when `ready` becomes true,
 * calls the handler, then cleans the URL (removes query params).
 *
 * Uses a ref gate to fire exactly once, even across re-renders.
 *
 * @param onDeepLink - Callback receiving the parsed deep-link params
 * @param ready - Gate flag; set to true once page data is loaded
 */
export function useDeepLink(
  onDeepLink: (result: DeepLinkResult) => void,
  ready: boolean
): void {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const handledRef = useRef(false)

  useEffect(() => {
    if (!ready || handledRef.current) return

    const projectId = searchParams.get('projectId')
    const sectionRaw = searchParams.get('section')
    const view = searchParams.get('view')

    // Nothing to handle
    if (!projectId && !view) return

    const section: DeepLinkSection | null =
      sectionRaw === 'issues' || sectionRaw === 'supplies' ? sectionRaw : null

    handledRef.current = true
    onDeepLink({ projectId, section, view })

    // Clean the URL so Back button doesn't re-trigger
    router.replace(pathname)
  }, [ready, searchParams, pathname, router, onDeepLink])
}
