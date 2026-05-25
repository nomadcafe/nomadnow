-- Add `verified` to public.users and grant SELECT to end-user roles.
--
-- The column was declared in supabase/schema.sql (line 60) but never
-- shipped as a migration, so deployed databases ran without it. That
-- only became visible when application code started selecting the
-- column (PUBLIC_USER_COLUMNS in lib/profile.ts and the OG handler
-- in app/og/[handle]/route.tsx) — every public-profile lookup then
-- failed at the database with "column does not exist" and silently
-- fell through to 404 / ProfileNotFound.
--
-- Two halves to the fix:
--   1. ADD the column. Nullable boolean defaulting FALSE matches the
--      shape declared in schema.sql; admin-only-write means there's no
--      need for end-user UPDATE/INSERT grants.
--   2. GRANT SELECT on it to anon and authenticated. Migration 0007
--      revoked the table-level SELECT and re-granted only an explicit
--      allow-list — Postgres column-level grants are all-or-nothing per
--      SELECT, so a query that includes a non-granted column is fully
--      rejected. The `verified` pill is shown to every visitor by
--      design, so exposing read access matches its intended visibility.
--
-- IF NOT EXISTS so this is idempotent on databases that may already
-- have the column from a manual schema sync.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

GRANT SELECT (verified) ON public.users TO anon, authenticated;
