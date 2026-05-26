-- Add Meetup-CTA fields to public.users + grant SELECT on them.
--
-- Twin to migration 0016 (hire_cta). Where hire_cta is the freelance-side
-- conversion path ("Hire me / Book a call"), meetup_cta is the nomad-side
-- one — "Grab a coffee in {current_city}", "Say hi on Telegram", etc.
-- Together they give the card a dual identity: it converts both clients
-- and local peers. Renders as a secondary (outlined) button on the public
-- card so visitors read it as paired-but-secondary to the solid Hire CTA.
--
-- Two halves, mirroring 0016:
--   1. ADD the columns. Both are TEXT NULL — null means "no CTA, don't
--      render the section". Length validation happens at the Zod layer
--      (30 chars for the label, 2048 for the URL, http/https/mailto/tel
--      protocol allow-list — same shape as hire_cta_url).
--   2. GRANT SELECT to anon and authenticated. Migration 0007 revoked
--      table-level SELECT and re-granted only an explicit allow-list, so
--      any new column needs its own GRANT or the SELECT including it
--      will be rejected outright.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS meetup_cta_label TEXT,
  ADD COLUMN IF NOT EXISTS meetup_cta_url TEXT;

GRANT SELECT (meetup_cta_label, meetup_cta_url) ON public.users TO anon, authenticated;
