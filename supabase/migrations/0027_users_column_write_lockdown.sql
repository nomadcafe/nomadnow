-- 0027_users_column_write_lockdown.sql
-- Column-level INSERT/UPDATE lockdown on public.users.
--
-- CRITICAL FIX. The RLS policies users_insert_self / users_update_self restrict
-- WHICH ROW a user may write (auth.uid() = id) but place NO restriction on
-- WHICH COLUMNS. Migration 0007 locked down SELECT only and explicitly left
-- INSERT/UPDATE untouched — so the `authenticated` role retained the default
-- table-level INSERT/UPDATE on every column, including plan, suspended, and the
-- billing columns. Because the browser holds the anon key + the user's session
-- JWT, any logged-in user could bypass the API entirely and write protected
-- columns directly through PostgREST:
--
--   PATCH /rest/v1/users?id=eq.<self>  {"plan":"pro","subscription_status":"active"}
--     → free Pro (paywall bypass; app/[handle] gates Pro off users.plan)
--   PATCH /rest/v1/users?id=eq.<self>  {"suspended":false}
--     → un-suspend their own moderated card (defeats the takedown kill switch)
--   PATCH /rest/v1/users?id=eq.<self>  {"verified":true}
--     → self-award the verified badge
--
-- Fix mirrors 0007's approach for writes: drop the table-level INSERT/UPDATE
-- grant and re-grant ONLY the columns the app legitimately writes through the
-- session client (POST /api/users insert, PUT /api/users update — see the Zod
-- schemas there). service_role bypasses these grants, so the Stripe webhook,
-- checkout-success sync, and admin moderation (all via createAdminSupabase)
-- keep writing plan / suspended / billing normally.
--
-- Columns intentionally NOT granted to authenticated (server/admin-only):
--   plan, subscription_status, subscription_id, stripe_customer_id,
--   current_period_end, suspended, verified, created_at, updated_at*, id*,
--   handle*, visited_countries_count (generated).
--   * id + handle are INSERT-only (signup); handle has no rename path, and
--     updated_at is granted for UPDATE only.

REVOKE INSERT, UPDATE ON public.users FROM anon, authenticated;

-- Signup inserts the row through the session client. id + handle are set once
-- here (RLS WITH CHECK forces id = auth.uid()); no UPDATE grant on either, so
-- they're immutable afterward.
GRANT INSERT (
  id, handle, display_name, avatar_url, country, bio, website, location,
  role, current_city, work_status, timezone, visited_countries, nomad_since,
  open_to_coffee, profile_type,
  hire_cta_label, hire_cta_url, meetup_cta_label, meetup_cta_url
) ON public.users TO authenticated;

-- Profile edits update the row through the session client.
GRANT UPDATE (
  display_name, avatar_url, country, bio, website, location,
  role, current_city, work_status, timezone, visited_countries, nomad_since,
  open_to_coffee, profile_type,
  hire_cta_label, hire_cta_url, meetup_cta_label, meetup_cta_url, updated_at
) ON public.users TO authenticated;
