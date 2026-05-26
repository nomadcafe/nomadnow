import { SettingsContent } from '@/components/edit/SettingsContent'

// /settings — legacy single-page entrypoint. Renders the combined Look +
// Account view that the page hosted before /edit/* shipped. New code paths
// drive users into /edit/look or /edit/account instead, but the URL stays
// alive so existing bookmarks and AccountMenu memorisation don't 404.
export default function SettingsPage() {
  return <SettingsContent mode="full" showHeader />
}
