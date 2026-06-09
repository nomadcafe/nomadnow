-- 0028_users_presence_confirmed_at.sql
-- The "now" layer. A presence-freshness timestamp, kept DELIBERATELY separate
-- from updated_at: editing your bio or swapping a link should NOT refresh how
-- current your location claim is. This column answers "when did this nomad last
-- assert they're actually where the card says" — the public card uses it to
-- show "confirmed N days ago" and to visually fade current_city / open-to-coffee
-- once the claim goes stale (see lib/presence.ts). Without it, a card saying
-- "in Bangkok, open to coffee" is indistinguishable from one filled in 8 months
-- ago — i.e. the "now" domain wasted as a résumé.
--
-- Written server-side only (NOT from the user-supplied PUT body): stamped on
-- signup, on the dedicated /api/users/confirm-presence tap, and re-stamped when
-- current_city actually changes. It IS granted UPDATE to authenticated (the
-- session client writes it in the same statement as a profile edit), so a
-- determined user could PATCH an arbitrary value via PostgREST. That's
-- acceptable: freshness is a SOFT availability signal, not a security boundary
-- like plan / verified / suspended (those stay server-only, see migration 0027).
-- Forging your own freshness only games a coffee hint, and anyone can already
-- keep themselves "fresh" by tapping confirm — the decay exists to catch the
-- honest-but-forgetful nomad, not an adversary. The renderer clamps future
-- timestamps to "fresh" so a forged far-future value can't render as negative.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS presence_confirmed_at TIMESTAMPTZ;

-- Backfill existing rows to updated_at — the most honest proxy we have for
-- "last time this person touched their presence". NULL is left as-is only for
-- rows with no updated_at (shouldn't exist; column defaults NOW()). The
-- renderer treats NULL as "no freshness info" and skips the line + decay.
UPDATE users
  SET presence_confirmed_at = updated_at
  WHERE presence_confirmed_at IS NULL;

-- Column-level grants — migration 0007 (SELECT) and 0027 (INSERT/UPDATE)
-- swapped users to explicit per-column grants, so every new column must be
-- granted or PostgREST queries touching it fail outright. SELECT is public
-- (the freshness line renders for every visitor). INSERT/UPDATE go to
-- authenticated because the session client stamps it inline on signup /
-- profile edit; the value is always server-computed (see note above).
GRANT SELECT (presence_confirmed_at) ON public.users TO anon, authenticated;
GRANT INSERT (presence_confirmed_at) ON public.users TO authenticated;
GRANT UPDATE (presence_confirmed_at) ON public.users TO authenticated;

-- Partial index for the eventual "who's actually around right now" explore
-- sort (P2) — only rows that opted into coffee ever get ranked by freshness,
-- and those are the minority, so keep it partial like idx_users_open_to_coffee.
CREATE INDEX IF NOT EXISTS idx_users_presence_confirmed_at
  ON users (presence_confirmed_at DESC)
  WHERE open_to_coffee = TRUE;
