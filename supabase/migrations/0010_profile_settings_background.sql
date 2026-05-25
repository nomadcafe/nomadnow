-- Custom card background — lets the user override the theme's outer
-- background with a solid color or 2-stop gradient. Stays orthogonal
-- to theme color: every theme keeps its card surface, text, and accent
-- colors; only the page-level wrapper changes when the user opts in.
--
--   background_mode  TEXT  — 'theme' (default, use theme.page Tailwind class)
--                            | 'solid' (single color)
--                            | 'gradient' (linear-gradient with two stops)
--   background_value JSONB — shape depends on mode:
--                              theme    → null
--                              solid    → { "color": "#1a1a1a" }
--                              gradient → { "from": "#ff7e5f", "to": "#feb47b",
--                                            "angle": 135 }
--
-- Image backgrounds intentionally deferred to a follow-up. Storing the
-- value as JSONB (not nested columns) keeps the migration cheap and lets
-- a v2 add new shape types without another schema change.
ALTER TABLE profile_settings
  ADD COLUMN IF NOT EXISTS background_mode TEXT DEFAULT 'theme',
  ADD COLUMN IF NOT EXISTS background_value JSONB;
