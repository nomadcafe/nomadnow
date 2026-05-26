import { SettingsContent } from '@/components/edit/SettingsContent'

// /edit/look — theme / accent / overrides / background / button shape / font
// / section order. Hosted inside the /edit shell so the tab nav is shared
// with /edit/content and /edit/account. SettingsContent already knows how to
// hide the profile + billing sections via `mode="look"`; showHeader=false
// drops its own duplicate nav (the /edit layout renders one above).
export default function EditLookPage() {
  return <SettingsContent mode="look" showHeader={false} />
}
