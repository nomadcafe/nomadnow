import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { WorldMap } from '@/components/WorldMap'
import { LiveCityRow } from '@/components/LiveCityRow'
import { LiveTimezoneCard } from '@/components/LiveTimezoneCard'
import { MarqueeBand } from '@/components/MarqueeBand'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { AccountMenu } from '@/components/AccountMenu'
import { GetYourCardButton } from '@/components/GetYourCardButton'
import { NomadCard } from '@/components/NomadCard'
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
  current_city: 'Bangkok',
  timezone: 'Asia/Bangkok',
  work_status: 'freelancing',
  visited_countries: previewVisited,
  profile_type: 'nomad',
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
  {
    id: 'h-l3',
    user_id: HERO_USER.id,
    type: 'linkedin',
    url: 'https://linkedin.com/in/kenji',
    order_index: 2,
    created_at: '',
    updated_at: '',
  },
]
// Keep the hero card compact — bio / stays / status would push the card
// past the viewport on smaller screens and bury the hero CTA. The
// included sections cover the strongest value props (identity, real
// time, country count, map, links).
const HERO_SECTIONS = ['avatar', 'name', 'location', 'stats', 'map', 'links']

export default async function Home() {
  const t = await getTranslations('home')
  const tNav = await getTranslations('nav')
  const tFooter = await getTranslations('footer')
  const tStatus = await getTranslations('card.workStatus')

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
            <AccountMenu className="hidden sm:inline-flex" />
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <GetYourCardButton className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition" />
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              'radial-gradient(60% 50% at 80% 0%, rgba(255, 204, 153, 0.45) 0%, transparent 60%), radial-gradient(50% 50% at 10% 30%, rgba(220, 230, 255, 0.6) 0%, transparent 65%)',
          }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 lg:pt-32 pb-20 sm:pb-28">
          {/* items-start so the left column anchors to the top of the hero
              instead of vertically centering against the taller right
              column (the real NomadCard preview is ~650px). The left
              column carries its own bottom content (theme swatches) so
              the visual weight stays balanced even without center-align. */}
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-start">
            {/* Left: copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {t('eyebrow')}
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[88px] font-semibold tracking-tighter leading-[0.95] mb-8">
                {t('heroLine1')}
                <br />
                {t('heroLine2')}
                <br />
                <span className="text-gray-300">{t('heroLine3')}</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-lg leading-relaxed">
                {t.rich('heroSub', {
                  // Tag form lets translators put the URL placeholder
                  // anywhere in the sentence — Japanese / Chinese flow
                  // around it differently than English, and the old
                  // heroSub1+URL+heroSub2 split forced a fixed order.
                  handle: (chunks) => (
                    <span className="font-mono text-gray-800">{chunks}</span>
                  ),
                })}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <GetYourCardButton
                  showArrow
                  className="group inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-4 rounded-full font-medium text-base hover:bg-gray-800 transition shadow-lg shadow-gray-900/10"
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
                <NomadCard
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

          <FeatureRow
            label={t('feature3.label')}
            title={t('feature3.title')}
            body={t('feature3.body')}
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
              <div className="text-center">Nomad.now</div>
            </div>
            {([
              [t('comparison.row1'), false, true],
              [t('comparison.row2'), false, true],
              [t('comparison.row3'), false, true],
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
            <span className="text-gray-500">{t('darkCta.line2')}</span>
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-md mx-auto">
            {t('darkCta.body')}
          </p>
          <GetYourCardButton
            showArrow
            className="inline-flex items-center gap-2 bg-white text-gray-900 px-7 py-4 rounded-full font-medium text-base hover:bg-gray-100 transition shadow-xl shadow-black/40"
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
          <div className="flex sm:justify-end items-center gap-6 text-sm text-gray-500 flex-wrap">
            <Link href="/pricing" className="hover:text-gray-900 transition">{tNav('pricing')}</Link>
            <Link href="/login" className="hover:text-gray-900 transition">{tNav('signin')}</Link>
            <LanguageSwitcher />
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
}: {
  label: string
  title: string
  body: string
  visual: React.ReactNode
  reverse?: boolean
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${reverse ? 'lg:[&>div:first-child]:order-2' : ''}`}>
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
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
