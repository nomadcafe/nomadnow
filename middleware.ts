import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit } from '@/lib/rate-limit'

const PROTECTED_PATHS = ['/create-card', '/settings', '/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit API writes (skip public read endpoints).
  if (pathname.startsWith('/api/')) {
    const isPublicRead =
      pathname.startsWith('/api/profile') ||
      pathname.startsWith('/api/health') ||
      pathname.startsWith('/api/users/check-handle') ||
      // Stripe webhooks come from a fixed pool of IPs; rate-limiting could
      // drop legitimate billing events during traffic spikes.
      pathname === '/api/billing/webhook'

    if (!isPublicRead) {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        'unknown'

      const rateLimit = await checkRateLimit(`api:${ip}`)

      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Too many requests', message: 'Rate limit exceeded. Please try again later.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(rateLimit.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
              'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            },
          }
        )
      }
    }
  }

  // Refresh the Supabase session for any non-static request so server components
  // and route handlers see a current user. Also gate protected pages.
  let response = NextResponse.next({ request })

  // Skip session work if Supabase env vars are missing or still placeholders —
  // lets `npm run dev` boot for UI-only inspection without a configured project.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const configured = supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')

  if (!configured) {
    return response
  }

  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  // Fast path for anonymous visitors. Supabase stores the session in cookies
  // named `sb-<ref>-auth-token` (chunked as `.0`, `.1`, …). With none present
  // the visitor is logged out, and calling getUser() would still cost a network
  // round-trip to the Auth server validating a session that doesn't exist — on
  // every navigation. Most traffic to public pages (profiles, landing) is
  // logged-out, so skip it. A protected path with no cookie redirects straight
  // to /login without consulting Supabase at all.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

  if (!hasAuthCookie) {
    if (isProtected) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  // Run on everything except Next internals and common static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
