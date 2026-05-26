-- Theme override columns — unbundle the preset.
--
-- Each of the 7 theme presets in lib/themes.ts ships a fixed combination of
-- (decoration, avatarStyle, bioQuoteStyle) tightly coupled to the colour
-- palette. Picking "Classic" forced the soft-ring avatar; picking "Mono"
-- forced the brackets bio quote. Migration 0020 already broke out accent
-- color; this one does the same for the three remaining discrete variants
-- so users can mix-and-match (e.g. Classic palette + mono-grid decoration
-- + polaroid avatar).
--
-- All three columns are nullable TEXT — NULL = inherit the theme preset's
-- baked-in value (so existing rows render unchanged). Validation lives in
-- the API's Zod schema (lib/themes.ts re-exports the catalogs) and the
-- getTheme() reader drops any value not in the catalog silently, so a
-- malformed override can't break the card render.

ALTER TABLE public.profile_settings
  ADD COLUMN IF NOT EXISTS decoration_override TEXT,
  ADD COLUMN IF NOT EXISTS avatar_style_override TEXT,
  ADD COLUMN IF NOT EXISTS bio_quote_style_override TEXT;
