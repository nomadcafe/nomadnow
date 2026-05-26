-- Drop the unused `hide_branding` column from profile_settings.
--
-- Added in 0002 to gate the floating "Make yours" CTA on visitor view, but
-- the related /settings UI was removed in the commit that ships this
-- migration. Reasons covered there:
--   - The toggle's name ("Branding") implied it controlled the bottom
--     "Share this card / nomad.now/handle" footer; it never did.
--   - It wasn't plan-gated even though pricing copy framed it as a Pro
--     perk — inconsistent guarantee.
--   - The floating CTA is the platform's primary referral channel, so
--     letting paid users disable it bled the main growth path.
--
-- No code path reads or writes the column after this migration. DROP
-- COLUMN IF EXISTS so the migration is idempotent on databases that may
-- already have been hand-cleaned.

ALTER TABLE public.profile_settings DROP COLUMN IF EXISTS hide_branding;
