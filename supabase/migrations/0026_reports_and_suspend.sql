-- 0026_reports_and_suspend.sql
-- Abuse-reporting + card takedown.
--
-- Cards are public UGC: any link a user puts on their card is shown to and
-- clicked by strangers, so a phishing/malware/impersonation card puts third
-- parties at risk. This adds (1) a place to record visitor reports and
-- (2) a kill switch to hide a bad card while it's reviewed.
--
-- DEPLOY ORDER: run this migration BEFORE shipping the code that selects
-- users.suspended — lib/profile.ts reads it on every public profile request,
-- and a missing column would 500 every card page.

-- ── reports ────────────────────────────────────────────────────────────────
-- reported_handle is stored as plain TEXT, NOT a FK to users(handle): a report
-- must survive the user renaming or deleting their handle (that's often the
-- exact evasion we want a record of). reported_user_id is a best-effort
-- snapshot of who the handle pointed at when reported, nulled if that row is
-- later deleted.
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_handle TEXT NOT NULL CHECK (length(reported_handle) > 0 AND length(reported_handle) <= 50),
  reported_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('phishing', 'malware', 'impersonation', 'spam', 'other')),
  details TEXT CHECK (details IS NULL OR length(details) <= 1000),
  -- Kept for throttling abuse-of-reporting (someone mass-reporting a rival).
  -- It's PII; treat the table as internal-only (locked down below).
  reporter_ip TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported_handle ON public.reports (reported_handle);

-- Lock the table down hard. Unlike nomad_links / nomad_blurbs (public-read),
-- reports contain reporter IPs and abuse claims that must NEVER be readable by
-- visitors. RLS is enabled with NO policies, so anon/authenticated get zero
-- rows and zero writes; the report API inserts with the service-role client
-- (createAdminSupabase), which bypasses RLS. The explicit REVOKE is
-- belt-and-suspenders against any default grants on the public schema.
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reports FROM anon, authenticated;

-- ── users.suspended ──────────────────────────────────────────────────────────
-- Kill switch: when TRUE, lib/profile.ts treats the card as a 404 so a
-- reported phishing/malware card stops rendering (and stops serving its links)
-- the moment a moderator flips it, without deleting the user's data.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE;

-- Column-level GRANT — migration 0007 swapped users to column-level grants, so
-- every new column must explicitly grant SELECT to the end-user roles or
-- PostgREST SELECTs that include it return zero rows. See 0024 for the same
-- pattern. (We still filter server-side; the grant is what lets the public
-- read path even fetch the flag.)
GRANT SELECT (suspended) ON public.users TO anon, authenticated;
