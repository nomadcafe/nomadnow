-- Column-level SELECT lockdown on `public.users` for end-user roles.
--
-- Before this migration, the billing columns (stripe_customer_id,
-- subscription_id, subscription_status, current_period_end) were readable
-- by anyone holding the Supabase anon key — RLS allows SELECT on every
-- row (`users_select_public USING (true)`), and the default table-level
-- GRANT covers every column. That means anyone could enumerate every
-- user's Stripe identifiers and subscription state via PostgREST directly,
-- bypassing our app code entirely.
--
-- Postgres doesn't support a partial REVOKE on a subset of columns when
-- the grant came from a table-level GRANT. The fix is to drop the
-- table-level SELECT and re-grant only the safe columns. service_role
-- still has full access (it bypasses these grants), so anything that
-- reads or writes billing state through createAdminSupabase() keeps
-- working.
REVOKE SELECT ON public.users FROM anon, authenticated;

GRANT SELECT (
  id,
  handle,
  display_name,
  avatar_url,
  country,
  bio,
  website,
  location,
  role,
  current_city,
  work_status,
  timezone,
  visited_countries,
  profile_type,
  plan,
  created_at,
  updated_at
) ON public.users TO anon, authenticated;

-- UPDATE / INSERT / DELETE grants are unaffected by this — they still
-- govern row-level writes via RLS policies (users_update_self etc).
-- The billing columns are only ever WRITTEN through createAdminSupabase()
-- (Stripe webhook + checkout success route), so end-user roles never
-- needed UPDATE on them; this REVOKE makes that explicit by removing
-- READ-back even after a same-row UPDATE.
