-- Add accent_color override to profile_settings.
--
-- The 7 theme presets each ship a fixed accentHex baked into lib/themes.ts.
-- That accent paints every link button, the Hire CTA fill, the Meetup CTA
-- border, brand-icon chips that match a platform's brand colour, the map
-- city dots — the loudest visual signal on the card. Locking it to the
-- preset meant every "Classic" card looked identical no matter the user.
--
-- This column lets a user pick any hex colour while keeping the theme's
-- other choices (decoration, avatar style, font, etc.). NULL = use the
-- preset's default accent (so existing rows render unchanged).
--
-- Validation is server-side in app/api/settings/route.ts (HEX regex,
-- same one as background_value's color fields). DB stores it as plain
-- TEXT with no CHECK — keeping enforcement in Zod means the format
-- can evolve (e.g. CSS named colours later) without an ALTER TABLE.

ALTER TABLE public.profile_settings
  ADD COLUMN IF NOT EXISTS accent_color TEXT;
