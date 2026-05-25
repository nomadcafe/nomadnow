-- Drop the legacy single-photo column. Migration 0012 added photo_urls
-- TEXT[] and backfilled it from photo_url, so by the time this runs every
-- row's image has already been promoted into the new array column.
ALTER TABLE nomad_stays
  DROP COLUMN IF EXISTS photo_url;
