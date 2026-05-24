import Link from 'next/link'
import { WorldMap } from '@/components/WorldMap'
import { LiveCityRow } from '@/components/LiveCityRow'
import { MarqueeBand } from '@/components/MarqueeBand'
import { Logo } from '@/components/Logo'

const previewVisited = ['TH', 'JP', 'PT', 'VN', 'MY', 'ID', 'MX', 'ES', 'GE', 'RS']

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/map"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
            >
              Map
            </Link>
            <Link
              href="/explore"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
            >
              Explore
            </Link>
            <Link
              href="/pricing"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
            >
              Sign in
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
            >
              Get your card
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Warm sunset wash behind the hero — very subtle so the page stays calm */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              'radial-gradient(60% 50% at 80% 0%, rgba(255, 204, 153, 0.45) 0%, transparent 60%), radial-gradient(50% 50% at 10% 30%, rgba(220, 230, 255, 0.6) 0%, transparent 65%)',
          }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 lg:pt-32 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left: copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                The bio link for nomads
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[88px] font-semibold tracking-tighter leading-[0.95] mb-8">
                Where you are.
                <br />
                Where you&apos;ve been.
                <br />
                <span className="text-gray-300">What you&apos;re building.</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-lg leading-relaxed">
                One link for your whole nomad life. Live local time, every country
                you&apos;ve set foot in, what you&apos;re working on. At{' '}
                <span className="font-mono text-gray-800">nomad.now/yourhandle</span>.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <Link
                  href="/pricing"
                  className="group inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-4 rounded-full font-medium text-base hover:bg-gray-800 transition shadow-lg shadow-gray-900/10"
                >
                  Get your card
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <div className="text-sm text-gray-500">
                  From $2.80 / month
                  <br />
                  1 minute to set up
                </div>
              </div>
            </div>

            {/* Right: stacked card preview */}
            <div className="lg:col-span-5 relative h-[520px] sm:h-[560px]">
              {/* Back card — visual depth */}
              <div
                aria-hidden
                className="absolute top-8 -right-4 sm:right-2 w-[88%] bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-900/5 opacity-70"
                style={{ transform: 'rotate(4deg)', height: '440px' }}
              />
              {/* Front card */}
              <div
                className="absolute top-0 left-0 right-0 sm:right-8 bg-white rounded-3xl border border-gray-200 shadow-2xl shadow-gray-900/10 p-6"
                style={{ transform: 'rotate(-2deg)' }}
              >
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center text-xl font-semibold text-gray-700 border-2 border-gray-100">
                    K
                  </div>
                </div>
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold tracking-tight">Kenji Tanaka</h2>
                  <p className="text-xs text-gray-600">Product Designer</p>
                </div>
                <p className="text-center text-xs mb-3">
                  <span className="inline-flex items-center gap-1">
                    📍 <span className="font-medium">Bangkok</span>
                    <span className="text-gray-400 font-mono tabular-nums">· 14:35</span>
                  </span>
                </p>
                <div className="flex items-center justify-center gap-5 py-2 my-2 border-y border-gray-100">
                  <div className="text-center">
                    <div className="text-base font-semibold tabular-nums">10</div>
                    <div className="text-[9px] uppercase tracking-wider text-gray-500">countries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-semibold">Mar 2024</div>
                    <div className="text-[9px] uppercase tracking-wider text-gray-500">since</div>
                  </div>
                </div>
                <div className="my-2">
                  <WorldMap visitedCodes={previewVisited} />
                </div>
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-medium border border-green-100">
                    ✓ Verified
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[10px] font-medium">
                    Open
                  </span>
                </div>
                <div className="space-y-1.5">
                  {['Instagram', 'Portfolio', 'LinkedIn'].map((label) => (
                    <div key={label} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs font-medium text-gray-900">{label}</span>
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  ))}
                </div>
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
              Live, right now
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05]">
              Time on your card moves with you.
            </h2>
          </div>
          <p className="text-sm text-gray-500 max-w-xs">
            These are real times in those cities. They&apos;ll tick every minute on someone&apos;s actual card.
          </p>
        </div>
        <LiveCityRow />
      </section>

      {/* EDITORIAL FEATURES (alternating) */}
      <section className="bg-gray-50/40 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 space-y-24 sm:space-y-32">
          <FeatureRow
            label="Travel"
            title="The map that grows with you."
            body="Not a row of flag emojis. A real constellation — visible at a glance, sharable as an image, and yours forever as you keep moving."
            visual={
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <WorldMap visitedCodes={previewVisited} />
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>10 of 195 countries</span>
                  <span className="font-mono">3 continents</span>
                </div>
              </div>
            }
          />

          <FeatureRow
            label="Time"
            title="Wherever you are, your clock follows."
            body="Your local time refreshes every minute on your card. Collaborators on the other side of the world stop wondering when you&apos;re reachable."
            reverse
            visual={
              <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-sm text-center">
                <div className="text-sm text-gray-500 mb-2">📍 Lisbon, Portugal</div>
                <div className="text-7xl font-semibold font-mono tabular-nums tracking-tight text-gray-900">
                  07:42
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-3">
                  Currently in
                </div>
              </div>
            }
          />

          <FeatureRow
            label="Status"
            title="Tell people what you&apos;re open to."
            body="Three taps to swap between open to collaboration, freelancing, full-time, or just resting. Visible above the fold, never out of date."
            visual={
              <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-sm flex flex-col items-center gap-3">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100">
                  ✓ Verified
                </span>
                <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  Open to collaboration
                </span>
                <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  Freelancing
                </span>
                <span className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-100">
                  Slow travel mode
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
            Why not just Linktree?
          </h2>
          <p className="text-gray-600 text-center mb-10">
            Because you don&apos;t live in one place.
          </p>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 px-4 sm:px-6 py-3 border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-500">
              <div></div>
              <div className="text-center">Linktree</div>
              <div className="text-center">Nomad.now</div>
            </div>
            {[
              ['Travel map', false, true],
              ['Live local time', false, true],
              ['Country tracker', false, true],
              ['No ads, no transaction fees', false, true],
              ['Custom domain', true, 'soon'],
              ['Unlimited links', true, true],
            ].map(([label, a, b], i) => (
              <div
                key={label as string}
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
            Linktree raised prices 67% in late 2025. We won&apos;t.
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
            One link.
            <br />
            <span className="text-gray-500">Wherever you are.</span>
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-md mx-auto">
            Set it up in a minute. Carry it forever.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-white text-gray-900 px-7 py-4 rounded-full font-medium text-base hover:bg-gray-100 transition shadow-xl shadow-black/40"
          >
            Get your card
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <div className="mt-6 text-sm text-gray-500">
            From $2.80 / month · Cancel any time
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
              The bio link for people who don&apos;t live in one place.
            </p>
          </div>
          <div className="flex sm:justify-end items-center gap-6 text-sm text-gray-500">
            <Link href="/map" className="hover:text-gray-900 transition">Map</Link>
            <Link href="/explore" className="hover:text-gray-900 transition">Explore</Link>
            <Link href="/pricing" className="hover:text-gray-900 transition">Pricing</Link>
            <Link href="/login" className="hover:text-gray-900 transition">Sign in</Link>
          </div>
        </div>
        <div className="border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
            <span>© 2026 Nomad.now</span>
            <span>Made for nomads, by people who keep moving.</span>
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
