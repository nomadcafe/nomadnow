// In-place embed detection for nomad_links URLs. When a link's URL matches
// a known embed pattern, NomadCard renders an iframe directly on the card
// instead of a click-out button. v1 supports YouTube and Spotify — both
// have stable iframe endpoints, no auth required, and cover the bulk of
// what creators/nomads actually want to put on their page.
//
// Parser philosophy: be strict about IDs (regex-validated) and fall
// through to null on anything weird so a malformed URL renders as a
// normal link button rather than embedding `about:blank` or worse.

export type EmbedKind = 'youtube' | 'vimeo' | 'spotify'

export interface EmbedSpec {
  kind: EmbedKind
  /** The iframe src — already pointing at the privacy-respecting variant. */
  embedUrl: string
  /**
   * Either an `aspectRatio` (for video — render width:100% and let CSS
   * derive height) or a fixed `height` in px (for audio embeds, which
   * have a single canonical compact size).
   */
  aspectRatio?: string
  height?: number
  /** <iframe title="..."> — required for a11y. */
  title: string
}

const YT_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
])
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'])
const SP_HOSTS = new Set(['open.spotify.com', 'spotify.com'])

// YouTube IDs are 11 chars of [A-Za-z0-9_-]. We accept 6–20 to tolerate
// shorts (~11) and odd test IDs without falling for ?v=javascript:....
const YT_ID_RE = /^[A-Za-z0-9_-]{6,20}$/
// Vimeo IDs are numeric; 6–12 digits covers everything historical to
// current. Private-link "secret" suffix (vimeo.com/{id}/{secret}) is
// stripped — we only need the ID for the embed src.
const VIMEO_ID_RE = /^\d{6,12}$/
const SP_ID_RE = /^[A-Za-z0-9]{6,40}$/
const SP_KINDS = new Set(['track', 'album', 'playlist', 'episode', 'show'])

export function detectEmbed(rawUrl: string | null | undefined): EmbedSpec | null {
  if (!rawUrl) return null
  let u: URL
  try {
    u = new URL(rawUrl)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null

  if (YT_HOSTS.has(u.hostname)) {
    const videoId = extractYouTubeId(u)
    if (videoId && YT_ID_RE.test(videoId)) {
      return {
        kind: 'youtube',
        // youtube-nocookie variant doesn't drop tracking cookies until the
        // user actually presses play — better for privacy + cookie banners.
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
        aspectRatio: '16 / 9',
        title: 'YouTube video',
      }
    }
  } else if (VIMEO_HOSTS.has(u.hostname)) {
    const videoId = extractVimeoId(u)
    if (videoId && VIMEO_ID_RE.test(videoId)) {
      return {
        kind: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        aspectRatio: '16 / 9',
        title: 'Vimeo video',
      }
    }
  } else if (SP_HOSTS.has(u.hostname)) {
    const parts = u.pathname.replace(/^\/+/, '').split('/')
    const kind = parts[0]
    const id = parts[1]
    if (id && SP_KINDS.has(kind) && SP_ID_RE.test(id)) {
      return {
        kind: 'spotify',
        embedUrl: `https://open.spotify.com/embed/${kind}/${id}`,
        // Spotify's "compact" embed is 152px, "normal" is 232px. 232 reads
        // as the same visual weight as a YouTube card on a max-w-2xl page.
        height: 232,
        title: 'Spotify embed',
      }
    }
  }
  return null
}

function extractYouTubeId(u: URL): string | null {
  if (u.hostname === 'youtu.be') {
    // youtu.be/{id}
    return u.pathname.split('/')[1] || null
  }
  if (u.pathname === '/watch') {
    // /watch?v={id}
    return u.searchParams.get('v')
  }
  if (u.pathname.startsWith('/embed/')) {
    return u.pathname.split('/')[2] || null
  }
  if (u.pathname.startsWith('/shorts/')) {
    return u.pathname.split('/')[2] || null
  }
  return null
}

function extractVimeoId(u: URL): string | null {
  // player.vimeo.com/video/{id}
  if (u.hostname === 'player.vimeo.com') {
    const parts = u.pathname.split('/').filter(Boolean)
    return parts[0] === 'video' ? parts[1] ?? null : null
  }
  // vimeo.com/{id}  OR  vimeo.com/{id}/{secret} (private-link hash)
  // The leading path segment is always the numeric video id; the secret
  // suffix is for unlisted videos and the embed iframe doesn't need it.
  const first = u.pathname.split('/').filter(Boolean)[0]
  return first ?? null
}
