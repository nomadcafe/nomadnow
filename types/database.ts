export interface User {
  id: string
  handle: string
  display_name?: string
  avatar_url?: string
  country?: string
  bio?: string
  website?: string
  location?: string
  // Nomad Card fields
  role?: string
  current_city?: string
  // Free-form. Preset slugs ('freelancing' | 'busy' | 'fulltime') get
  // localised labels in NomadCard; anything else renders verbatim so
  // users can write their own status (e.g., "slow travel mode").
  work_status?: string
  timezone?: string
  visited_countries?: string[]
  // ISO date (YYYY-MM-DD, always YYYY-MM-01 in practice — the form is a
  // month picker). When set, drives the "X years on the road" stat on the
  // public card. NULL falls back to sum(nomad_stays.duration) so power
  // users who fill out stays still get an accurate number without ever
  // touching this field.
  nomad_since?: string | null
  // Kept as string for forward compat. App code treats every profile as nomad
  // since the Creator Profile wedge was deprecated. The DB column still exists
  // and the `users` table still holds whatever was saved on signup.
  profile_type?: string
  // Manual verification flag (admin-toggled). Drives the "Verified" pill on
  // the public card — never set by users themselves.
  verified?: boolean
  // Hire CTA — when both label and url are set, the public card renders a
  // prominent solid-accent button (distinct from the bordered link rows)
  // pointing to mailto: / https: / tel: / Calendly etc.
  hire_cta_label?: string | null
  hire_cta_url?: string | null
  // Meetup CTA — twin of hire_cta but for peer meetups ("Grab a coffee in
  // {current_city}", "Say hi on Telegram"). Renders as a secondary outlined
  // button on the card so it reads as paired-but-secondary to Hire CTA.
  meetup_cta_label?: string | null
  meetup_cta_url?: string | null
  // Stripe billing — see supabase/migrations/0003_subscriptions.sql
  stripe_customer_id?: string | null
  plan?: 'basic' | 'pro' | null
  subscription_status?: string | null
  subscription_id?: string | null
  current_period_end?: string | null
  created_at: string
  updated_at: string
}

export interface ProfileSettings {
  user_id: string
  visibility: string
  delay_days: number
  layout_template?: 'centered' | 'card' | 'grid' | 'minimal'
  // theme_color stores a theme preset key from lib/themes.ts.
  // Kept as string here for forward-compat; the source of truth for valid values
  // is the Zod schema in app/api/settings/route.ts.
  theme_color?: string
  enabled_sections?: string[]
  section_order?: string[]
  // Corner-radius preset for link buttons on the public card. See
  // lib/themes.ts for the className map. Defaults to 'rounded' so existing
  // cards render unchanged.
  button_shape?: 'pill' | 'rounded' | 'square'
  // Optional custom outer background — see lib/card-background.ts. Mode
  // 'theme' (default) uses the theme.page Tailwind class; 'solid' and
  // 'gradient' read the structured value.
  background_mode?: 'theme' | 'solid' | 'gradient'
  background_value?: unknown
  // Font override key (null / 'theme' = inherit theme.font).
  // See lib/fonts.ts for the curated list.
  font_family?: string | null
  // Hex accent override (#RRGGBB / #RGB / #RRGGBBAA). NULL = inherit the
  // theme preset's accentHex. Applied at render time via getTheme override.
  accent_color?: string | null
  // Per-axis theme overrides. Each NULL = inherit the chosen theme preset's
  // baked-in value. Catalogs live in lib/themes.ts as ThemeDecoration /
  // ThemeAvatarStyle / ThemeBioQuoteStyle. Bad values drop silently at
  // read time so old/junk overrides can't break the card.
  decoration_override?: string | null
  avatar_style_override?: string | null
  bio_quote_style_override?: string | null
  // 'rows' (default) renders each link as a full-width labelled button.
  // 'icons' collapses preset-brand links into a centred icon strip; custom
  // 'other' links and embeddable URLs (YouTube / Spotify iframes) always
  // stay as full rows so their labels / embeds remain legible.
  links_layout?: 'rows' | 'icons' | null
  created_at: string
  updated_at: string
}

// City-level nomad stay. Multiple per user; end_date NULL = currently at
// this city. Day count is derived at render time.
export interface NomadStay {
  id: string
  user_id: string
  city: string
  country: string // ISO 3166-1 alpha-2
  lat?: number | null
  lon?: number | null
  start_date: string // YYYY-MM-DD
  end_date?: string | null
  notes?: string | null
  // Up to 6 Supabase Storage URLs. Empty array (or undefined) means
  // the stay renders without imagery. Rendered as a scroll-snap
  // carousel on the public card when length > 1.
  photo_urls?: string[] | null
  created_at: string
  updated_at: string
}

// Label/value pair shown as editorial side-data on the public card.
// Cap on count (~8) enforced at the API layer; lengths enforced at both
// DB CHECK constraints and Zod.
export interface NomadBlurb {
  id: string
  user_id: string
  label: string // <= 30 chars
  value: string // <= 120 chars
  order_index: number
  created_at: string
  updated_at: string
}

// Click-through project tile (case study / portfolio piece) shown on the
// public card. Cap of 6 enforced at the API layer (matches GitHub Pinned);
// lengths enforced at both DB CHECK constraints and Zod.
export interface NomadFeaturedWork {
  id: string
  user_id: string
  title: string // <= 80 chars
  url: string // http/https; <= 2048 chars
  description?: string | null // <= 140 chars
  order_index: number
  created_at: string
  updated_at: string
}

export interface NomadLink {
  id: string
  user_id: string
  type:
    | 'website'
    | 'instagram'
    | 'twitter'
    | 'linkedin'
    | 'github'
    | 'youtube'
    | 'tiktok'
    | 'threads'
    | 'substack'
    | 'telegram'
    | 'spotify'
    | 'other'
  label?: string
  url: string
  order_index: number
  created_at: string
  updated_at: string
}
