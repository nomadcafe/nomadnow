import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import CreateCardForm from './CreateCardForm'

// Auth gate only — middleware handles unauth redirects to /login; this layer
// catches the no-auth-but-direct-render case.
//
// Why no plan gate here: handle-claim creates the public.users row, and the
// Stripe webhook UPDATEs that row by id. Requiring a plan to access this
// page traps users in a chicken-and-egg: pay first → webhook has no row to
// update → still no plan → gated out → can't claim handle. Order is now
// claim-handle → subscribe; the post-submit redirect in CreateCardForm
// pushes unpaid users to /pricing after they claim.
export default async function CreateCardPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/create-card')
  }
  return <CreateCardForm />
}
