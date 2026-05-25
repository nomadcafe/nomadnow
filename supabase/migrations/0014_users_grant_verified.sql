-- Grant SELECT on the `verified` column to end-user roles.
--
-- Companion to 0007, which revoked the table-level SELECT on public.users
-- and re-granted only an explicit allow-list of columns. The `verified`
-- column existed in the original schema but was omitted from 0007's
-- GRANT list. That was fine while no app code selected it.
--
-- The public Nomad Card recently started rendering a "Verified" pill
-- gated on this column (see app/[handle]/page.tsx → lib/profile.ts →
-- PUBLIC_USER_COLUMNS, and app/og/[handle]/route.tsx). Postgres
-- column-level grants are all-or-nothing per SELECT: including a
-- column you can't read rejects the entire query, which silently
-- fell through to "profile not found" on every public-card load.
--
-- `verified` is admin-only-write, shown to every visitor by design, so
-- exposing read access is consistent with its intended visibility. No
-- companion UPDATE/INSERT grant — writes still flow through the admin
-- client (createAdminSupabase()) as with the billing columns.

GRANT SELECT (verified) ON public.users TO anon, authenticated;
