import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { SAFE_USER_COLUMNS } from '@/lib/db-columns'
import { isPro, getBillingState } from '@/lib/billing'
import CreateCardForm, { type InitialCardData } from '@/app/create-card/CreateCardForm'
import type { CardLook } from '@/components/LiveCardPreview'

// /edit/content — edit-mode entrypoint for an existing card. Layout already
// did the auth check, so we only validate "card exists" here: if not, send
// the user to /create-card for the first-time creation flow. Otherwise pull
// the same initial payload that /create-card used to assemble and reuse
// CreateCardForm verbatim — same component, but rendered inside the /edit
// tabbed shell.
export default async function EditContentPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    // Layout already redirects on no-user; this guard is defensive in case
    // the layout's auth check race-loses to this RSC's render.
    redirect('/login?next=/edit/content')
  }

  const [{ data: profile }, { data: settings }, { data: links }, { data: stays }, { data: blurbs }, { data: featuredWorks }] =
    await Promise.all([
      supabase.from('users').select(SAFE_USER_COLUMNS).eq('id', user.id).maybeSingle(),
      supabase.from('profile_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('nomad_links').select('*').eq('user_id', user.id).order('order_index'),
      supabase
        .from('nomad_stays')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false }),
      supabase
        .from('nomad_blurbs')
        .select('label, value')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true }),
      supabase
        .from('nomad_featured_works')
        .select('title, url, description')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true }),
    ])

  if (!profile) {
    // No card row yet — first-time creation flow lives in /create-card with
    // CompletionMeter, paywall redirect, etc. /edit assumes a card exists.
    redirect('/create-card')
  }

  // Paid-only model: editing an existing card requires an active plan. Checked
  // after the "card exists" gate so a user with no card is funneled to
  // /create-card (open, pre-paywall) rather than straight to pricing.
  // /edit/account is intentionally NOT gated so a lapsed user can still reach
  // billing / delete their account.
  const billing = await getBillingState(user.id)
  if (!billing.isActive) redirect('/pricing?from=edit')

  const initial: InitialCardData = {
    handle: profile.handle as string,
    display_name: (profile.display_name as string | null) ?? '',
    role: (profile.role as string | null) ?? '',
    bio: (profile.bio as string | null) ?? '',
    current_city: (profile.current_city as string | null) ?? '',
    country: (profile.country as string | null) ?? '',
    avatar_url: (profile.avatar_url as string | null) ?? '',
    work_status: (profile.work_status as string | null) ?? '',
    now_text: (profile.now_text as string | null) ?? '',
    timezone: (profile.timezone as string | null) ?? '',
    // DB stores YYYY-MM-DD; the form input is <input type="month"> so we
    // slice to YYYY-MM. Empty string when null so the picker reads blank.
    nomad_since: ((profile.nomad_since as string | null) ?? '').slice(0, 7),
    visited_countries: (profile.visited_countries as string[] | null) ?? [],
    hire_cta_label: (profile.hire_cta_label as string | null) ?? '',
    hire_cta_url: (profile.hire_cta_url as string | null) ?? '',
    meetup_cta_label: (profile.meetup_cta_label as string | null) ?? '',
    meetup_cta_url: (profile.meetup_cta_url as string | null) ?? '',
    open_to_coffee: (profile.open_to_coffee as boolean | null) ?? false,
    availability: (profile.availability as string | null) ?? '',
    links: (links ?? []).map((l) => ({
      type: l.type as InitialCardData['links'][number]['type'],
      label: (l.label as string | null) ?? '',
      url: l.url as string,
    })),
    blurbs: (blurbs ?? []).map((b) => ({
      label: (b.label as string) ?? '',
      value: (b.value as string) ?? '',
    })),
    featured_works: (featuredWorks ?? []).map((w) => ({
      title: (w.title as string) ?? '',
      url: (w.url as string) ?? '',
      description: (w.description as string | null) ?? '',
    })),
    stays: (stays ?? []).map((s) => ({
      city: (s.city as string) ?? '',
      country: (s.country as string) ?? '',
      lat: (s.lat as number | null) ?? null,
      lon: (s.lon as number | null) ?? null,
      start_date: (s.start_date as string) ?? '',
      end_date: (s.end_date as string | null) ?? '',
      notes: (s.notes as string | null) ?? '',
      photo_urls: Array.isArray(s.photo_urls) ? (s.photo_urls as string[]) : [],
    })),
  }

  // Saved look settings → the content-editor preview renders the user's REAL
  // card, not a hardcoded 'classic'. accent_color is Pro-gated exactly like the
  // public card (app/[handle]) so the preview can't promise an accent a free
  // plan won't actually render. settings may be null (no row yet) → undefined
  // fields fall back to the theme default in the preview.
  const ownerIsPro = isPro((profile as { plan?: string | null }).plan)
  const look: CardLook = {
    themeKey: (settings?.theme_color as string | null) ?? null,
    buttonShape: (settings?.button_shape as string | null) ?? null,
    buttonStyle: (settings?.button_style as string | null) ?? null,
    accentColor: ownerIsPro ? ((settings?.accent_color as string | null) ?? null) : null,
    backgroundMode: (settings?.background_mode as string | null) ?? null,
    backgroundValue: settings?.background_value ?? null,
    fontFamily: (settings?.font_family as string | null) ?? null,
    decorationOverride: (settings?.decoration_override as string | null) ?? null,
    avatarStyleOverride: (settings?.avatar_style_override as string | null) ?? null,
    bioQuoteStyleOverride: (settings?.bio_quote_style_override as string | null) ?? null,
    linksLayout: (settings?.links_layout as string | null) ?? null,
    sectionOrder: (settings?.section_order as string[] | null) ?? null,
  }

  return <CreateCardForm initial={initial} look={look} embedded />
}
