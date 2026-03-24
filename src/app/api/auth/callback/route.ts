import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Auth Callback API Route
 *
 * Handles Supabase authentication redirects after invite/magic link verification.
 * Verifies the token_hash, creates a session, and redirects appropriately.
 *
 * For cleaners (role=CLEANER in user metadata):
 * - Redirects to /auth/set-password for first-time setup
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  console.log('[auth/callback] Received request:', {
    token_hash: token_hash ? 'present' : 'missing',
    type,
  })

  const redirectTo = request.nextUrl.clone()

  // Track cookies that need to be set on the response
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          // Store cookies to apply to the response later
          cookies.forEach((cookie) => {
            cookiesToSet.push(cookie)
          })
        },
      },
    }
  )

  // Handle PKCE code exchange (used by password recovery email links)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    console.log('[auth/callback] PKCE code exchange, next:', next)
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('[auth/callback] Code exchange failed:', error.message)
        redirectTo.pathname = '/login'
        redirectTo.search = '?message=auth-error'
        return NextResponse.redirect(redirectTo)
      }

      redirectTo.pathname = next || '/auth/callback'
      redirectTo.search = ''
      const response = NextResponse.redirect(redirectTo)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    } catch (err) {
      console.error('[auth/callback] Code exchange error:', err)
      redirectTo.pathname = '/login'
      redirectTo.search = '?message=auth-error'
      return NextResponse.redirect(redirectTo)
    }
  }

  // Must have token_hash and type for invite verification
  if (!token_hash || !type) {
    console.error('[auth/callback] Missing token_hash or type')
    redirectTo.pathname = '/login'
    redirectTo.search = '?message=verification-error'
    return NextResponse.redirect(redirectTo)
  }

  try {
    // Verify the OTP token and exchange it for a session
    console.log('[auth/callback] Verifying OTP token...')
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (error) {
      console.error('[auth/callback] verifyOtp error:', error.message)
      redirectTo.pathname = '/login'
      redirectTo.search = '?message=verification-error'
      return NextResponse.redirect(redirectTo)
    }

    console.log('[auth/callback] verifyOtp success:', {
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      role: data?.user?.user_metadata?.role,
      cookiesCount: cookiesToSet.length
    })

    const role = data?.user?.user_metadata?.role

    // Determine redirect destination
    if (type === 'recovery') {
      console.log('[auth/callback] Password recovery, redirecting to reset-password')
      redirectTo.pathname = '/reset-password'
      redirectTo.search = ''
    } else if (role === 'CLEANER' || role === 'TEAM_MEMBER' || role === 'CLIENT') {
      console.log(`[auth/callback] ${role} detected, redirecting to set-password`)
      redirectTo.pathname = '/auth/set-password'
      redirectTo.search = ''
    } else {
      console.log('[auth/callback] Non-cleaner role, redirecting to client callback')
      redirectTo.pathname = '/auth/callback'
      redirectTo.search = ''
    }

    // Create redirect response
    const response = NextResponse.redirect(redirectTo)

    // Apply all session cookies to the response
    console.log('[auth/callback] Setting cookies:', cookiesToSet.map(c => c.name))
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })

    return response

  } catch (error) {
    console.error('[auth/callback] Unexpected error:', error)
    redirectTo.pathname = '/login'
    redirectTo.search = '?message=auth-error'
    return NextResponse.redirect(redirectTo)
  }
}
