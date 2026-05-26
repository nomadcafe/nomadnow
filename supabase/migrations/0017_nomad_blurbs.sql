-- Blurb table for short label/value pairs on the public card.
--
-- Backs the new "blurbs" section — small editorial dimensions that
-- freelancers wanted next to bio: "Now reading", "Booking: Q2 2026",
-- "Rate: from $1.2k/wk", "Tools: Figma · Linear · Notion", etc.
-- Each blurb is a single label/value pair; up to ~8 per user keeps the
-- card from drowning in trivia.
--
-- Mirrors nomad_links / nomad_stays in shape (per-row entity, RLS
-- public-read + owner-write, server PUT replace-all semantics on the
-- API side).

CREATE TABLE IF NOT EXISTS public.nomad_blurbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (length(label) > 0 AND length(label) <= 30),
  value TEXT NOT NULL CHECK (length(value) > 0 AND length(value) <= 120),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nomad_blurbs_user_id ON public.nomad_blurbs(user_id);

ALTER TABLE public.nomad_blurbs ENABLE ROW LEVEL SECURITY;

-- Public read, owner-only write — same model as nomad_links / nomad_stays.
CREATE POLICY "nomad_blurbs_select_public" ON public.nomad_blurbs
  FOR SELECT USING (true);
CREATE POLICY "nomad_blurbs_insert_self" ON public.nomad_blurbs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_blurbs_update_self" ON public.nomad_blurbs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_blurbs_delete_self" ON public.nomad_blurbs
  FOR DELETE USING (auth.uid() = user_id);
