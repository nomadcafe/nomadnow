-- 0024_users_open_to_coffee.sql
-- "Open to coffee in {current_city}" — a soft availability signal on the
-- public card. Powers the bridge from "card for hire" to "card → grab a
-- coffee in person", the long-term direction for nomad.now.
--
-- Independent from meetup_cta_url: meetup_cta is a hard channel (cal.com /
-- Telegram link, an explicit action), open_to_coffee is a stance ("I'm
-- available to meet, reach me however"). Users can set either, both, or
-- neither.
--
-- NOT NULL + DEFAULT FALSE so the column has a defined value for every row
-- without a backfill — the chip simply stays hidden until users opt in.
-- Renderer additionally suppresses the chip when current_city is empty
-- (no city = no place to grab coffee).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS open_to_coffee BOOLEAN NOT NULL DEFAULT FALSE;

-- Cheap partial index for the eventual "who's open to coffee in {city}"
-- aggregate. Partial because the FALSE rows vastly outnumber TRUE; we
-- only ever query for TRUE.
CREATE INDEX IF NOT EXISTS idx_users_open_to_coffee
  ON users (current_city)
  WHERE open_to_coffee = TRUE;
