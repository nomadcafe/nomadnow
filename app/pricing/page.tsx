import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata = {
  title: 'Pricing — Nomad.now',
  description:
    'Straightforward pricing for your nomad card. Two plans, no free tier, no ads, no transaction fees.',
}

type Feature = {
  label: string
  basic: boolean | string
  pro: boolean | string
  // When true, the feature is on the roadmap rather than shipped. Renders a
  // "Soon" pill so we don't oversell what's not live yet.
  soon?: boolean
}

const FEATURE_ROWS: { section: string; items: Feature[] }[] = [
  {
    section: 'Your card',
    items: [
      { label: 'Handle on nomad.now (premium .now domain)', basic: true, pro: true },
      { label: 'Visited countries world map', basic: true, pro: true },
      { label: 'Current city + live timezone', basic: true, pro: true },
      { label: 'Auto-generated share image (OG)', basic: true, pro: true },
      { label: 'Built-in themes', basic: '4 presets', pro: '4 presets + custom' },
      { label: 'Brand-icon links (10 platforms)', basic: '1 link', pro: 'Unlimited' },
      { label: 'Verified badge', basic: false, pro: true },
      { label: '"Made on nomad.now" footer', basic: 'Optional', pro: 'Optional' },
    ],
  },
  {
    section: 'Distribution',
    items: [
      { label: 'Listed on /map and /in/{country}', basic: true, pro: 'Featured placement', soon: false },
      { label: 'Embed widget on your site', basic: 'With branding', pro: 'No branding', soon: true },
      { label: 'Custom domain (yourdomain.com)', basic: false, pro: true, soon: true },
    ],
  },
  {
    section: 'Insights',
    items: [
      { label: 'Page views + link clicks', basic: true, pro: true },
      { label: 'Visitor geography + referrers', basic: false, pro: true, soon: true },
      { label: 'Click-through funnel', basic: false, pro: true, soon: true },
    ],
  },
  {
    section: 'Automation',
    items: [
      { label: 'Multiple draft cards', basic: false, pro: true, soon: true },
      { label: 'Auto-sync current city (Strava / Wise)', basic: false, pro: true, soon: true },
    ],
  },
  {
    section: 'Support',
    items: [
      { label: 'Email support', basic: 'Standard', pro: 'Priority' },
    ],
  },
]

