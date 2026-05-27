-- 0023_users_nomad_since.sql
-- Single date column on users so the public card can show "on the road for
-- 3.4 years" without forcing the user to log every individual stay. Replaces
-- the previous behaviour where "time on the road" was derived purely from
-- sum(nomad_stays.duration) — a high-friction input most casual users skipped,
-- leaving the stat empty or misleadingly small.
--
-- When set, this value wins over the stays-sum at render time. When NULL,
-- renderers fall back to the stays sum (preserving the old behaviour for
-- power users who actually fill out stays).
--
-- Stored as DATE (not TIMESTAMPTZ) — month-level granularity is what users
-- actually carry in their head ("I started nomading in March 2022"). The
-- form submits a YYYY-MM-01 string so day-of-month is a no-op constant.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nomad_since DATE;

-- Restrict to sane bounds. Anything before 2000 or in the future is a typo
-- in the month picker, not a real value. The card renderer treats out-of-
-- range NULLs and bad rows the same way: fall back to the stays sum.
ALTER TABLE users
  ADD CONSTRAINT users_nomad_since_range
  CHECK (
    nomad_since IS NULL
    OR (nomad_since >= DATE '2000-01-01' AND nomad_since <= CURRENT_DATE)
  );

-- Column-level GRANT — migration 0007 swapped users to column-level
-- grants, so every new column must explicitly grant SELECT to the
-- end-user roles or PostgREST queries fail (and SELECTs containing
-- this column return zero rows). See 0014 / 0016 / 0019 for the
-- same pattern on prior additions.
GRANT SELECT (nomad_since) ON public.users TO anon, authenticated;
