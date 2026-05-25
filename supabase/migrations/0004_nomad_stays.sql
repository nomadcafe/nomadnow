-- 0004_nomad_stays.sql
-- City-level nomad stays — replaces / supplements the country-level
-- visited_countries[] on `users`. Each row is one stay at a city; an
-- end_date of NULL means "currently here". Day counts get derived at
-- render time so the card stays fresh without scheduled jobs.
--
-- We keep `users.visited_countries` around for backward compat (and for
-- the global /map aggregate, which still works at country granularity).
-- New stays don't auto-write that column — the card just shows whichever
-- the user fills out.

CREATE TABLE IF NOT EXISTS nomad_stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  -- ISO 3166-1 alpha-2 country code (e.g. "TH"). Matches the format used
  -- by users.visited_countries so /map can union both data sources.
  country TEXT NOT NULL,
  -- Optional precise coords. Lets a later WorldMap iteration plot dots at
  -- city granularity instead of country-centroid. Filled in by client if
  -- the user picks a city from a geocoded suggestion; otherwise NULL.
  lat NUMERIC,
  lon NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nomad_stays_user_id ON nomad_stays(user_id);
CREATE INDEX IF NOT EXISTS idx_nomad_stays_user_start ON nomad_stays(user_id, start_date DESC);

ALTER TABLE nomad_stays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nomad_stays_select_public" ON nomad_stays
  FOR SELECT USING (true);
CREATE POLICY "nomad_stays_insert_self" ON nomad_stays
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_stays_update_self" ON nomad_stays
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_stays_delete_self" ON nomad_stays
  FOR DELETE USING (auth.uid() = user_id);
