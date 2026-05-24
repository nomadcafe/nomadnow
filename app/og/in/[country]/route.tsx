import { ImageResponse } from 'next/og'
import { createServerSupabase } from '@/lib/supabase/server'
import { codeForSlug, getCountryName, getCountryFlag } from '@/lib/countries'

// OG share image for /in/[country] pages. 1200×630 PNG with big flag,
// country name, and live nomad count. Pairs with the page metadata so
// Twitter/LinkedIn previews are flag-driven, not bare text.
export const runtime = 'nodejs'

const W = 1200
const H = 630

async function countNomadsInCountry(code: string): Promise<number> {
  try {
    const env = await import('@/lib/env').then((m) => m.getEnvSafe())
    if (env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) return 0
    const supabase = await createServerSupabase()
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .contains('visited_countries', [code])
    return count ?? 0
  } catch {
    return 0
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ country: string }> }
) {
  const { country: slug } = await params
  const code = codeForSlug(slug)

  if (!code) {
    return new Response('Not found', { status: 404 })
  }

  const name = getCountryName(code)
  const flag = getCountryFlag(code)
  const count = await countNomadsInCountry(code)

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #f0f9ff 100%)',
          padding: '60px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#111827',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#6b7280',
            fontSize: 22,
            marginBottom: 40,
          }}
        >
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
            nomad.now
            <span style={{ color: '#111827', fontWeight: 600 }}>/in/{slug}</span>
          </span>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              color: '#374151',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            The nomad map
          </span>
        </div>

        {/* Body — flag-driven hero */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <div style={{ fontSize: 220, lineHeight: 1, marginBottom: 24 }}>{flag}</div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'baseline',
              gap: 16,
            }}
          >
            <span style={{ color: '#9ca3af' }}>Nomads in</span>
            <span>{name}</span>
          </div>
        </div>

        {/* Footer — live count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 26,
            color: '#374151',
            marginTop: 20,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 38, color: '#111827' }}>
            {count > 0 ? count : 'Be the first'}
          </span>
          {count > 0 && (
            <span style={{ color: '#6b7280' }}>
              {count === 1 ? 'nomad has' : 'nomads have'} set foot here
            </span>
          )}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      emoji: 'twemoji',
      headers: {
        // Country counts move slowly — long cache, fast revalidation.
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
