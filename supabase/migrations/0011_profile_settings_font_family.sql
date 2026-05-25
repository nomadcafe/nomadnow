-- Font family override for the public card. Null / 'theme' = use the
-- theme's font class; any other value maps to a Google Font loaded
-- via lib/fonts.ts (next/font). App-side enum validation keeps the
-- list of valid keys in one place.
--
-- Stored as plain TEXT (not enum) so adding a new font in the future
-- is a code change only, no migration needed.
ALTER TABLE profile_settings
  ADD COLUMN IF NOT EXISTS font_family TEXT;
