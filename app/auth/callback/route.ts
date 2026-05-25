import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getEnvSafe } from '@/lib/env'

// Magic-link / OAuth callback. Exchanges the one-time `code` for a session
// and forwards to `next` (defaults to "/").
//
// Why we don't use createServerSupabase here:
//   The shared helper writes cookies via `next/headers`'s cookies().set().
//   That works for server components, but in a route handler that returns
//   NextResponse.redirect(...), the cookies don't always carry over to the
//   redirect response — leaving the user "logged in" on the server but with
//   no session cookie in the browser. The first protected route they visit
//   bounces them back to /login.
//
//   The reliable pattern is to construct the redirect response up front and
//   pass the @supabase/ssr client a setAll() that writes directly to that
//   response's cookies. Then everything Supabase sets lands on the response
//   we actually return.
// Only allow relative paths anchored to our origin. Rejects:
//   - absolute URLs (http://evil.com, javascript:...)
//   - protocol-relative URLs (//evil.com — which would resolve as
//     `${base}//evil.com` and silently redirect off-domain)
//   - paths that fail to start with a forward slash
// Anything else falls back to /settings so a tampered magic link still
// lands on a sensible page.
function safeNextPath(raw: string | null): string {
  const fallback = '/settings'
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Same default as /login — meaningful landing page that proves the
  // session worked. Hardcoded fallback so a malformed magic link still
  // ends up somewhere sensible.
  const next = safeNextPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  // Honour proxy headers — when Vercel sits behind a custom domain, `origin`
  // from request.url is correct, but defensively prefer x-forwarded-host so
  // a future deployment behind a different proxy still produces the right
  // public URL. Falls back to origin when the header is absent.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const isLocal = process.env.NODE_ENV === 'development'
  const base = isLocal || !forwardedHost ? origin : `${proto}://${forwardedHost}`

  const response = NextResponse.redirect(`${base}${next}`)
  const env = getEnvSafe()

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(error.message)}`,
    )
  }

  return response
}
