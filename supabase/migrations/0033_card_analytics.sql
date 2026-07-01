-- 0033_card_analytics.sql
-- First-party card analytics: profile views + link/CTA clicks.
--
-- Why first-party (not just GA4): the owner dashboard needs to answer "did my
-- card get seen? did my Hire CTA get clicked?" per-user, and GA4 is a
-- site-wide, owner-invisible funnel. The freelancer wedge lives or dies on the
-- Hire-CTA click count being a number the user can actually see (ROADMAP).
--
-- PRIVACY: we never store a raw visitor IP. The events API hashes ip+ua with a
-- daily-rotating salt into visitor_hash — enough to approximate "unique
-- visitors" within a day, useless for cross-day tracking or re-identification.
--
-- Both tables are locked down exactly like reports (migration 0026): RLS on
-- with NO policies + REVOKE ALL, so anon/authenticated get zero rows and zero
-- writes. The events endpoint inserts with the service-role client, and the
-- stats endpoint reads + aggregates with the service-role client scoped to the
-- signed-in user's own id. Clients never touch these rows directly, so the
-- visitor_hash column is never exposed.

-- ── card_views ───────────────────────────────────────────────────────────────
-- One row per (deduped) public card load by a non-owner. handle is a snapshot
-- alongside the FK so a view survives a later handle rename for auditing; the
-- dashboard always queries by user_id.
CREATE TABLE IF NOT EXISTS public.card_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL CHECK (length(handle) > 0 AND length(handle) <= 50),
  -- sha256(ip + user-agent + day + secret); coarse per-day visitor identity.
  -- Never a raw IP. NULL when the salt env isn't configured (dev).
  visitor_hash TEXT,
  referrer TEXT CHECK (referrer IS NULL OR length(referrer) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Serves every dashboard query: "views for this user in the last N days".
CREATE INDEX IF NOT EXISTS idx_card_views_user_created
  ON public.card_views (user_id, created_at DESC);

-- ── card_clicks ──────────────────────────────────────────────────────────────
-- One row per click on a tracked outbound element. target_type buckets the
-- click surface; target_url is the owner's own destination (their data, not
-- visitor PII) so the dashboard can rank "which link earns clicks".
CREATE TABLE IF NOT EXISTS public.card_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL CHECK (length(handle) > 0 AND length(handle) <= 50),
  target_type TEXT NOT NULL
    CHECK (target_type IN ('link', 'hire_cta', 'meetup_cta', 'featured_work')),
  target_url TEXT CHECK (target_url IS NULL OR length(target_url) <= 2048),
  visitor_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_clicks_user_created
  ON public.card_clicks (user_id, created_at DESC);

-- Lock both tables down hard — same posture as reports (0026). RLS enabled with
-- NO policies means anon/authenticated see nothing and write nothing; the
-- explicit REVOKE is belt-and-suspenders against default schema grants. All
-- reads/writes go through the service-role client, scoped in application code.
ALTER TABLE public.card_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.card_views FROM anon, authenticated;

ALTER TABLE public.card_clicks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.card_clicks FROM anon, authenticated;
