import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { LookSettingsForm } from '@/components/edit/LookSettingsForm'

// /edit/look — theme / accent / overrides / background / button shape / font
// / section order. Hosted inside the /edit shell so the tab nav is shared
// with /edit/content and /edit/account.
export default async function EditLookPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/edit/look')

  // Freemium: look editing is open to every signed-in owner. Pro-only controls
  // (custom accent / image background) are gated inside LookSettingsForm and
  // re-enforced at the /api/settings save boundary.
  return <LookSettingsForm />
}
