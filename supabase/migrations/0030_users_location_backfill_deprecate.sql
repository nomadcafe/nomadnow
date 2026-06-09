-- 0030_users_location_backfill_deprecate.sql
-- Decommission the legacy `location` free-text column as a WRITE target.
--
-- Background: `current_city` (added later, with CityAutocomplete + an ISO
-- country code for the flag) superseded the original free-text `location`, but
-- the editor kept writing the same value to BOTH columns — a shadow write that
-- served no purpose and made it ambiguous which column was the source of truth.
-- The card already prefers current_city (current_city || location), and explore
-- / search / country filters only ever query current_city, so location-only
-- legacy rows were invisible in the directory.
--
-- Two halves:
--   1. Backfill: copy location → current_city for legacy rows that have a
--      location but no current_city. This makes current_city the single source
--      of truth and surfaces those users in explore/search. country is left
--      unset (no flag), same as any manually-typed city.
--   2. Revoke INSERT/UPDATE on location: the app no longer writes it (the write
--      was removed from /api/users and the edit form). Revoking matches the
--      column-grant lockdown philosophy of migration 0027 — one fewer writable
--      column reachable via a direct PostgREST call. SELECT stays granted: the
--      card still reads `current_city || location` as a harmless legacy fallback
--      for any row not covered by the backfill. The column itself is kept (not
--      dropped) so the fallback keeps working and the change stays reversible;
--      a future migration can DROP it once we're confident nothing depends on it.

UPDATE users
  SET current_city = location
  WHERE (current_city IS NULL OR btrim(current_city) = '')
    AND location IS NOT NULL
    AND btrim(location) <> '';

REVOKE INSERT (location), UPDATE (location) ON public.users FROM authenticated;
