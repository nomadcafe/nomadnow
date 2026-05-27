-- 0025_users_visited_countries_count.sql
-- Stored generated column for the size of visited_countries[], so /explore's
-- "sort by countries" can do a real DB-level ORDER BY instead of the
-- previous client-side post-fetch sort.
--
-- Before this: the explore page fetched 24 rows by created_at DESC, then
-- sorted ONLY those 24 by visited_countries.length in JS. The result is
-- meaningless across pages — page 2 sorted a different 24 recent users,
-- so "users with the most countries" never actually surfaced. This column
-- lets PostgREST order the full table by country count without a JOIN or
-- RPC.
--
-- STORED so the value is computed at write time and indexable — RLS GRANTs
-- treat it like any other column.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS visited_countries_count INTEGER
  GENERATED ALWAYS AS (COALESCE(array_length(visited_countries, 1), 0)) STORED;

-- DESC NULLS LAST mirrors the "most countries first" query pattern. Single
-- index suffices because the count is small (0-200) so the planner won't
-- regress on the rare ascending query.
CREATE INDEX IF NOT EXISTS idx_users_visited_countries_count_desc
  ON users (visited_countries_count DESC NULLS LAST);

-- Column-level GRANT — migration 0007 swapped users to column-level SELECT
-- grants, so every new column needs an explicit GRANT. See 0023/0024 for
-- the pattern. Without this, the explore SELECT containing the new column
-- would silently fail and the page would return zero rows.
GRANT SELECT (visited_countries_count) ON public.users TO anon, authenticated;
