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
  hometown?: string
  current_city?: string
  work_status?: 'available' | 'busy' | 'fulltime' | 'freelancing'
  timezone?: string
  visited_countries?: string[]
  // Kept as string for forward compat. App code treats every profile as nomad
  // since the Creator Profile wedge was deprecated. The DB column still exists
  // and the `users` table still holds whatever was saved on signup.
  profile_type?: string
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
    | 'other'
  label?: string
  url: string
  order_index: number
  created_at: string
  updated_at: string
}
