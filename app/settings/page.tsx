import { redirect } from 'next/navigation'

// /settings — legacy URL. Now redirects to /edit/look so old bookmarks,
// magic-link callbacks, and Stripe portal returns keep working without
// rendering the old combined view.
export default function SettingsPage() {
  redirect('/edit/look')
}
