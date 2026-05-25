-- Button shape preset for the link rows on the public card. Three named
-- values map to corner-radius classes in NomadCard:
--   pill    → fully rounded (Linktree-style)
--   rounded → moderate radius (current default, preserves existing look)
--   square  → no radius (brutalist)
--
-- Stored as a plain TEXT column with an app-side enum check (lib/themes.ts
-- has the source of truth for valid values). 'rounded' default keeps every
-- existing card identical until the user opts in to a new shape.
ALTER TABLE profile_settings
  ADD COLUMN IF NOT EXISTS button_shape TEXT DEFAULT 'rounded';
