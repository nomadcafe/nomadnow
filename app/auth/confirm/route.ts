import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getEnvSafe } from '@/lib/env'

// Email-link confirmation via token_hash + verifyOtp — the cross-device-safe
// counterpart to /auth/callback.
//
// Why this exists (the mobile login bug):
//   The default PKCE magic-link flow (/auth/callback's exchangeCodeForSession)
//   needs the `code_verifier` cookie that signInWithOtp stored in the browser
//   that REQUESTED the link. On phones the email is often opened in a different
//   browser (Gmail/Mail in-app webview) than the one that requested it, so the
//   verifier cookie is absent and the exchange fails — the user looks "not
//   logged in" even though the link was valid. Desktop works because the link
//   opens in the same browser.
//
//   verifyOtp({ token_hash }) carries no PKCE dependency, so it succeeds in ANY
//   browser/device. This is Supabase's recommended flow for email links that
//   must survive a context switch.
//
// REQUIRED Supabase config: point the "Magic Link" email template at
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
// (instead of {{ .ConfirmationURL }}). OAuth keeps using /auth/callback.

// Mirrors /auth/callback: only relative, origin-anchored paths; anything else
// falls back to a sensible signed-in landing page.
function safeNextPath(raw: string | null): string {
  const fallback = '/edit/look'
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}

// Whitelist the OTP types Supabase can send for an email link, so a tampered
// `type` param can't be forwarded verbatim into verifyOtp.
const VALID_TYPES: ReadonlySet<string> = new Set([
  'email',
  'magiclink',
  'signup',
  'recovery',
  'invite',
  'email_change',
])

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const rawType = searchParams.get('type')
  const next = safeNextPath(searchParams.get('next'))

  // Same proxy-aware base-URL handling as /auth/callback.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const isLocal = process.env.NODE_ENV === 'development'
  const base = isLocal || !forwardedHost ? origin : `${proto}://${forwardedHost}`

  if (!tokenHash || !rawType || !VALID_TYPES.has(rawType)) {
    return NextResponse.redirect(`${base}/login?error=invalid_link`)
  }
  const type = rawType as EmailOtpType

  // Build the redirect response up front and let Supabase write the session
  // cookies directly onto it — the same reason /auth/callback does this, so
  // the Set-Cookie headers actually ride along with the redirect.
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

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(error.message)}`,
    )
  }

  return response
}
