import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { WorldMap } from '@/components/WorldMap'
import { LiveCityRow } from '@/components/LiveCityRow'
import { LiveTimezoneCard } from '@/components/LiveTimezoneCard'
import { MarqueeBand } from '@/components/MarqueeBand'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { AccountMenu } from '@/components/AccountMenu'
import { getAccountInitial } from '@/lib/account'
import { GetYourCardButton } from '@/components/GetYourCardButton'
import { NomadCardServer } from '@/components/NomadCardServer'
import { THEMES, THEME_KEYS } from '@/lib/themes'
import type { User, NomadLink } from '@/types/database'

const previewVisited = ['TH', 'JP', 'PT', 'VN', 'MY', 'ID', 'MX', 'ES', 'GE', 'RS']

// Sample user the hero card preview uses. Same shape as a real DB row so
// the hero renders the REAL NomadCard component (not a hand-drawn
// approximation). Means every card-level visual upgrade ships on the
// homepage automatically.
const HERO_USER: User = {
  id: 'hero-preview',
  handle: 'kenji',
  display_name: 'Kenji Tanaka',
  avatar_url: 'https://i.pravatar.cc/240?img=12',
  role: 'Product Designer',
  // The "now" headline + a fresh presence stamp — these render the real
  // now-layer affordances on the hero card automatically (the one-line
  // status under the name, and the "Updated today" freshness note under the
  // location). The hero uses the real NomadCardServer, so the homepage now
  // demonstrates the feature instead of omitting it.
  now_text: 'Shipping a design system from a café in Bangkok',
  presence_confirmed_at: new Date().toISOString(),
  current_city: 'Bangkok',
  country: 'TH', // drives the 🇹🇭 flag on the location row (else it falls back to 📍)
  timezone: 'Asia/Bangkok',
  work_status: 'freelancing',
  visited_countries: previewVisited,
  // Anchors a real "time on the road" stat so the hero strip leads with
  // "~3 yrs" instead of a bare "0 days" (the strip hides any zero stat).
  // Static month so the demo card doesn't drift across renders.
  nomad_since: '2021-09-01',
  profile_type: 'nomad',
  // Demo both CTAs on the home hero so visitors see the dual conversion
  // shape (primary hire + secondary local meetup) at a glance.
  hire_cta_label: 'Hire me',
  hire_cta_url: 'mailto:kenji@example.com',
  meetup_cta_label: 'Grab a coffee in Bangkok',
  meetup_cta_url: 'https://cal.com/kenji/coffee',
  created_at: '2024-03-15T00:00:00.000Z',
  updated_at: new Date().toISOString(),
}
const HERO_LINKS: NomadLink[] = [
  {
    id: 'h-l1',
    user_id: HERO_USER.id,
    type: 'instagram',
    url: 'https://instagram.com/kenji',
    order_index: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'h-l2',
    user_id: HERO_USER.id,
    type: 'website',
    label: 'Portfolio',
    url: 'https://kenji.dev',
    order_index: 1,
    created_at: '',
    updated_at: '',
  },
]
// feature4's "Land work while you travel" visual must NOT restate the hero's
// full Kenji card — same person + same hire/meetup buttons twice reads as a
// duplicate. enabledSections can't trim a card down to just the CTAs:
// reconcileEnabledSections re-adds every missing section (so a stale DB row
// never hides a newly-shipped feature), which means a stored subset is treated
// as "all on". So we trim through DATA instead — each section renderer returns
// null when its field is empty. A user with only an avatar + name + the two
// CTAs therefore renders exactly "buttons right under your name" (feature4.body)
// and nothing else. Different identity + no city so it doesn't twin the hero,
// and no work_status so it doesn't restate feature3's status chip either.
const FEATURE4_USER: User = {
  ...HERO_USER,
  id: 'feature4-preview',
  handle: 'sofia',
  display_name: 'Sofia Reyes',
  avatar_url: 'https://i.pravatar.cc/240?img=47',
  role: 'Brand Designer',
  current_city: '', // → location section renders null
  work_status: '', // → status section renders null
  visited_countries: [], // → map section renders null
  hire_cta_label: 'Hire me',
  hire_cta_url: 'mailto:sofia@example.com',
  meetup_cta_label: 'Grab a coffee',
  meetup_cta_url: 'https://cal.com/sofia/coffee',
}
// Hero card layout — kept compact (stays under 700px to keep the CTA
// above the fold on shorter viewports) but now surfaces the dual
// conversion buttons that drive the freelancer wedge. Order matters:
// identity → location → CTAs (the conversion path the page is pitching)
// → map (visual hook) → links. Bio, stays, status, and the stat strip
// stay off the hero; they each get their own editorial Feature row.
const HERO_SECTIONS = ['avatar', 'name', 'location', 'hire', 'meetup', 'map', 'links']

