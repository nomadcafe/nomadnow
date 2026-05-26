import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { SAFE_USER_COLUMNS } from '@/lib/db-columns'
import CreateCardForm, { type InitialCardData } from './CreateCardForm'

// /create-card serves both modes:
//   - Create: no row in public.users yet. Empty form, INSERT on submit.
//   - Edit:   row exists. Form pre-fills from current data, handle locked,
//             PUT on submit, redirect back to /{handle}.
//
// Middleware enforces auth. There's no plan gate on purpose — see commit
// history (the orphan-recovery flow needs unpaid users to be able to claim
// a handle).
export default async function CreateCardPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/create-card')
  }

  // /create-card is the first-time-creation flow (CompletionMeter,
  // post-claim paywall redirect, etc.). Existing-card users get sent into
  // the unified /edit shell — that's where ongoing edits now live. Cheap
  // peek for a row before the heavy parallel fetch below.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (existing) {
    redirect('/edit/content')
  }

  // Pull existing profile + links + stays in parallel. All queries hit
  // RLS-public tables so no admin client needed.
  const [
    { data: profile },
    { data: links },
    { data: stays },
    { data: blurbs },
    { data: featuredWorks },
  ] = await Promise.all([
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

  const initial: InitialCardData | null = profile
    ? {
        handle: profile.handle as string,
        display_name: (profile.display_name as string | null) ?? '',
        role: (profile.role as string | null) ?? '',
        bio: (profile.bio as string | null) ?? '',
        current_city: (profile.current_city as string | null) ?? '',
        avatar_url: (profile.avatar_url as string | null) ?? '',
        work_status: (profile.work_status as string | null) ?? '',
        timezone: (profile.timezone as string | null) ?? '',
        visited_countries: (profile.visited_countries as string[] | null) ?? [],
        hire_cta_label: (profile.hire_cta_label as string | null) ?? '',
        hire_cta_url: (profile.hire_cta_url as string | null) ?? '',
        meetup_cta_label: (profile.meetup_cta_label as string | null) ?? '',
        meetup_cta_url: (profile.meetup_cta_url as string | null) ?? '',
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
          // DATE column comes back as null when "currently here"; the form
          // shape uses '' for empty so the <input type=date> stays clean.
          end_date: (s.end_date as string | null) ?? '',
          notes: (s.notes as string | null) ?? '',
          photo_urls: Array.isArray(s.photo_urls) ? (s.photo_urls as string[]) : [],
        })),
      }
    : null

  return <CreateCardForm initial={initial} />
}
