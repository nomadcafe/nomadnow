-- Users table
-- Subscription / billing state is stored 1:1 on `users` — see columns at the
-- bottom of this CREATE. Stripe webhooks at /api/billing/webhook keep these
-- in sync.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  country TEXT,
  bio TEXT,
  website TEXT,
  location TEXT,
  -- Nomad Card fields
  role TEXT, -- 'Designer', 'Developer', 'Writer', etc.
  current_city TEXT, -- Current location (overrides location for nomad card)
  work_status TEXT DEFAULT 'available', -- 'available' | 'busy' | 'fulltime' | 'freelancing'
  timezone TEXT, -- Current timezone
  visited_countries TEXT[], -- Array of country codes (e.g., ['TH', 'JP', 'PT'])
  profile_type TEXT DEFAULT 'creator', -- 'creator' | 'nomad' | 'both'
  -- Hire-CTA fields drive the prominent "Hire me" / "Book a call" button
  -- on the public card. NULL = section hidden. Added in migration 0016.
  hire_cta_label TEXT,
  hire_cta_url TEXT,
  -- Meetup-CTA fields drive the secondary "Grab a coffee" / "Say hi" button.
  -- Twin to hire_cta — nomad-side conversion (peer meetups in the current
  -- city) vs hire_cta's freelance-side (client conversions). Added in 0019.
  meetup_cta_label TEXT,
  meetup_cta_url TEXT,
  -- One-line "now" headline shown under the name on the card — the live
  -- of-the-moment status (vs bio's durable self-description). ≤140 chars.
  -- Added in migration 0029.
  now_text TEXT CHECK (now_text IS NULL OR char_length(now_text) <= 140),
  -- Presence-freshness timestamp — the "now" layer. Separate from updated_at
  -- on purpose: drives the "confirmed N days ago" line + staleness fade on the
  -- public card. Server-stamped only (signup / confirm tap / city change).
  -- Added in migration 0028.
  presence_confirmed_at TIMESTAMPTZ,
  -- Stripe billing state (kept on users for 1:1 simplicity — see migration 0003)
  stripe_customer_id TEXT UNIQUE,
  plan TEXT,                     -- 'basic' | 'pro' | NULL (no active subscription)
  subscription_status TEXT,      -- mirrors Stripe subscription.status
  subscription_id TEXT UNIQUE,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_handle ON users(handle);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  tags TEXT[],
  started_at DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Revenues table (monthly granularity)
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  mrr_cents INTEGER DEFAULT 0,
  oneoff_cents INTEGER DEFAULT 0,
  currency CHAR(3) DEFAULT 'USD',
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, month)
);

CREATE INDEX idx_revenues_project_id ON revenues(project_id);
CREATE INDEX idx_revenues_month ON revenues(month);

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  happened_at DATE NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_milestones_happened_at ON milestones(happened_at);

-- Profile settings table
CREATE TABLE IF NOT EXISTS profile_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  visibility TEXT DEFAULT 'public',
  range_mode TEXT DEFAULT 'exact', -- 'exact' | 'range' | 'hidden'
  delay_days INTEGER DEFAULT 0,
  -- Layout and theme settings
  layout_template TEXT DEFAULT 'centered', -- 'centered' | 'card' | 'grid' | 'minimal'
  theme_color TEXT DEFAULT 'blue', -- 'blue' | 'purple' | 'green' | 'pink' | 'orange'
  -- Content visibility settings (JSON array of enabled sections)
      enabled_sections JSONB DEFAULT '["header", "revenue", "projects", "chart", "milestones"]'::jsonb,
      -- Section order (JSON array defining display order)
      section_order JSONB DEFAULT '["header", "revenue", "projects", "chart", "milestones"]'::jsonb,
  -- Button shape for link rows on the public card. 'pill' | 'rounded' (default) | 'square'.
  -- See lib/themes.ts for the rendering map.
  button_shape TEXT DEFAULT 'rounded',
  -- Custom card background. mode 'theme' (default) uses the theme's bg;
  -- 'solid' / 'gradient' use background_value. See lib/card-background.ts.
  background_mode TEXT DEFAULT 'theme',
  background_value JSONB,
  -- Font override (null = use theme.font). Keys match lib/fonts.ts FONT_KEYS.
  font_family TEXT,
  -- Hex accent override (e.g. '#FF6B35'). NULL = use the theme preset's
  -- baked-in accentHex. Repaints links, CTAs, brand-icon chip tints, map
  -- city dots — the loudest visual on the card. Added in migration 0020.
  accent_color TEXT,
  -- Per-axis theme overrides — let users mix-and-match across presets.
  -- NULL on each = inherit the chosen theme's baked-in value. Catalogs
  -- (ThemeDecoration / ThemeAvatarStyle / ThemeBioQuoteStyle) live in
  -- lib/themes.ts; bad values drop to the preset default at read time.
  -- Added in migration 0021.
  decoration_override TEXT,
  avatar_style_override TEXT,
  bio_quote_style_override TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'x' | 'bluesky'
  handle TEXT NOT NULL,
  external_id TEXT,
  url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);

