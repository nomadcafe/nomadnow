// Shared column allow-list for `public.users`. Mirrors the column-level
// GRANT in supabase/migrations/0007_users_billing_column_revoke.sql.
//
// Background: the billing columns (stripe_customer_id, subscription_id,
// subscription_status, current_period_end) were revoked from anon and
// authenticated roles because they leak Stripe identifiers and billing
// state. Any session-client SELECT / RETURNING that includes them now
// fails at the database. Use this constant for every `.select(...)`
// on the users table that runs through a session client (anon or
// authenticated) — server admin queries via createAdminSupabase()
// don't need it because service_role bypasses these grants.
//
// `plan` is intentionally INCLUDED — it's needed by client UI (the
// "current plan" check on /pricing, the upgrade gate on /settings,
// the Pro-only sections on the public card) and exposing "is this
// user paying" is acceptable; the sensitive bit is the Stripe IDs
// and the lifecycle state.
//
// Comma-separated and whitespace-free so Supabase's typed client can
// parse it into a row type (whitespace falls back to GenericStringError).
export const SAFE_USER_COLUMNS =
  'id,handle,display_name,avatar_url,country,bio,website,location,role,current_city,work_status,timezone,visited_countries,nomad_since,profile_type,hire_cta_label,hire_cta_url,meetup_cta_label,meetup_cta_url,open_to_coffee,now_text,presence_confirmed_at,plan,created_at,updated_at' as const
