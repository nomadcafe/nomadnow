-- Add Hire-CTA fields to public.users + grant SELECT on them.
--
-- These power a prominent "Hire me" / "Book a call" / "Get in touch"
-- button on the public Nomad Card — distinct from the regular link
-- rows. Freelancers asked for an obvious conversion path that doesn't
-- look like another social link.
--
-- Two halves, mirroring 0014:
--   1. ADD the columns. Both are TEXT NULL — null means "no CTA, don't
--      render the section". Length validation happens at the Zod layer
--      (30 chars for the label, 2048 for the URL, http/https/mailto/tel
--      protocol allow-list).
--   2. GRANT SELECT to anon and authenticated. Migration 0007 revoked
--      table-level SELECT and re-granted only an explicit allow-list, so
--      any new column needs its own GRANT or the SELECT including it
--      will be rejected outright (the verified-column incident in 0014).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hire_cta_label TEXT,
  ADD COLUMN IF NOT EXISTS hire_cta_url TEXT;

GRANT SELECT (hire_cta_label, hire_cta_url) ON public.users TO anon, authenticated;
