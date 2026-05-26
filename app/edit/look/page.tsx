import { LookSettingsForm } from '@/components/edit/LookSettingsForm'

// /edit/look — theme / accent / overrides / background / button shape / font
// / section order. Hosted inside the /edit shell so the tab nav is shared
// with /edit/content and /edit/account.
export default function EditLookPage() {
  return <LookSettingsForm />
}
