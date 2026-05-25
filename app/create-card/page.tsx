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

  // Pull existing profile + links + stays in parallel. All queries hit
  // RLS-public tables so no admin client needed.
  const [{ data: profile }, { data: links }, { data: stays }] = await Promise.all([
    supabase.from('users').select(SAFE_USER_COLUMNS).eq('id', user.id).maybeSingle(),
    supabase.from('nomad_links').select('*').eq('user_id', user.id).order('order_index'),
    supabase
      .from('nomad_stays')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false }),
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
        links: (links ?? []).map((l) => ({
          type: l.type as InitialCardData['links'][number]['type'],
          label: (l.label as string | null) ?? '',
          url: l.url as string,
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
          photo_url: (s.photo_url as string | null) ?? '',
        })),
      }
    : null

  return <CreateCardForm initial={initial} />
}
