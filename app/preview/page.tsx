import { NomadCardServer } from '@/components/NomadCardServer'
import type { User, NomadLink } from '@/types/database'
import { THEME_KEYS, type ThemeKey } from '@/lib/themes'
import Link from 'next/link'

// Static preview of the NomadCard with mock data. No DB, no auth required —
// useful for design QA, marketing screenshots, and seeing the live UI
// before Supabase is wired up.

const previewUser: User = {
  id: 'preview-user-id',
  handle: 'kenji',
  display_name: 'Kenji Tanaka',
  avatar_url: 'https://i.pravatar.cc/240?img=12',
  bio: 'Designer building tools for remote life. Slow traveler, fast typer.',
  role: 'Product Designer',
  current_city: 'Bangkok',
  timezone: 'Asia/Bangkok',
  work_status: 'available',
  visited_countries: ['TH', 'JP', 'PT', 'VN', 'MY', 'ID', 'PH', 'MX', 'ES', 'GE'],
  // ~3 years on the road — exercises the "years nomading" stat in the
  // preview/QA route without needing any stays logged.
  nomad_since: '2022-04-01',
  // Show the chips in the QA preview so the status row variants get exercised.
  open_to_coffee: true,
  availability: 'open',
  profile_type: 'nomad',
  location: 'Bangkok',
  country: 'TH',
  website: 'https://kenji.dev',
  created_at: '2024-03-15T00:00:00.000Z',
  updated_at: new Date().toISOString(),
}

const previewLinks: NomadLink[] = [
  {
    id: 'l1',
    user_id: previewUser.id,
    type: 'instagram',
    url: 'https://instagram.com/kenji',
    order_index: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'l2',
    user_id: previewUser.id,
    type: 'other',
    label: 'Portfolio',
    url: 'https://kenji.dev',
    order_index: 1,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'l3',
    user_id: previewUser.id,
    type: 'linkedin',
    url: 'https://linkedin.com/in/kenji',
    order_index: 2,
    created_at: '',
    updated_at: '',
  },
]

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; order?: string; disable?: string; shape?: string; font?: string; linksLayout?: string }>
}) {
  const params = await searchParams
  const themeKey = (params.theme as ThemeKey | undefined) ?? 'classic'
  const buttonShape = params.shape ?? 'rounded'
  const fontFamily = params.font ?? 'theme'
  const linksLayout = params.linksLayout === 'rows' ? 'rows' : 'icons'
  // ?order=name,location,bio,stats,map,avatar,status,links — for design QA.
  const customOrder = params.order ? params.order.split(',').map((s) => s.trim()) : undefined
  // ?disable=bio,map — comma-separated section IDs to hide.
  const disabled = new Set(
    params.disable ? params.disable.split(',').map((s) => s.trim()) : []
  )
  const enabledSections = [
    'avatar',
    'name',
    'location',
    'bio',
    'stats',
    'map',
    'status',
    'links',
  ].filter((id) => !disabled.has(id))

  return (
    <>
      {/* Theme switcher — fixed, dev-only helper for visual QA. */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-white/90 backdrop-blur border border-gray-200 rounded-full px-2 py-1 shadow-lg text-xs">
        {THEME_KEYS.map((k) => (
          <Link
            key={k}
            href={`/preview?theme=${k}`}
            className={`px-3 py-1.5 rounded-full transition capitalize ${
              k === themeKey ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {k}
          </Link>
        ))}
      </div>
      <NomadCardServer
        user={previewUser}
        links={previewLinks}
        themeKey={themeKey}
        buttonShape={buttonShape}
        fontFamily={fontFamily}
        linksLayout={linksLayout}
        sectionOrder={customOrder}
        enabledSections={enabledSections}
        hideMakeYoursCTA
      />
    </>
  )
}
