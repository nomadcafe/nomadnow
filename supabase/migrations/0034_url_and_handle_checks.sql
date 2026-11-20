-- DB-level backstop for the URL / handle rules the API routes enforce in Zod.
--
-- Why: RLS + the column grants (0007 / 0027) let an authenticated user write
-- their OWN rows directly through PostgREST with the public anon key. That
-- path never touches app/api/*, so the Zod schemas there (safeLinkUrlSchema,
-- handleSchema, …) are skippable: a user could store `javascript:` hrefs, an
-- uppercase look-alike handle, or a handle the API would reject. lib/profile.ts
-- now scrubs at render time too; these CHECKs stop the bad data being written
-- at all.
--
-- NOT VALID: enforced for every new INSERT/UPDATE but doesn't scan existing
-- rows, so the migration can't fail on legacy data. Run
--   ALTER TABLE … VALIDATE CONSTRAINT …;
-- later once you've confirmed no existing rows violate them.

-- Link-ish URLs: same scheme allow-list as lib/validation.ts (http, https,
-- mailto, tel). Featured works are http/https only (see the featured-works
-- route).
ALTER TABLE public.nomad_links
  ADD CONSTRAINT nomad_links_url_scheme
  CHECK (url ~* '^(https?|mailto|tel):') NOT VALID;

ALTER TABLE public.nomad_featured_works
  ADD CONSTRAINT nomad_featured_works_url_scheme
  CHECK (url ~* '^https?://') NOT VALID;

ALTER TABLE public.users
  ADD CONSTRAINT users_website_scheme
  CHECK (website IS NULL OR website ~* '^(https?|mailto|tel):') NOT VALID,
  ADD CONSTRAINT users_hire_cta_url_scheme
  CHECK (hire_cta_url IS NULL OR hire_cta_url ~* '^(https?|mailto|tel):') NOT VALID,
  ADD CONSTRAINT users_meetup_cta_url_scheme
  CHECK (meetup_cta_url IS NULL OR meetup_cta_url ~* '^(https?|mailto|tel):') NOT VALID,
  -- Lowercase-only handle in the API's character set. UNIQUE on handle is
  -- case-sensitive, so without this `Alice` could sit beside `alice`.
  ADD CONSTRAINT users_handle_format
  CHECK (handle ~ '^[a-z0-9_-]{1,50}$') NOT VALID;

-- Image URLs: https only. (The exact-host rule lives in lib/image-hosts and is
-- re-checked at render; the project host isn't known to SQL.)
ALTER TABLE public.users
  ADD CONSTRAINT users_avatar_url_https
  CHECK (avatar_url IS NULL OR avatar_url ~* '^https://') NOT VALID;