function Check({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function Dash({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" d="M5 12h14" />
    </svg>
  )
}

function SoonPill() {
  return (
    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
      Soon
    </span>
  )
}

function CellValue({ value, soon, accent }: { value: boolean | string; soon?: boolean; accent?: boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center">
        <Check className={accent ? 'text-gray-900' : 'text-gray-700'} />
        {soon && <SoonPill />}
      </span>
    )
  }
  if (value === false) {
    return <Dash className="text-gray-300" />
  }
  return (
    <span className="inline-flex items-center text-sm text-gray-700">
      <span>{value}</span>
      {soon && <SoonPill />}
    </span>
  )
}

const BASIC_BULLETS = [
  'Your handle on nomad.now — a premium .now domain',
  'Public profile page',
  'Visited countries world map',
  'Current city + live timezone',
  '1 link (choose from 10 brand icons)',
  '4 built-in themes',
  'Basic analytics',
  'Auto-generated share image',
  'Optional "Made on nomad.now" footer',
]

const PRO_BULLETS: { label: string; soon?: boolean }[] = [
  { label: 'Everything in Basic' },
  { label: 'Custom domain', soon: true },
  { label: 'Unlimited links' },
  { label: 'Custom theme color + background' },
  { label: 'Verified badge' },
  { label: 'Featured on /map and /in/{country}' },
  { label: 'Visitor analytics (geo + referrers)', soon: true },
  { label: 'Multiple draft cards', soon: true },
  { label: 'Auto-sync city from Strava / Wise', soon: true },
  { label: 'Embed widget without branding', soon: true },
  { label: 'Priority email support' },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav — mirrors the homepage so the page doesn't feel like a different product. */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/map" className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition">
              Map
            </Link>
            <Link href="/explore" className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition">
              Explore
            </Link>
            <Link href="/login" className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition">
              Sign in
            </Link>
            <Link
              href="/create-card"
              className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
            >
              Get your card
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 0%, rgba(255, 204, 153, 0.35) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mb-4">
            Two plans. No ads. No fees.
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            We don&apos;t offer a free tier — it&apos;s how we keep the platform clean, ad-free, and built for nomads instead of advertisers.
          </p>
        </div>
      </header>

      {/* Pricing cards */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* Basic — featured. Most users start here in a paid-only model, so it
              gets the dark "look at me" treatment and the Most popular badge. */}
          <div className="relative rounded-2xl border-2 border-gray-900 bg-gray-900 text-white p-7 sm:p-8 flex flex-col shadow-xl shadow-gray-900/20">
            <span className="absolute -top-3 right-6 inline-flex items-center gap-1 bg-amber-300 text-gray-900 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full">
              Most popular
            </span>
            <div className="mb-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-2">Basic</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-semibold tracking-tight">$2.8</span>
                <span className="text-gray-400">/mo</span>
              </div>
              <p className="mt-2 text-sm text-gray-300">Get on the map. Everything you need for a public nomad card.</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {BASIC_BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[15px] text-gray-100">
                  <Check className="text-amber-300 mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/login?plan=basic"
              className="block text-center text-sm font-medium bg-white text-gray-900 hover:bg-gray-100 px-5 py-3 rounded-full transition"
            >
              Start with Basic
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-gray-200 bg-white p-7 sm:p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-2">Pro</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-semibold tracking-tight">$9.8</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">Own your nomad brand. Custom domain, unlimited links, advanced analytics.</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PRO_BULLETS.map(({ label, soon }) => (
                <li key={label} className="flex items-start gap-2.5 text-[15px] text-gray-800">
                  <Check className="text-gray-700 mt-0.5 shrink-0" />
                  <span>
                    {label}
                    {soon && <SoonPill />}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/login?plan=pro"
              className="block text-center text-sm font-medium border border-gray-300 hover:border-gray-900 px-5 py-3 rounded-full transition"
            >
              Go Pro
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-5">
          Prices in USD. Billed monthly. Cancel any time — your card stays live to the end of the current period.
        </p>
      </section>

      {/* Feature comparison table */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-8">
          Compare plans
        </h2>
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-sm font-medium text-gray-500 px-5 sm:px-6 py-4">Feature</th>
                <th className="text-center text-sm font-medium text-gray-500 px-3 py-4 w-28 sm:w-36">Basic</th>
                <th className="text-center text-sm font-medium text-gray-900 px-3 py-4 w-28 sm:w-36">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((section, sIdx) => (
                <React.Fragment key={section.section}>
                  <tr className="border-t border-gray-200">
                    <td colSpan={3} className="bg-gray-50/50 px-5 sm:px-6 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                      {section.section}
                    </td>
                  </tr>
                  {section.items.map((item, iIdx) => (
                    <tr
                      key={item.label}
                      className={iIdx === section.items.length - 1 && sIdx === FEATURE_ROWS.length - 1 ? '' : 'border-t border-gray-100'}
                    >
                      <td className="px-5 sm:px-6 py-3.5 text-[15px] text-gray-800">{item.label}</td>
                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-flex justify-center">
                          <CellValue value={item.basic} />
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-flex justify-center">
                          <CellValue value={item.pro} soon={item.soon} accent />
                        </span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-8">
          Common questions
        </h2>
        <div className="space-y-5">
          <Faq
            q="Why is there no free plan?"
            a="A free plan would force us to put ads or transaction fees somewhere — neither feels right for a profile you'd share to your network. $2.8 keeps the lights on without compromising the product."
          />
          <Faq
            q="Can I cancel any time?"
            a="Yes. Your card stays live until the end of the current billing period. After that the page returns a 'no longer available' notice — your handle is held for 30 days in case you change your mind."
          />
          <Faq
            q="What happens to my data if I cancel?"
            a="Export everything (profile, links, visited countries) as JSON from settings before cancelling. We keep your data for 90 days after cancellation in case you resubscribe."
          />
          <Faq
            q="Can I switch between Basic and Pro?"
            a="Upgrade anytime — billed prorated. Downgrade takes effect at the end of the current period."
          />
          <Faq
            q="Do you charge transaction fees?"
            a="No. We don't sell digital products on your behalf, so there's nothing to take a cut from. The card is your card."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            Claim your handle.
          </h2>
          <p className="text-gray-600 mb-8">
            nomad.now/<span className="font-mono">yourhandle</span> — pick one before someone else does.
          </p>
          <Link
            href="/login?plan=basic"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-4 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-900/10"
          >
            <span>Get started</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border border-gray-200 rounded-xl px-5 py-4 open:bg-gray-50/50 transition">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <span className="text-[15px] font-medium text-gray-900">{q}</span>
        <svg
          className="w-4 h-4 text-gray-500 group-open:rotate-180 transition shrink-0 ml-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{a}</p>
    </details>
  )
}
