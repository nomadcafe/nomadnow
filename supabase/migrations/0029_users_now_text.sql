-- 0029_users_now_text.sql
-- The headline of the "now" layer: one human sentence — "shipping a Next.js app
-- from a café in Canggu" — shown directly under the name on the card. This is
-- Derek Sivers' /now page compressed into a single field, and the thing the
-- nomad.now domain literally reads out: "<name> now". Distinct from bio (a
-- durable self-description) and work_status (a preset-y pill): now_text is the
-- live, of-the-moment line, and changing it counts as a fresh presence
-- assertion (see PUT /api/users, which re-stamps presence_confirmed_at on edit).
--
-- 140 chars — a tweet-length one-liner. The CHECK mirrors the Zod + client
-- maxLength so an out-of-band PostgREST write can't store an oversized value.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS now_text TEXT
  CHECK (now_text IS NULL OR char_length(now_text) <= 140);

-- Column-level grants — see migration 0007 (SELECT) / 0027 (INSERT/UPDATE).
-- Public read (it's the card headline); authenticated write (set through the
-- session client on signup / profile edit, same as bio / work_status).
GRANT SELECT (now_text) ON public.users TO anon, authenticated;
GRANT INSERT (now_text) ON public.users TO authenticated;
GRANT UPDATE (now_text) ON public.users TO authenticated;
