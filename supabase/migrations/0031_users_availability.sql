-- 0031_users_availability.sql
-- The hireable "now" signal: is this person taking client work right now?
-- This is the field the homepage headline ("When you're open.") promises and
-- the freelancer wedge needs. Deliberately ORTHOGONAL to the three existing
-- now-layer fields:
--   work_status   — employment TYPE (freelancing / fulltime / slow travel)
--   open_to_coffee — a SOCIAL stance ("happy to meet in person")
--   availability   — a COMMERCIAL stance ("open / booked for paid work")
--
-- Enum-as-CHECK rather than a Postgres enum type: a CHECK is trivially
-- alterable later (add 'unavailable' etc.) without an ALTER TYPE dance, and it
-- mirrors the Zod enum in app/api/users/route.ts. NULL = not set → the card
-- renders no chip (the default; no backfill needed). The public card fades the
-- chip once presence goes stale (lib/presence.STALE_AFTER_DAYS), so an
-- abandoned "open for work" never misleads a visitor.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS availability TEXT
  CHECK (availability IS NULL OR availability IN ('open', 'booked'));

-- Partial index serving the explore "open for work" filter, which selects
-- availability = 'open' AND a fresh presence_confirmed_at (see
-- app/explore/page.tsx). Partial because only the 'open' rows are ever
-- queried this way; 'booked'/NULL rows vastly outnumber them. Mirrors the
-- open_to_coffee partial index from 0024.
CREATE INDEX IF NOT EXISTS idx_users_availability_open
  ON users (presence_confirmed_at)
  WHERE availability = 'open';

-- Column-level grants — see migration 0007 (SELECT) / 0027 (INSERT/UPDATE).
-- Public read (it's a card chip + powers the explore filter); authenticated
-- write (set through the session client on the profile edit form, same path
-- as work_status / open_to_coffee).
GRANT SELECT (availability) ON public.users TO anon, authenticated;
GRANT INSERT (availability) ON public.users TO authenticated;
GRANT UPDATE (availability) ON public.users TO authenticated;
