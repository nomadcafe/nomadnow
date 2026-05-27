-- Links layout — full-width rows vs compact icon strip.
--
-- The default 'rows' layout (every link as a wide labelled button + arrow)
-- gets crowded once a user has 5+ social accounts. 'icons' renders preset
-- platforms (instagram, twitter, github, etc.) as a single centred row of
-- brand-tinted icon buttons. Custom 'other' links and embeddable links
-- (YouTube / Spotify iframes) always keep the full-row form so their
-- labels / embeds stay legible.
--
-- Nullable TEXT — NULL = inherit the 'rows' default so existing cards
-- render unchanged. Validation lives in Zod (app/api/settings/route.ts);
-- the renderer drops unknown values back to 'rows' silently.

ALTER TABLE public.profile_settings
  ADD COLUMN IF NOT EXISTS links_layout TEXT;
