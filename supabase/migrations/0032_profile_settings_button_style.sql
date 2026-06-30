-- 0032_profile_settings_button_style.sql
-- Button STYLE preset for the link rows — orthogonal to button_shape (radius).
-- Maps to accent-driven classes in lib/themes.getButtonStyle:
--   theme   → keep the theme's own button look (current default behaviour)
--   fill    → solid accent buttons
--   outline → accent border, transparent fill
--   soft    → solid accent with a soft glow shadow
--   hard    → solid accent with a brutalist offset shadow
--
-- Plain TEXT with an app-side enum check (lib/themes.ts is the source of
-- truth). 'theme' default keeps every existing card pixel-identical until the
-- user opts in. profile_settings uses table-level grants, so no per-column
-- GRANT is needed (cf. 0007's column-level lockdown applies to public.users).
ALTER TABLE profile_settings
  ADD COLUMN IF NOT EXISTS button_style TEXT DEFAULT 'theme';
