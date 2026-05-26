import { AccountSection } from '@/components/edit/AccountSection'

// /edit/account — profile-link + billing only. No save flow (billing has
// its own Stripe portal handler), no preview, no dirty tracking. Doesn't
// fetch /api/settings — only /api/billing/state.
export default function EditAccountPage() {
  return <AccountSection />
}
