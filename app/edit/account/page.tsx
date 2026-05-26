import { SettingsContent } from '@/components/edit/SettingsContent'

// /edit/account — profile-link + billing only. No save flow (billing has
// its own Stripe portal handler inside SettingsContent), no preview, no
// dirty tracking. The look-only sections are hidden via `mode="account"`.
export default function EditAccountPage() {
  return <SettingsContent mode="account" showHeader={false} />
}
