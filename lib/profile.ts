import { cache } from 'react'
import { createServerSupabase } from './supabase/server'
import { handleSchema } from './validation'
import { logError } from './errors'
import { findUnsafeUrls } from './safe-browsing'
import type {
  User,
  ProfileSettings,
  NomadLink,
  NomadStay,
  NomadBlurb,
  NomadFeaturedWork,
} from '@/types/database'

// Single source of truth for the public-profile read. Used by:
//   - app/[handle]/page.tsx (server component + generateMetadata)
//   - app/api/profile/[handle]/route.ts (delegates here)
// Wrapped in React's request-scoped cache() so generateMetadata and the page
// body share a single DB roundtrip per request.
//
// Allow-list of columns safe to return on a public profile request.
// NEVER add billing columns (stripe_customer_id, subscription_id,
// subscription_status, current_period_end) — they leak Stripe identifiers
// to any visitor. `plan` is intentionally included so the public card can
// render Pro-only features.
const PUBLIC_USER_COLUMNS =
  'id,handle,display_name,avatar_url,country,bio,website,location,role,current_city,work_status,timezone,visited_countries,nomad_since,profile_type,verified,hire_cta_label,hire_cta_url,meetup_cta_label,meetup_cta_url,open_to_coffee,plan,created_at,updated_at' as const

export interface PublicProfile {
  user: User
  settings: ProfileSettings | undefined
  nomadLinks: NomadLink[]
  nomadStays: NomadStay[]
  nomadBlurbs: NomadBlurb[]
  nomadFeaturedWorks: NomadFeaturedWork[]
}

export const getProfileByHandle = cache(
  async (rawHandle: string): Promise<PublicProfile | null> => {
    // Normalize before validate so "Kenji" and "kenji" share a cache entry
    // and hit the same DB row. Handles are stored lowercase by signup.
    const lower = rawHandle.toLowerCase()
    const validation = handleSchema.safeParse(lower)
    if (!validation.success) return null
    const handle = validation.data

    const supabase = await createServerSupabase()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(PUBLIC_USER_COLUMNS)
      .eq('handle', handle)
      .single()
    if (userError) {
      // PGRST116 = "no rows returned" — that's the genuine 404 path and
      // doesn't deserve a log spam. Anything else (permission denied,
      // missing column, RLS rejection) is a real failure we want visible
      // in logs instead of silently rendering ProfileNotFound forever.
      if (userError.code !== 'PGRST116') {
        logError(userError, { operation: 'getProfileByHandle', handle })
      }
      return null
    }
    if (!user) return null

    const [settingsResult, linksResult, staysResult, blurbsResult, featuredWorksResult] =
      await Promise.all([
        supabase.from('profile_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('nomad_links')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true }),
        supabase
          .from('nomad_stays')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false }),
        supabase
          .from('nomad_blurbs')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true }),
        supabase
          .from('nomad_featured_works')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true }),
      ])

    const typedUser = user as unknown as User
    const nomadLinks = (linksResult.data ?? []) as NomadLink[]
    const nomadFeaturedWorks = (featuredWorksResult.data ?? []) as NomadFeaturedWork[]

    // Safe Browsing scrub. The save-time check (in the link API routes) is the
    // first gate, but it can't catch a link that was clean when saved and
    // weaponised later — the classic "age the domain, then swap in the
    // payload" play. So we re-check every user-supplied URL at read time and
    // drop anything Google now flags before it reaches a visitor's browser.
    // Dropped links simply vanish from the public card; the owner still sees
    // them in edit mode (which reads straight from the DB), so a false
    // positive is recoverable rather than destructive. findUnsafeUrls fails
    // open, so an API outage degrades to "no scrub", never "blank card".
    const unsafe = await findUnsafeUrls([
      ...nomadLinks.map((l) => l.url),
      ...nomadFeaturedWorks.map((w) => w.url),
      typedUser.website,
      typedUser.hire_cta_url,
      typedUser.meetup_cta_url,
    ].filter((u): u is string => typeof u === 'string' && u.length > 0))

    if (unsafe.size > 0) {
      logError(new Error('Safe Browsing flagged profile link(s)'), {
        operation: 'getProfileByHandle.scrub',
        handle,
        flaggedCount: unsafe.size,
      })
      if (typedUser.website && unsafe.has(typedUser.website)) typedUser.website = undefined
      if (typedUser.hire_cta_url && unsafe.has(typedUser.hire_cta_url)) typedUser.hire_cta_url = null
      if (typedUser.meetup_cta_url && unsafe.has(typedUser.meetup_cta_url)) typedUser.meetup_cta_url = null
    }

    return {
      user: typedUser,
      settings: (settingsResult.data ?? undefined) as ProfileSettings | undefined,
      nomadLinks: nomadLinks.filter((l) => !unsafe.has(l.url)),
      nomadStays: (staysResult.data ?? []) as NomadStay[],
      nomadBlurbs: (blurbsResult.data ?? []) as NomadBlurb[],
      nomadFeaturedWorks: nomadFeaturedWorks.filter((w) => !unsafe.has(w.url)),
    }
  },
)
