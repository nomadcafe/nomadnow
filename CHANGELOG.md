# Changelog

## 2026-05-24 (deploy unblock) — Upstash rate limit (ROADMAP N5b)

The last deploy prerequisite. In-memory rate limit didn't survive serverless (each warm Vercel instance had its own counter, so any meaningful traffic effectively had no rate limit). Now backed by Upstash Redis.

### Added
- `@upstash/ratelimit` + `@upstash/redis` dependencies. Middleware bundle: 90.4kB → 115kB (~25kB for the Redis REST client).
- `lib/env.ts` — surface `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as optional env vars (documentation; missing values trigger the no-op path).
- `SETUP_AUTH.md` — full Upstash setup section: Vercel marketplace one-click + manual setup + local dev no-op behavior + smoke test command.

### Changed
- **`lib/rate-limit.ts` rewritten**:
  - Uses `Ratelimit.slidingWindow(100, '15 m')` — atomic counter shared across all serverless instances.
  - Lazy-initialized; reads `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` once at first call.
  - **Fail-open** both ways: when env is missing (local dev), and when the Redis call itself errors. Availability beats burst protection.
  - Public API trimmed from `checkRateLimit(id, {windowMs, maxRequests})` to `checkRateLimit(id)` — window/limit are now policy not parameter.
  - Removed the in-memory `Map` store and 5-min cleanup interval — both obsolete.
- **`middleware.ts`** — awaits the now-async `checkRateLimit`, uses the returned `limit` for the `X-RateLimit-Limit` header instead of a hardcoded 100.

### Behavior matrix
| Environment            | Upstash env vars | Result                                |
| ---------------------- | ---------------- | ------------------------------------- |
| Production (correctly configured) | set        | Real rate-limit enforced (429 on bust) |
| Production (forgot env vars)      | unset      | Fail-open. Logs warning. Not safe at scale. |
| Vercel preview / dev              | unset      | Fail-open. Intended.                 |
| Upstash hiccup                    | set, transient err | Fail-open per request. No 503. |

### Known follow-ups
- `X-RateLimit-Limit/Remaining/Reset` headers only emit on 429s today; could emit on every successful response too (small per-request overhead).
- No bypass list for known good bots (Google / Bingbot). Not needed at current scale, but a `User-Agent` allowlist is a 10-line add when it becomes relevant.

---

## 2026-05-24 (cleanup pass) — Creator wedge purge, P0 fixes, per-country OG

Audit-driven cleanup. Three real bugs fixed, ~1500+ LOC of deprecated Creator Profile code removed, per-country OG images shipped, supabase shim retired.

### Fixed (P0)
- **`/api/settings` GET default values were creator-flavored** (and `theme_color: 'blue'` no longer in the new enum) — round-tripping the response through PUT would fail Zod validation. Defaults now `theme_color: 'classic'` and nomad section IDs.
- **`handleSchema.min(1)` vs UI `min(2)`** — server allowed handles the UI rejected. Schema bumped to `min(2)`.

### Removed (creator wedge purge — ~1500 LOC)
- `app/import/` — Creator-only CSV import page.
- `app/api/{projects,revenues,milestones,social,import,export,card}/` — 7 creator-flavored API routes.
- `components/{ProfileLayout, ProjectCard, RevenueChart, RevenueSummary, MilestoneList, ProfileHeader, ExportButton, SocialShareButtons, LoadingProjectCard}.tsx` — 9 creator components.
- `lib/supabase.ts` legacy shim — all 7 callers migrated to `lib/supabase/server.ts`'s `createServerSupabase()`.
- `lib/validation.ts` — dropped `csvImportSchema` and `socialReportSchema`.
- `lib/sections.ts` — dropped `CREATOR_SECTIONS` and `CREATOR_DEFAULT_ORDER`; `reconcileSectionOrder/EnabledSections` keep their `profileType` param for forward compat but now always use nomad catalog.
- `types/database.ts` — dropped `Project`, `Revenue`, `Milestone`, `SocialAccount`, `SocialMetric`, `ProfileData`, `CSVImportRow` types.
- `app/[handle]/page.tsx` — dropped the `<Suspense>` wrapper (NomadCard renders synchronously, fallback never fired) and the `profileType !== 'nomad'` branch. Now always renders `<NomadCard>`. The page also no longer pulls `LoadingProfile`, `format` (date-fns), or creator types. **Page bundle shrank from 118kB to 175B** (the creator components were the bulk).
- `app/settings/page.tsx` — dropped profile-type branching, the "Revenue display (Creator Profile only)" `range_mode` field, and the `profile_type` user fetch.
- `app/api/settings/route.ts` — dropped `range_mode` from Zod schema and defaults.
- `app/api/profile/[handle]/route.ts` — rewritten. No more parallel fetches of projects/revenues/milestones/socials. Returns only `user`, `settings`, `nomadLinks`. (Half the file disappeared.)
- `app/layout.tsx` keywords — dropped `'indie creator'`.
- `middleware.ts` `PROTECTED_PATHS` — dropped `/create` and `/import`.

### Added (P2)
- **`/og/in/[country]`** — per-country OG share image. 1200×630 with big flag, "Nomads in {country}" title, and live count from DB. Wired into `/in/[country]` page metadata so Twitter/LinkedIn previews are flag-driven. Pairs the new long-tail SEO surface with viral share-ability.
- **`NomadCard` `hideMakeYoursCTA` prop** — suppresses the floating "Make yours →" CTA. Used by `/preview` so the design-QA page doesn't dangle a button that points users to "claim" a card they're looking at a mock of.

### Notes on what survived
- `profile_type` column stays on `users` table — code now treats every profile as nomad regardless, but the column is harmless and re-enables future segmentation.
- `lib/validation.ts` kept `handleSchema`. `lib/sections.ts` kept `reconcileSectionOrder/EnabledSections` with their `profileType` param for forward compat.
- `supabase/schema.sql` was **not** touched. Orphan tables (`projects`, `revenues`, `milestones`, `social_accounts`, `social_metrics`) still exist on existing databases. Cleanup is a separate migration that can wait.

### Known follow-ups
- N5b Upstash rate limit — still the only thing blocking real production deploy.

---

## 2026-05-24 (SEO long-tail) — `/in/{country}` per-country pages

ROADMAP NEXT item — the long-tail SEO surface. Every country now gets its own indexable page listing nomads who've been there. Pairs with `/map` (where the top-country grid points) to form a discovery loop.

### Added
- **`/in/[country]`** new dynamic route. Slug-based URLs (`/in/portugal`, `/in/south-korea`, `/in/united-kingdom`). `generateStaticParams()` pre-renders 48 country pages at build time; the rest are on-demand. ISR `revalidate: 300` (5min) + 1y stale-while-revalidate.
- Each country page contains:
  - Country-themed hero with big flag emoji + name
  - Stat: "{N} nomads have set foot in {country}"
  - Grid of nomad summary cards linking to `/{handle}`
  - JSON-LD `CollectionPage` + `ItemList` so search engines understand the entity
  - Country-targeted metadata (title, description, keywords) for long-tail SEO
  - Empty state: "Add {country} to your visited countries and you'll show up here" — turns empty pages into conversion CTAs
  - Breadcrumb back to `/map`
- **`slugForCountry(code)` + `codeForSlug(slug)`** helpers in `lib/countries.ts`. Slug strategy: lowercase + diacritics-stripped + non-alphanumerics → hyphens. "South Korea" → `south-korea`, "United Kingdom" → `united-kingdom`.

### Changed
- **`/map` top-countries grid** — tiles now link to `/in/{slug}` (the new country page) instead of `/explore?country={code}`. Closes the loop: map → country page → individual profile.
- **`lib/reserved-handles.ts`** — added `in` to the reserved list. Visiting `nomad.now/in` now shows the Reserved state instead of attempting `/{handle}` resolution.

### Known follow-ups
- "Currently in {country}" semantics — currently the page shows users with the country in `visited_countries`, not strictly currently located there. Would need geocoding `current_city` to country, or a separate column.
- City-level pages `/in/{city}` — same idea, but requires the same geocoding step.
- Country pages don't have a custom OG image yet — they use the site default. A per-country OG (flag + name + count) would lift social-share CTR meaningfully.

---

## 2026-05-24 (UX polish round) — Profile page polish: 404 as claim, themed skeleton, wedge-correct JSON-LD

Polished the public profile page (`/{handle}`) — the surface external visitors land on. Treated the 404 state as a conversion opportunity, brought the skeleton in line with the real card, and stopped advertising creator metadata to nomad profiles in search results.

### Added
- **`<ProfileNotFound>`** (`components/ProfileNotFound.tsx`) — single component, three states based on the handle string:
  - **Available** (valid format, not reserved, no DB row): big "Claim @{handle}" CTA → `/create-card?handle={handle}`. Turns dead links into conversions.
  - **Reserved**: explains why and offers "Pick a different handle".
  - **Invalid format**: short rule reminder + two muted CTAs.
  - Full nav (Logo, Explore, Map) so visitors who land here cold can still browse.
- **`/create-card?handle=xxx` prefill** — `useEffect` reads the URL param at mount and sets it as the handle input (lowercased, trimmed, max 50 chars), overriding any saved draft so the "Claim @xxx" intent is honored. Works without `useSearchParams`, no Suspense gymnastics.

### Changed
- **`app/[handle]/page.tsx`** — replaced the in-page generic 404 block with `<ProfileNotFound>`. Reserved-handle path now also flows through `ProfileNotFound` instead of calling Next's `notFound()`, so brand-reserved names get the friendly UX too.
- **Default `profile_type` flipped to `'nomad'`** (was `'creator'`). The nomad wedge is the default; creator is opt-in.
- **JSON-LD `Person` schema** branched by wedge:
  - Nomad users no longer get phantom `aggregateRevenue` / `worksFor` / `knowsAbout:SoftwareApplication` fields in their search snippets.
  - Added `jobTitle` (from `user.role`), `homeLocation` (from `hometown`), `address.addressLocality` (from `current_city`), `alternateName`, and `additionalProperty: "Visited countries"` for nomads.
  - Smarter description fallback: "Digital nomad · {role} · currently in {city}" when bio is empty.
- **`LoadingProfile`** rewritten to mirror the actual NomadCard structure (avatar → name → role → location → bio → stat strip → map → pills → 3 link rows). No more generic gray squares — the layout stays stable through hydration.

### Fixed
- Reserved handles like `/admin` previously rendered Next's framework 404. Now they explain themselves.

### Known follow-ups
- ProfileNotFound only checks reserved + format synchronously. Could add a server-side query to confirm "actually unclaimed in DB" — but for our scope, anything that reached this fallback already failed `getProfileData`, so it's effectively unclaimed.
- `/create-card` prefill via URLSearchParams works but uses the browser API instead of `useSearchParams`. If we ever need SSR-aware prefill (for SEO or share previews), revisit.

---

## 2026-05-24 (still going) — `/map` aggregate nomad map

ROADMAP NEXT item #1 — the global nomad map. Lean v1: aggregate density only, no per-user placement (which would need geocoding + an opt-in flag). Lets us ship the SEO/retention surface without new schema.

### Added
- **`/map`** new top-level page (`app/map/page.tsx`). Server-rendered, `revalidate = 300` (5 min). Queries all users' `visited_countries`, aggregates counts per country, renders:
  - Top stat strip: nomads tracked / countries covered / visits logged
  - Density world map (sqrt-scaled dots; bigger = more nomads)
  - Top 12 countries grid, sorted by nomad count, with 🥇🥈🥉 for top 3, each linking to `/explore?country=XX`
  - Empty state when no data: "Be the first to claim a card and put a country on the board"
  - Warm CTA strip at the bottom
- **WorldMap density mode** — new optional `weights?: Record<countryCode, number>` prop. When provided, takes precedence over `visitedCodes`; dot radii scale `sqrt(weight/maxWeight)` so a country with 100 nomads is only ~3× the size of one with 10 (not 10×), and outliers don't dominate. Tooltip shows count per country.
- **Nav entries for `/map`** in homepage nav, homepage footer, and `/explore` nav.

### Changed
- **`lib/reserved-handles.ts`** — added `map` and `og` to the reserved-handles set (matches the new top-level routes).

### Known follow-ups
- Per-user current city pin on the map (needs geocoding city → lat/lon, plus `show_on_map` opt-in column on users).
- `/in/{city}` and `/in/{country}` sub-pages — the "who's in {city}" retention play from ROADMAP NEXT. Now that `/explore?country=XX` works, the URL→country route is a 30-min add.
- The JS-side aggregate scan in `getAggregate()` is O(users); fine up to a few thousand. Past that, push to a SQL aggregate (`unnest` + `GROUP BY`).

---

## 2026-05-24 (even later) — Section reordering, profile-type-aware settings

Closed the loop on `enabled_sections` + `section_order` — DB columns existed since day one but the Nomad Card was rendering a hardcoded order. Settings page also stopped showing creator-only sections to nomad users.

### Added
- **`lib/sections.ts`** — canonical catalog of sections per profile type. `NOMAD_SECTIONS` (avatar, name, location, bio, stats, map, status, links) and `CREATOR_SECTIONS` (header, revenue, projects, chart, milestones). Each `SectionDef` has an optional `required` flag (currently `name`). `reconcileSectionOrder()` / `reconcileEnabledSections()` clean up legacy / mismatched IDs and ensure required sections are always on.
- **`/preview` accepts `?order=` and `?disable=`** for reorder/visibility QA without touching the DB. Examples: `/preview?order=name,location,links,bio,stats,map,status,avatar` or `/preview?disable=bio,map`.

### Changed
- **NomadCard renders by section order**. Each section is now a render function in a `Record<id, () => ReactNode>` and the component iterates `reconcileSectionOrder(profile_type, sectionOrder).filter(id => enabled.has(id))`. Share footer stays anchored at the bottom (not reorderable). Sections that have no data (bio with no bio, map with no countries) render `null` so reordering an empty block doesn't leave a gap.
- **`app/[handle]/page.tsx`** now also passes `settings.enabled_sections` and `settings.section_order` to NomadCard.
- **Settings sections list now branches on `profile_type`**. Nomad users see nomad sections (avatar / name / location / bio / stats / map / status / links); creator users see creator sections. The list iterates in stored order so move-up/down has immediate visual feedback. Toggling a section off keeps its position in `section_order` (re-enabling restores it where it was).
- **Required sections** are checkboxed-disabled with a small `REQUIRED` label.
- **`ProfileSettings.theme_color` type** loosened from the legacy color enum to `string` (the source of truth is now the Zod schema in `/api/settings`). `components/ProfileLayout.tsx` (creator-only) coerces unknown theme values to `'blue'` until it migrates to the new theme system.

### Known follow-ups
- ProfileLayout (creator profile) still uses the old 5-color theme map. Either retire ProfileLayout per ROADMAP (Creator Profile deferred) or migrate it onto `lib/themes.ts`.
- Drag-and-drop reorder (vs the current up/down buttons) — defer until users ask. Up/down works on mobile and avoids a dnd-kit dep.

---

## 2026-05-24 (later) — Themes, editorial homepage, logo mark, page polish

Visual identity round: 7 named themes for the Nomad Card (end-to-end including OG share image), homepage refit, login/import/settings styling, shared logo component.

### Added
- **7 Nomad Card themes** (`lib/themes.ts`) as named presets — `classic`, `midnight`, `sunset`, `mono`, `vivid`, `forest`, `cream`. Each preset bundles page bg, card surface, text colors, pills, link rows, accent, font, and (new) OG image tokens. Settings UI replaces the 5-color swatch picker with real mini-card previews of each theme.
- **Per-theme OG share images**. `app/og/[handle]/route.tsx` now fetches `profile_settings.theme_color` for the user and renders the OG canvas with that theme's `og.{bg,fg,muted,divider,pillBg,pillFg,pillBorder,brandFg,fontFamily}` tokens. Supports `?theme=xxx` query for design QA via `/preview` theme switcher.
- **`<Logo />` component** (`components/Logo.tsx`) — green pulse dot + `nomad.now` wordmark, two sizes, used in nav across all pages.
- **Hero homepage refit** — bigger 88px headline (`tracking-tighter`), layered tilted card preview with warm sunset gradient wash, sticky nav with Sign-in + CTA, footer brand line.
- **Live now row** (`components/LiveCityRow.tsx`) — 4 mock city cards with real ticking local times (Lisbon / Bangkok / Mexico City / Tokyo). Visual demo of the live-time differentiator.
- **Marquee band** (`components/MarqueeBand.tsx`) — CSS-only infinite scroll of 16 nomad-popular cities, double-rendered for seamless loop, edge fade gradients. Respects `prefers-reduced-motion`.
- **Editorial features section** — replaced 3-col icon grid with alternating image/text rows. Each feature has a label, large title, body, and a real visual (mini WorldMap, Lisbon clock, status pills with new "Slow travel mode" amber pill).
- **Dark full-bleed CTA band** at homepage bottom — `bg-gray-950` with radial warm gradient overlay, white pill button.
- **`/preview` theme switcher** — fixed top-center pill bar to jump between all 7 themes; `?theme=` query param controls render.
- **WorldMap `accentColor` + `baseColor` props** — visited-country dot and constellation tone now follow the active theme. Dark themes get `gray-700` base; vivid gets translucent white.
- **Inter font** via `next/font/google`, wired through `tailwind.config.js` `font-sans`.
- **`marquee` keyframe** in `globals.css` + `.animate-marquee` utility.

### Changed
- **NomadCard** (`components/NomadCard.tsx`) takes `themeKey` prop and dispatches all chrome (page bg, card surface, text, pills, link rows, divider, font, share footer) through `lib/themes.ts` tokens. No hardcoded color/border classes remain inside the card body.
- **`app/[handle]/page.tsx`** threads `settings.theme_color` into NomadCard. `getProfileData` already fetched `settings`; we just pass it through.
- **`POST /api/settings` Zod schema** — `theme_color` enum is now `classic | midnight | sunset | mono | vivid | forest | cream` (was `blue | purple | green | pink | orange`). Legacy values fall back to `classic` via `normalizeTheme()` on the settings page.
- **`/settings`** rewritten with new design system (gray-900 CTAs, rounded-xl inputs, sticky save bar). Theme picker is now 5/7 tiles each rendering a tiny themed card mock.
- **`/login`, `/import`, `/explore`** restyled to match the new minimalist design system (white bg, gray-900 buttons, rounded-full primaries).
- **Reserved handles guard** (`lib/reserved-handles.ts`) added — blocks `favicon.ico`, top-level route names, brand/admin names. Enforced in `[handle]/page.tsx`, `POST /api/users`, `GET /api/users/check-handle`. Resolves the `/api/profile/favicon.ico 400` noise in dev.
- **Middleware dev-friendly bypass** — when Supabase env vars are missing/placeholder, skip session refresh so `npm run dev` boots without `.env.local`. Production behavior unchanged.
- **`/create-card`** trimmed to 3 essentials above the fold (handle, name, current city) with collapsible "Customize more (optional)" for the rest. Sticky bottom CTA. Removed `userId` hidden field (derived from session).
- **`app/[handle]/page.tsx`** metadata: OG/Twitter images now point at `/og/[handle]` (the dynamic per-theme PNG) instead of the user's raw `avatar_url`.

### Removed
- `app/create/` (Creator Profile flow) — deferred per ROADMAP, will return as either a link-out to trustmrr or as an unverified-disclosure mode.
- `app/card/` — empty stale directory.
- 7 redundant root markdown files (consolidated into README + ROADMAP + CHANGELOG + SETUP_AUTH).
- The old `theme_color`-as-accent-color concept — now `theme_color` stores a preset name; the actual accent color lives inside the preset definition.

### Known follow-ups (not in this changeset)
- Section reordering (drag-to-reorder NomadCard sections) — DB columns ready, needs NomadCard refactored into independent section components + dnd library.
- Per-user accent color overrides on top of a theme (PRO tier).
- Rate-limit migration from in-memory to Upstash/Vercel KV (ROADMAP N5b) — still required before deploy.
- ExploreClient server-side sort by `visited_countries.length` is done client-side after page fetch; won't scale past a few hundred users.

---

## 2026-05-24 — Auth, wedge pivot, UI rewrite, OG share image

Significant overhaul: the project moves from "creator MRR display" (creator wedge) to "nomad bio link" (nomad wedge). Auth and access control land for the first time.

### Added
- **Supabase Auth (magic link)** via `@supabase/ssr`. New `app/login/page.tsx`, `app/auth/callback/route.ts`. Session refresh and protected-page gating in `middleware.ts` (`/create-card`, `/settings`, `/import`).
- **Real RLS policies**. `supabase/migrations/0001_auth_and_rls.sql` replaces placeholder `USING (true)` with owner-checks via `auth.uid()`. Public read remains.
- **Server-side Supabase client wrappers**: `lib/supabase/server.ts` (`createServerSupabase`, `requireUser`), `lib/supabase/browser.ts`, `lib/supabase/admin.ts`.
- **OG share image** at `GET /og/[handle]` via `next/og` + Twemoji. 1200×630 PNG, cache 1h CDN + stale-while-revalidate 24h. Wired into `app/[handle]/page.tsx` metadata for Twitter/LinkedIn/Facebook previews. `?preview=1` query param renders mock data for design QA.
- **Reserved handles guard** (`lib/reserved-handles.ts`) — blocks `favicon.ico`, `robots.txt`, top-level routes, brand/admin names. Enforced in `app/[handle]/page.tsx`, `POST /api/users`, `GET /api/users/check-handle`.
- **World map component** (`components/WorldMap.tsx`) — inline SVG, no deps. 48 nomad-popular countries as base constellation; visited countries highlighted with halo.
- **MakeYoursCTA** (`components/MakeYoursCTA.tsx`) — fixed top-right viral-loop CTA on every Nomad Card view.
- **Inter font** via `next/font/google`. Wired through `tailwind.config.js` `font-sans` family.
- **Static preview page** `app/preview/page.tsx` — Nomad Card with mock data, no DB needed.

### Changed
- **Homepage rewritten** (`app/page.tsx`) — nomad wedge, hero with live card preview, trust strip, 3 feature blocks with real visuals, vs-Linktree comparison table, single "Get your card" CTA throughout. References Lnk.Bio / bio.link / trustmrr.com patterns.
- **`/create-card` collapsed** to 3 essentials (handle, name, current city) above the fold + "Customize more (optional)" expandable. Sticky bottom CTA. Removed userId hidden field — derived from session.
- **`/explore` rewritten** — nomad wedge copy, removed revenue/projects sort, added "Newest / Most countries / A→Z" sort, cards now show city, live local time, country flag preview, role.
- **NomadCard** (`components/NomadCard.tsx`) — added live local time (ticks 60s), trustmrr-style stat strip (countries + member since), inline WorldMap, Verified + work status pills, MakeYoursCTA.
- **8 write API routes** refactored to derive `user_id` from session via `requireUser()`. Removed all body-trusted `userId` parameters. Routes: `users`, `projects`, `revenues`, `milestones`, `settings`, `nomad-links`, `social/report`, `import/csv`.
- **Settings page** (`app/settings/page.tsx`) — uses session via browser Supabase client; removed `?userId=` URL hack.
- **Import page** (`app/import/page.tsx`) — removed manual User ID input field.
- **Middleware** — auth gating for protected paths, in-memory rate limit kept (Upstash migration tracked as ROADMAP N5b).
- **Next.js** 15.5.7 → 15.5.18 (~20 high-severity CVEs patched). React 19.2.1 → 19.2.6. Multiple patch/minor bumps.
- **`SETUP_AUTH.md`** documents Supabase console setup, migration run, demo data handling.
- **`ROADMAP.md`** introduced with NOW / NEXT / LATER / KILL framework. Explicit wedge decision: Nomad Card primary.
- **`README.md`** rewritten — accurate product description, links to ROADMAP.

### Removed
- `app/create/` (creator profile flow) — Creator Profile relaunch deferred per roadmap, replaced by linking out / unverified disclosure when re-introduced.
- `app/card/` (empty stale directory).
- 7 redundant root markdown files: `BUILD_STATUS.md`, `DEMO.md`, `QUICK_START.md`, `RUNNING_CHECKLIST.md`, `START_SERVER.md`, `FEATURES.md`, `IMPROVEMENTS.md`. Documentation consolidated into `README.md` + `ROADMAP.md` + `CHANGELOG.md` + `SETUP_AUTH.md`.

### Security
- API writes can no longer be performed by anonymous callers. RLS enforces owner-check at the DB level.
- Reserved handles list prevents impersonation of `admin`, brand names, system paths.
- `lib/supabase/admin.ts` (service-role) is now explicit, opt-in, and unused in app code — formerly the default for all write paths.

### Known follow-ups (not in this changeset)
- `/login`, `/settings`, `/import` visual polish still pending.
- `ExploreClient` server-side sort by `visited_countries.length` is client-side (won't scale; needs a generated column).
- Rate limit is still in-memory — won't survive serverless (tracked as ROADMAP N5b).
- Handle reservation cooldown / rename mechanic not yet implemented (ROADMAP N3 partial).
- Stripe-verified revenue (Creator Profile relaunch) — explicitly deferred per ROADMAP; trustmrr.com owns this segment for now.

---

## Earlier (pre-2026-05)

Original codebase optimization pass — type safety, Zod validation, custom error classes, env validation. Recorded historically; see git log for granularity. Several items below have since been superseded:

- ✅ Removed `any` types, added TypeScript types across API routes
- ✅ Zod validation schemas (`lib/validation.ts`) — *userId fields since removed; user identity derived from session*
- ✅ Custom error classes (`lib/errors.ts`) — *still in use, `UnauthorizedError` now actively thrown by `requireUser()`*
- ✅ Env variable validation (`lib/env.ts`)
- ✅ Shared utilities (`lib/utils.ts`): `formatCurrency`, `formatNumber`, `sanitizeString`, `isValidUrl`
- ✅ Cache headers on profile API
- ✅ Structured error responses
