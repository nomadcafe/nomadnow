-- Optional photo per stay — turns the timeline into a visual gallery
-- instead of a plain text list. Nullable because a stay without a photo
-- still renders fine (city + dates + flag), and we don't want to gate
-- existing rows or force users to re-edit history.
--
-- Stored as a URL string rather than a foreign key into a separate
-- `stay_photos` table: there's exactly one photo per stay (no multi-
-- image gallery yet), the file lives in Supabase Storage anyway, and
-- this avoids a join on every public profile fetch.
ALTER TABLE nomad_stays
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