// The "now layer" feature row renders the REAL card (same real-component
// policy as the hero) trimmed via section data to just the three now-layer
// signals: the now_text headline (name), the "Updated today" freshness note
// (location), and the ☕️ open-to-coffee chip (status). A distinct identity +
// city + no CTAs so it doesn't twin the hero or restate feature4. A recent
// presence_confirmed_at makes the freshness note read "today"; work_status is
// blank so the status section shows only the coffee chip, not a status pill.
const NOW_USER: User = {
  ...HERO_USER,
  id: 'now-feature-preview',
  handle: 'mara',
  display_name: 'Mara Okafor',
  avatar_url: 'https://i.pravatar.cc/240?img=32',
  role: 'Writer',
  now_text: 'Finishing a travel essay, slow mornings in Lisbon',
  current_city: 'Lisbon',
  country: 'PT',
  timezone: 'Europe/Lisbon',
  work_status: '', // → status section shows only the coffee chip
  open_to_coffee: true,
  presence_confirmed_at: new Date().toISOString(),
  hire_cta_label: null,
  hire_cta_url: null,
  meetup_cta_label: null,
  meetup_cta_url: null,
  visited_countries: [],
}
const NOW_SECTIONS = ['name', 'location', 'status']

export default async function Home() {
  // Account state resolved server-side so the nav's @handle paints in the
  // initial HTML instead of popping in after the client AccountMenu finishes
  // two sequential Supabase calls.
  const [t, tNav, tFooter, tStatus, accountInitial] = await Promise.all([
    getTranslations('home'),
    getTranslations('nav'),
    getTranslations('footer'),
    getTranslations('card.workStatus'),
    getAccountInitial(),
  ])

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Pricing visible everywhere now — it used to be hidden on
                mobile which left phone visitors with no way to compare
                plans from the landing page. AccountMenu and
                LanguageSwitcher remain desktop-only (LanguageSwitcher is
                duplicated in the footer for mobile reach; AccountMenu's
                only purpose is sign-in/out which sign-in does on its
                own page). */}
            <Link
              href="/pricing"
              className="text-sm text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 transition"
            >
              {tNav('pricing')}
            </Link>
            <AccountMenu className="hidden sm:inline-flex" initial={accountInitial} />
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <GetYourCardButton className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition" />
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Soft colour mesh + slow-drifting blobs. Kept low-opacity and behind
            a -z-10 layer so the headline stays high-contrast and readable —
            the brightness comes from the blobs, not a saturated wash. The
            blob hues (violet → fuchsia → peach) are the same brand gradient
            used on the headline highlight word and the primary CTA, so the
            whole hero reads as one palette. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(55% 50% at 82% -5%, rgba(255, 196, 150, 0.5) 0%, transparent 60%), radial-gradient(50% 55% at 8% 20%, rgba(196, 181, 253, 0.5) 0%, transparent 62%), radial-gradient(45% 45% at 55% 8%, rgba(244, 170, 230, 0.32) 0%, transparent 60%)',
          }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div className="animate-blob absolute -top-16 right-[12%] h-72 w-72 rounded-full bg-gradient-to-br from-violet-400/40 to-fuchsia-300/30 blur-3xl" />
          <div
            className="animate-blob absolute top-24 -left-10 h-80 w-80 rounded-full bg-gradient-to-br from-orange-300/35 to-pink-300/30 blur-3xl"
            style={{ animationDelay: '-6s' }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 lg:pt-20 pb-20 sm:pb-28">
          {/* items-start so the left column anchors to the top of the hero
              instead of vertically centering against the taller right
              column (the real NomadCard preview is ~650px). The left
              column carries its own bottom content (theme swatches) so
              the visual weight stays balanced even without center-align. */}
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-start">
            {/* Left: copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-8 rounded-full px-3 py-1 bg-gradient-to-r from-violet-50 to-fuchsia-50 ring-1 ring-violet-100">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                {t('eyebrow')}
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[88px] font-semibold tracking-tighter leading-[0.95] mb-8">
                {t('heroLine1')}
                <br />
                {t('heroLine2')}
                <br />
                {/* Brand gradient highlight — the one warm-to-cool sweep reused
                    on the eyebrow pill, primary CTA and dark-CTA button so the
                    page reads as a single palette. pb-1 stops descenders (y, g)
                    from clipping under bg-clip-text. */}
                <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent inline-block pb-1">
                  {t('heroLine3')}
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-lg leading-relaxed">
                {t.rich('heroSub', {
                  // Tag form lets translators put the URL placeholder
                  // anywhere in the sentence — Japanese / Chinese flow
                  // around it differently than English, and the old
                  // heroSub1+URL+heroSub2 split forced a fixed order.
                  handle: (chunks) => (
                    <span className="font-mono font-medium text-fuchsia-600">{chunks}</span>
                  ),
                })}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <GetYourCardButton
                  showArrow
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)] px-7 py-4 rounded-full font-medium text-base shadow-lg shadow-fuchsia-500/30 hover:shadow-xl hover:shadow-fuchsia-500/40 hover:brightness-105 transition"
                />
                <div className="text-sm text-gray-500">
                  {t('heroPriceNote')}
                  <br />
                  {t('heroSetupNote')}
                </div>
              </div>

              {/* Theme swatches — fills the left column's lower half (the
                  real-card preview on the right is naturally tall) and
                  hints at the customization story without competing with
                  the Feature sections further down. Each circle uses the
                  theme's page bg + accent color, so swapping the THEMES
                  table reshapes this row automatically. */}
              <div className="mt-14 lg:mt-20">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                  {t('themeStrip')}
                </div>
                <div className="flex items-center gap-2.5">
                  {THEME_KEYS.map((key) => {
                    const theme = THEMES[key]
                    return (
                      <div
                        key={key}
                        className={`w-10 h-10 rounded-full ${theme.page} ring-1 ring-gray-200 flex items-center justify-center transition hover:scale-110`}
                        aria-label={`${theme.label} theme`}
                        title={theme.label}
                      >
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{
                            background: `linear-gradient(135deg, ${theme.accentHex}, ${theme.accentHex}aa)`,
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right: real NomadCard preview. Renders the actual public
                component (not a hand-drawn approximation) so every visual
                upgrade on /[handle] ships on the homepage automatically.
                The angled back card stays as a static div for visual
                depth — it's just shadow, no content. */}
            <div className="lg:col-span-5 relative">
              <div
                aria-hidden
                className="absolute top-10 -right-4 sm:right-2 w-[88%] h-[420px] bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-900/5 opacity-70"
                style={{ transform: 'rotate(4deg)' }}
              />
              <div
                className="relative bg-white rounded-3xl border border-gray-200 shadow-2xl shadow-gray-900/10 overflow-hidden mx-auto max-w-md sm:mr-8 lg:mr-0"
                style={{ transform: 'rotate(-2deg)' }}
              >
                <NomadCardServer
                  user={HERO_USER}
                  links={HERO_LINKS}
                  themeKey="classic"
                  enabledSections={HERO_SECTIONS}
                  sectionOrder={HERO_SECTIONS}
                  embedded
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <MarqueeBand />

      {/* LIVE NOW row */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="flex items-end justify-between mb-8 sm:mb-10 flex-wrap gap-4">
          <div className="max-w-xl">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              {t('live.eyebrow')}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05]">
              {t('live.title')}
            </h2>
          </div>
          <p className="text-sm text-gray-500 max-w-xs">
            {t('live.description')}
          </p>
        </div>
        <LiveCityRow />
      </section>

      {/* EDITORIAL FEATURES (alternating) */}
      <section className="bg-gray-50/40 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 space-y-24 sm:space-y-32">
          <FeatureRow
            label={t('feature1.label')}
            title={t('feature1.title')}
            body={t('feature1.body')}
            accent="text-violet-600"
            visual={
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <WorldMap visitedCodes={previewVisited} />
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>{t('feature1.stat1')}</span>
                  <span className="font-mono">{t('feature1.stat2')}</span>
                </div>
              </div>
            }
          />

          <FeatureRow
            label={t('feature2.label')}
            title={t('feature2.title')}
            body={t('feature2.body')}
            accent="text-fuchsia-600"
            reverse
            visual={
              /* Ticks every minute — the whole feature row is about live
                 local time, and a static "07:42" undermined the pitch. */
              <LiveTimezoneCard
                city="Lisbon, Portugal"
                timezone="Europe/Lisbon"
                caption={t('feature2.currentlyIn')}
              />
            }
          />

          {/* The now layer — the "now" in nomad.now made real. Sits in the
              "live" cluster (right after live-local-time) and uses the real
              card so the now_text headline + "Updated today" freshness +
              coffee chip all ship here automatically. */}
          <FeatureRow
            label={t('feature5.label')}
            title={t('feature5.title')}
            body={t('feature5.body')}
            accent="text-pink-600"
            visual={
              <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-10 shadow-sm">
                <NomadCardServer
                  user={NOW_USER}
                  links={[]}
                  themeKey="classic"
                  enabledSections={NOW_SECTIONS}
                  sectionOrder={NOW_SECTIONS}
                  embedded
                />
                <p className="mt-4 text-xs text-gray-500 text-center">
                  {t('feature5.caption')}
                </p>
              </div>
            }
          />

          <FeatureRow
            label={t('feature3.label')}
            title={t('feature3.title')}
            body={t('feature3.body')}
            accent="text-rose-600"
            reverse
            visual={
              <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-sm flex flex-col items-center gap-3">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100">
                  ✓ {t('previewCard.verified')}
                </span>
                <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {tStatus('freelancing')}
                </span>
                <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {tStatus('fulltime')}
                </span>
                <span className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-100">
                  {t('feature3.slowTravel')}
                </span>
              </div>
            }
          />

          {/* Feature 4 — the freelancer wedge. Most product investment
              recently (hire_cta / meetup_cta / open_to_coffee / blurbs /
              featured works) is aimed at "nomad freelancer → land
              client". Without this row, the landing told a generic
              travel story while the product was tilting toward
              conversion. Visual uses the real NomadCardServer (same
              real-component policy as the hero card preview, so button
              upgrades ship here automatically) but a focused FEATURE4_USER
              whose empty fields null out every section except avatar + name
              + the two CTAs — so it shows "buttons under your name" without
              re-rendering the hero's full card. */}
          <FeatureRow
            label={t('feature4.label')}
            title={t('feature4.title')}
            body={t('feature4.body')}
            accent="text-orange-600"
            visual={
              <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-10 shadow-sm">
                <NomadCardServer
                  user={FEATURE4_USER}
                  links={[]}
                  themeKey="classic"
                  embedded
                />
                <p className="mt-4 text-xs text-gray-500 text-center">
                  {t('feature4.caption')}
                </p>
              </div>
            }
          />
        </div>
      </section>

      {/* Comparison */}
      <section>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2 text-center">
            {t('comparison.title')}
          </h2>
          <p className="text-gray-600 text-center mb-10">
            {t('comparison.subtitle')}
          </p>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 px-4 sm:px-6 py-3 border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-500">
              <div></div>
              <div className="text-center">Linktree</div>
              {/* Our column wins every row, so it gets weight + a single brand
                  hue to set it apart from the gray Linktree column. Kept as a
                  solid colour rather than the full gradient sweep, which is
                  reserved for the page's real focal points (headline highlight
                  + the two CTAs) so they don't have to compete with a table
                  header for attention. */}
              <div className="text-center font-semibold text-fuchsia-600">
                Nomad.now
              </div>
            </div>
            {([
              [t('comparison.row1'), false, true],
              [t('comparison.row2'), false, true],
              [t('comparison.row3'), false, true],
              // Hire CTA differentiator — Linktree has generic "buttons" but
              // not the role-specific "Hire me" + "Grab a coffee" pair that
              // turns a profile into a freelancer conversion path. Added so
              // the comparison reflects the freelancer wedge the product is
              // actually betting on, not just the travel-map novelty.
              [t('comparison.row7'), false, true],
              // Handle availability — Linktree's namespace is saturated, so
              // newcomers can't get the handle that matches their brand.
              // A fresh namespace is a real, emotionally-resonant win, so it
              // sits in the winning cluster rather than after the weak rows.
              [t('comparison.row8'), false, true],
              [t('comparison.row4'), false, true],
              [t('comparison.row5'), true, 'soon'],
              [t('comparison.row6'), true, true],
            ] as [string, boolean | 'soon', boolean | 'soon'][]).map(([label, a, b], i) => (
              <div
                key={label}
                className={`grid grid-cols-3 px-4 sm:px-6 py-3.5 items-center text-sm ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
              >
                <div className="font-medium text-gray-900">{label}</div>
                <div className="text-center text-gray-500">
                  {a === true ? <Check /> : a === 'soon' ? <span className="text-xs">soon</span> : <Dash />}
                </div>
                <div className="text-center">
                  {b === true ? <Check accent /> : b === 'soon' ? <span className="text-xs text-gray-500">soon</span> : <Dash />}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            {t('comparison.footnote')}
          </p>
        </div>
      </section>

      {/* DARK CTA */}
      <section className="relative bg-gray-950 text-white overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(50% 50% at 30% 50%, rgba(255, 175, 110, 0.25) 0%, transparent 60%), radial-gradient(40% 50% at 80% 60%, rgba(130, 160, 255, 0.2) 0%, transparent 60%)',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tighter leading-[1.05] mb-6">
            {t('darkCta.line1')}
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-300 bg-clip-text text-transparent inline-block pb-1">
              {t('darkCta.line2')}
            </span>
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-md mx-auto">
            {t('darkCta.body')}
          </p>
          <GetYourCardButton
            showArrow
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-500 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)] px-7 py-4 rounded-full font-medium text-base hover:brightness-110 transition shadow-xl shadow-fuchsia-500/30"
          />
          <div className="mt-6 text-sm text-gray-500">
            {t('darkCta.note')}
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-2 gap-6 items-center">
          <div>
            <div className="mb-2">
              <Logo asLink={false} size="md" />
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              {tFooter('tagline')}
            </p>
          </div>
          {/* Pricing + Sign in used to live here too — both already appear
              in the top nav (Pricing on every breakpoint, Sign in via
              AccountMenu on desktop and the GetYourCard flow on mobile),
              so they were noise. LanguageSwitcher is kept but mobile-only
              since the top nav hides it on small screens. */}
          <div className="flex sm:justify-end items-center gap-6 text-sm text-gray-500 flex-wrap">
            <Link href="/privacy" className="hover:text-gray-900 transition">{tNav('privacy')}</Link>
            <Link href="/terms" className="hover:text-gray-900 transition">{tNav('terms')}</Link>
            <LanguageSwitcher className="sm:hidden" />
          </div>
        </div>
        <div className="border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
            <span>{tFooter('copyright')}</span>
            <span>{tFooter('credit')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureRow({
  label,
  title,
  body,
  visual,
  reverse = false,
  accent = 'text-gray-500',
}: {
  label: string
  title: string
  body: string
  visual: React.ReactNode
  reverse?: boolean
  // Per-row label colour. Each feature gets its own hue, but all four are
  // sampled off the brand arc (violet → fuchsia → rose → orange) so the
  // section reads as a lively set without introducing colours that aren't in
  // the headline/CTA gradient. Passed by the caller so the palette stays
  // visible — and editable as one sequence — at the call site.
  accent?: string
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${reverse ? 'lg:[&>div:first-child]:order-2' : ''}`}>
      <div>
        <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${accent}`}>
          {label}
        </div>
        <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1] mb-5 max-w-md">
          {title}
        </h3>
        <p className="text-lg text-gray-600 leading-relaxed max-w-md">{body}</p>
      </div>
      <div>{visual}</div>
    </div>
  )
}

function Check({ accent = false }: { accent?: boolean }) {
  return (
    <svg
      className={`w-5 h-5 inline-block ${accent ? 'text-green-600' : 'text-gray-400'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-label="yes"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function Dash() {
  return <span className="text-gray-300" aria-label="no">—</span>
}
