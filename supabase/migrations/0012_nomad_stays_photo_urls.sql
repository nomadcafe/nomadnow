-- Multi-photo gallery per stay (up to 6 photos). Replaces the single
-- photo_url column added in 0008. Stored as TEXT[] so we can hold all
-- URLs on the stay row itself without a join (stays are already
-- replace-all on save in the app — a separate stay_photos table would
-- need its own ownership/RLS surface area for no benefit).
--
-- We DO NOT drop photo_url here. Old code reading photo_url stays
-- functional during the deploy window between code rollout and this
-- migration completing. A follow-up migration can drop the column
-- after one release has shipped without referring to it.
ALTER TABLE nomad_stays
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- Backfill: existing single-photo rows become one-element arrays so
-- nothing in the UI looks empty after the migration. Idempotent — runs
-- only on rows that haven't been populated yet.
UPDATE nomad_stays
  SET photo_urls = ARRAY[photo_url]
  WHERE photo_url IS NOT NULL
    AND photo_url <> ''
    AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL);
