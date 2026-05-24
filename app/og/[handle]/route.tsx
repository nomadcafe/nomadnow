import { ImageResponse } from 'next/og'
import { createServerSupabase } from '@/lib/supabase/server'
import { getCountryFlag } from '@/lib/countries'
import { isReservedHandle } from '@/lib/reserved-handles'
import { getTheme, type ThemeKey } from '@/lib/themes'

// OG share image rendered at request time via satori + resvg.
// 1200x630 is the canonical size for Twitter/LinkedIn/Facebook previews.
export const runtime = 'nodejs'

const W = 1200
const H = 630

type OgUser = {
  handle: string
  display_name?: string | null
  role?: string | null
  current_city?: string | null
  timezone?: string | null
  visited_countries?: string[] | null
  created_at?: string | null
  bio?: string | null
}

// Static mock used only when ?preview=1 — for visual QA without the DB.
const PREVIEW_USER: OgUser = {
  handle: 'kenji',
  display_name: 'Kenji Tanaka',
  role: 'Product Designer',
  current_city: 'Bangkok',
  timezone: 'Asia/Bangkok',
  visited_countries: ['TH', 'JP', 'PT', 'VN', 'MY', 'ID', 'PH', 'MX', 'ES', 'GE'],
  created_at: '2024-03-15T00:00:00.000Z',
  bio: 'Designer building tools for remote life. Slow traveler, fast typer.',
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params
  const url = new URL(request.url)
  const isPreview = url.searchParams.get('preview') === '1'
  const themeOverride = url.searchParams.get('theme') as ThemeKey | null

  if (!isPreview && isReservedHandle(handle)) {
    return new Response('Not found', { status: 404 })
  }

  let user: OgUser | null = null
  let themeKey: string | null = themeOverride

  if (isPreview) {
    user = { ...PREVIEW_USER, handle }
  } else {
    try {
      const supabase = await createServerSupabase()
      const lower = handle.toLowerCase()
      const { data: userData } = await supabase
        .from('users')
        .select('id, handle, display_name, role, current_city, timezone, visited_countries, created_at, bio')
        .eq('handle', lower)
        .maybeSingle()
      user = (userData as OgUser | null) ?? null
      if (userData?.id && !themeOverride) {
        const { data: settings } = await supabase
          .from('profile_settings')
          .select('theme_color')
          .eq('user_id', userData.id)
          .maybeSingle()
        themeKey = (settings?.theme_color as string | undefined) ?? null
      }
    } catch {
      // Fall through to placeholder render.
    }
  }

  const theme = getTheme(themeKey)
  const og = theme.og

  const displayName = user?.display_name || handle
  const role = user?.role || null
  const city = user?.current_city || null
  const visited = user?.visited_countries ?? []
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          background: og.bg,
          color: og.fg,
          padding: '60px 72px',
          fontFamily: og.fontFamily || 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: og.muted,
            fontSize: 24,
            marginBottom: 40,
          }}
        >
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
            nomad.now/<span style={{ color: og.brandFg, fontWeight: 600 }}>{handle}</span>
          </span>
          <span
            style={{
              background: og.pillBg,
              color: og.pillFg,
              border: `1px solid ${og.pillBorder}`,
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            Verified
          </span>
        </div>

        {/* Name + role */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 84,
              fontWeight: 600,
              color: og.fg,
              letterSpacing: '-0.025em',
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            {displayName}
          </span>
          {role && (
            <span style={{ fontSize: 32, color: og.muted, marginBottom: 28 }}>
              {role}
            </span>
          )}
        </div>

        {/* City */}
        {city && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 28,
              color: og.fg,
              marginBottom: 28,
            }}
          >
            <span>📍</span>
            <span style={{ fontWeight: 500 }}>{city}</span>
          </div>
        )}

        {/* Stat strip */}
        {(visited.length > 0 || memberSince) && (
          <div
            style={{
              display: 'flex',
              gap: 56,
              padding: '20px 0',
              borderTop: `1px solid ${og.divider}`,
              borderBottom: `1px solid ${og.divider}`,
              marginBottom: 28,
            }}
          >
            {visited.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 48, fontWeight: 600, color: og.fg, lineHeight: 1 }}>
                  {visited.length}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    color: og.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginTop: 6,
                  }}
                >
                  {visited.length === 1 ? 'country' : 'countries'}
                </span>
              </div>
            )}
            {memberSince && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 48, fontWeight: 600, color: og.fg, lineHeight: 1 }}>
                  {memberSince}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    color: og.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginTop: 6,
                  }}
                >
                  member since
                </span>
              </div>
            )}
          </div>
        )}

        {/* Flag row — anchored to bottom as the visual hook */}
        {visited.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: 52,
              lineHeight: 1,
              marginTop: 'auto',
              alignItems: 'flex-end',
            }}
          >
            {visited.slice(0, 14).map((code) => (
              <span key={code}>{getCountryFlag(code)}</span>
            ))}
            {visited.length > 14 && (
              <span style={{ fontSize: 26, color: og.muted }}>
                {`+${visited.length - 14}`}
              </span>
            )}
          </div>
        )}
      </div>
    ),
    {
      width: W,
      height: H,
      emoji: 'twemoji',
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
