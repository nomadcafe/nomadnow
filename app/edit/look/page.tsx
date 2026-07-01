import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getBillingState } from '@/lib/billing'
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

  // Paid-only model: editing requires an active plan (see /edit/overview).
  const billing = await getBillingState(user.id)
  if (!billing.isActive) redirect('/pricing?from=edit')

  return <LookSettingsForm />
}