-- Social metrics snapshots table (for historical tracking + caching)
CREATE TABLE IF NOT EXISTS social_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  source TEXT DEFAULT 'user_report' -- 'user_report' | 'api'
);

CREATE INDEX idx_social_metrics_account_id ON social_metrics(social_account_id);
CREATE INDEX idx_social_metrics_captured_at ON social_metrics(captured_at);

-- Nomad links table (for Nomad Card - max 3 links)
CREATE TABLE IF NOT EXISTS nomad_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- website | instagram | twitter | linkedin | github | youtube | tiktok | threads | substack | telegram | other
  label TEXT, -- Custom label if type is 'other'
  url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0, -- For ordering (0, 1, 2)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, order_index)
);

CREATE INDEX idx_nomad_links_user_id ON nomad_links(user_id);

-- City-level nomad stays (added in migration 0004). Complements the
-- country-level visited_countries[] on users with per-city duration data.
-- end_date NULL = currently at this city; day count derived at render time.
CREATE TABLE IF NOT EXISTS nomad_stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  country TEXT NOT NULL, -- ISO 3166-1 alpha-2
  lat NUMERIC,
  lon NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  photo_urls TEXT[] DEFAULT '{}', -- up to 6 Supabase Storage URLs; gallery rendered as scroll-snap carousel on the card
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nomad_stays_user_id ON nomad_stays(user_id);
CREATE INDEX idx_nomad_stays_user_start ON nomad_stays(user_id, start_date DESC);

-- Label/value pairs (added in migration 0017). Editorial side-data next
-- to the bio: "Now reading", "Booking", "Rate", "Tools", etc. Cap at ~8
-- enforced at the API layer.
CREATE TABLE IF NOT EXISTS nomad_blurbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (length(label) > 0 AND length(label) <= 30),
  value TEXT NOT NULL CHECK (length(value) > 0 AND length(value) <= 120),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nomad_blurbs_user_id ON nomad_blurbs(user_id);

-- Featured Work (added in migration 0018). Click-through project tiles —
-- case studies, portfolio pieces — with title + url + optional description.
-- Cap at 6 enforced at the API layer (matches GitHub Pinned).
CREATE TABLE IF NOT EXISTS nomad_featured_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 80),
  url TEXT NOT NULL CHECK (length(url) > 0 AND length(url) <= 2048),
  description TEXT CHECK (description IS NULL OR length(description) <= 140),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nomad_featured_works_user_id ON nomad_featured_works(user_id);

-- Enable Row Level Security (RLS) - public read, owner-only write via auth.uid()
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomad_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomad_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomad_blurbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomad_featured_works ENABLE ROW LEVEL SECURITY;

-- Ownership model:
--   users.id MUST equal auth.uid() at insert time. Enforced by RLS, not FK,
--   so the service_role key can still seed/admin freely.
-- Per-table policies are inlined below — this file is canonical for fresh
-- installs. Incremental schema changes live in supabase/migrations/.

