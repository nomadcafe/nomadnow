import { revalidateTag, revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

// Invalidates both the Next.js fetch-cache entry tagged for this handle
// (used by /[handle]/page.tsx's fetch to /api/profile) and the page path
// itself (covers the rendered HTML cache). Either call alone has gaps in
// practice — fetch cache hangs around for the per-fetch tag, page cache
// hangs around for the route-level revalidate window.
export function bumpProfileCache(handle: string) {
  if (!handle) return
  revalidateTag(`profile-${handle}`)
  revalidatePath(`/${handle}`)
}

// Invalidates the cached /explore directory listings (app/explore/page.tsx).
// Called when a signup or profile edit changes a field the directory shows
// (display_name, role, current_city, bio, visited_countries), so new and
// changed cards surface without waiting out the listing's TTL.
export function bumpExploreCache() {
  revalidateTag('explore')
}

// Invalidates the cached billing state (lib/billing.ts) for a user. Called from
// the Stripe webhook so a plan change / cancellation is reflected immediately
// instead of waiting out the cache TTL.
export function bumpBillingCache(userId: string) {
  if (!userId) return
  revalidateTag(`billing-${userId}`)
}

// Helper for mutation routes that have a userId but no handle in scope —
// looks up the handle once so callers don't repeat the boilerplate.
export async function bumpProfileCacheByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data } = await supabase
    .from('users')
    .select('handle')
    .eq('id', userId)
    .maybeSingle()
  const handle = (data?.handle as string | null) ?? null
  if (handle) bumpProfileCache(handle)
}
