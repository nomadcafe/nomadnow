-- 0002_hide_branding.sql
-- Adds the per-user branding toggle. Available to all paid plans (Basic, Pro)
-- per /pricing — defaults to FALSE so existing profiles keep showing the
-- "Make yours" CTA until the owner opts out in /settings.

ALTER TABLE profile_settings
  ADD COLUMN IF NOT EXISTS hide_branding BOOLEAN DEFAULT FALSE;