-- users
CREATE POLICY "users_select_public" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_self" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_self" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_delete_self" ON users FOR DELETE USING (auth.uid() = id);

-- projects
CREATE POLICY "projects_select_public" ON projects FOR SELECT USING (true);
CREATE POLICY "projects_insert_owner" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update_owner" ON projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_delete_owner" ON projects FOR DELETE USING (auth.uid() = user_id);

-- revenues (owned via project)
CREATE POLICY "revenues_select_public" ON revenues FOR SELECT USING (true);
CREATE POLICY "revenues_insert_owner" ON revenues FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = revenues.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "revenues_update_owner" ON revenues FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = revenues.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "revenues_delete_owner" ON revenues FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = revenues.project_id AND projects.user_id = auth.uid())
);

-- milestones (owned via project)
CREATE POLICY "milestones_select_public" ON milestones FOR SELECT USING (true);
CREATE POLICY "milestones_insert_owner" ON milestones FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "milestones_update_owner" ON milestones FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "milestones_delete_owner" ON milestones FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid())
);

-- profile_settings
CREATE POLICY "profile_settings_select_public" ON profile_settings FOR SELECT USING (true);
CREATE POLICY "profile_settings_insert_self" ON profile_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profile_settings_update_self" ON profile_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profile_settings_delete_self" ON profile_settings FOR DELETE USING (auth.uid() = user_id);

-- social_accounts
CREATE POLICY "social_accounts_select_public" ON social_accounts FOR SELECT USING (true);
CREATE POLICY "social_accounts_insert_self" ON social_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_accounts_update_self" ON social_accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_accounts_delete_self" ON social_accounts FOR DELETE USING (auth.uid() = user_id);

-- social_metrics (owned via social_account)
CREATE POLICY "social_metrics_select_public" ON social_metrics FOR SELECT USING (true);
CREATE POLICY "social_metrics_insert_owner" ON social_metrics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM social_accounts WHERE social_accounts.id = social_metrics.social_account_id AND social_accounts.user_id = auth.uid())
);
CREATE POLICY "social_metrics_update_owner" ON social_metrics FOR UPDATE USING (
  EXISTS (SELECT 1 FROM social_accounts WHERE social_accounts.id = social_metrics.social_account_id AND social_accounts.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM social_accounts WHERE social_accounts.id = social_metrics.social_account_id AND social_accounts.user_id = auth.uid())
);
CREATE POLICY "social_metrics_delete_owner" ON social_metrics FOR DELETE USING (
  EXISTS (SELECT 1 FROM social_accounts WHERE social_accounts.id = social_metrics.social_account_id AND social_accounts.user_id = auth.uid())
);

-- nomad_links
CREATE POLICY "nomad_links_select_public" ON nomad_links FOR SELECT USING (true);
CREATE POLICY "nomad_links_insert_self" ON nomad_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_links_update_self" ON nomad_links FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_links_delete_self" ON nomad_links FOR DELETE USING (auth.uid() = user_id);

-- nomad_stays
CREATE POLICY "nomad_stays_select_public" ON nomad_stays FOR SELECT USING (true);
CREATE POLICY "nomad_stays_insert_self" ON nomad_stays FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_stays_update_self" ON nomad_stays FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_stays_delete_self" ON nomad_stays FOR DELETE USING (auth.uid() = user_id);

-- nomad_blurbs
CREATE POLICY "nomad_blurbs_select_public" ON nomad_blurbs FOR SELECT USING (true);
CREATE POLICY "nomad_blurbs_insert_self" ON nomad_blurbs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_blurbs_update_self" ON nomad_blurbs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_blurbs_delete_self" ON nomad_blurbs FOR DELETE USING (auth.uid() = user_id);

-- nomad_featured_works
CREATE POLICY "nomad_featured_works_select_public" ON nomad_featured_works FOR SELECT USING (true);
CREATE POLICY "nomad_featured_works_insert_self" ON nomad_featured_works FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_featured_works_update_self" ON nomad_featured_works FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nomad_featured_works_delete_self" ON nomad_featured_works FOR DELETE USING (auth.uid() = user_id);

