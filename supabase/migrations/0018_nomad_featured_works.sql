-- Featured Work table — clickable project / case-study entries on the public card.
--
-- Part of the freelancer wedge (commit 272f362 added the Hire CTA; commit
-- 7fa46ed added blurbs). Where blurbs are short editorial label/value pairs,
-- Featured Work entries are full project tiles: title + url + optional
-- one-line description. Lets a freelancing nomad surface their best 3-6
-- pieces of work as click-through tiles next to the Hire button.
--
-- Mirrors nomad_blurbs / nomad_links in shape: per-row entity, RLS
-- public-read + owner-write, server PUT replace-all semantics on the
-- API side. Cap of 6 enforced at the API layer (matches GitHub Pinned —
-- enough to make a case, not so many that the section drowns the card).

CREATE TABLE IF NOT EXISTS public.nomad_featured_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 80),
  url TEXT NOT NULL CHECK (length(url) > 0 AND length(url) <= 2048),
  description TEXT CHECK (description IS NULL OR length(description) <= 140),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nomad_featured_works_user_id ON public.nomad_featured_works(user_id);

ALTER TABLE public.nomad_featured_works ENABLE ROW LEVEL SECURITY;

-- Public read, owner-only write — same model as nomad_blurbs / nomad_links.
CREATE POLICY "nomad_featured_works_select_public" ON public.nomad_featured_works
  FOR SELECT USING (true);
CREATE POLICY "nomad_featured_works_insert_self" ON public.nomad_featured_works
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_featured_works_update_self" ON public.nomad_featured_works
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_featured_works_delete_self" ON public.nomad_featured_works
  FOR DELETE USING (auth.uid() = user_id);
