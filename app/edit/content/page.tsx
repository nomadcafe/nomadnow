import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { SAFE_USER_COLUMNS } from '@/lib/db-columns'
import CreateCardForm, { type InitialCardData } from '@/app/create-card/CreateCardForm'

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

  const [{ data: profile }, { data: links }, { data: stays }, { data: blurbs }, { data: featuredWorks }] =
    await Promise.all([
      supabase.from('users').select(SAFE_USER_COLUMNS).eq('id', user.id).maybeSingle(),
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

  const initial: InitialCardData = {
    handle: profile.handle as string,
    display_name: (profile.display_name as string | null) ?? '',
    role: (profile.role as string | null) ?? '',
    bio: (profile.bio as string | null) ?? '',
    current_city: (profile.current_city as string | null) ?? '',
    country: (profile.country as string | null) ?? '',
    avatar_url: (profile.avatar_url as string | null) ?? '',
    work_status: (profile.work_status as string | null) ?? '',
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

  return <CreateCardForm initial={initial} embedded />
}
