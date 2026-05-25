import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { AccountMenu } from '@/components/AccountMenu'
import { PlanCheckoutButton } from '@/components/PlanCheckoutButton'
import { createServerSupabase } from '@/lib/supabase/server'
import { getBillingState } from '@/lib/billing'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return {
    title: t('pricingTitle'),
    description: t('pricingDescription'),
  }
}

// Cell shapes — `true` = check, `false` = dash, string = text label, 'soon' is
// derived from the soon flag (not the value) so a row can carry both a label
// and a Soon pill.
type Cell = boolean | string

type Feature = {
  // Key into the pricing.features namespace. Keys are stable; the actual
  // translated string is fetched at render time.
  key: string
  basic: Cell
  // When basic value is a string, this is the i18n key for that label.
  basicKey?: string
  pro: Cell
  proKey?: string
  // Marks the Pro feature as roadmap-only so a "Soon" pill renders.
  soon?: boolean
}

const FEATURE_ROWS: { sectionKey: string; items: Feature[] }[] = [
  {
    sectionKey: 'yourCard',
    items: [
      { key: 'publicProfile', basic: true, pro: true },
      { key: 'worldMap', basic: true, pro: true },
      { key: 'liveTimezone', basic: true, pro: true },
      { key: 'ogImage', basic: true, pro: true },
      { key: 'themes', basic: 'themesBasic', basicKey: 'themesBasic', pro: 'themesPro', proKey: 'themesPro' },
      { key: 'linksLabel', basic: true, pro: true },
      { key: 'verifiedBadge', basic: false, pro: true },
      { key: 'footerLabel', basic: 'footerOptional', basicKey: 'footerOptional', pro: 'footerOptional', proKey: 'footerOptional' },
    ],
  },
  {
    sectionKey: 'distribution',
    items: [
      { key: 'listingDefault', basic: true, pro: 'listingFeatured', proKey: 'listingFeatured' },
      { key: 'embed', basic: 'embedBasic', basicKey: 'embedBasic', pro: 'embedPro', proKey: 'embedPro', soon: true },
      { key: 'customDomain', basic: false, pro: true, soon: true },
    ],
  },
  {
    sectionKey: 'insights',
    items: [
      { key: 'viewsClicks', basic: true, pro: true },
      { key: 'visitorAnalytics', basic: false, pro: true, soon: true },
      { key: 'funnel', basic: false, pro: true, soon: true },
    ],
  },
  {
    sectionKey: 'automation',
    items: [
      { key: 'drafts', basic: false, pro: true, soon: true },
      { key: 'autoSync', basic: false, pro: true, soon: true },
    ],
  },
  {
    sectionKey: 'support',
    items: [
      { key: 'emailLabel', basic: 'emailBasic', basicKey: 'emailBasic', pro: 'emailPro', proKey: 'emailPro' },
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

function SoonPill({ label }: { label: string }) {
  return (
    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
      {label}
    </span>
  )
}

function CellValue({
  value,
  label,
  soon,
  soonLabel,
  accent,
}: {
  value: Cell
  label?: string
  soon?: boolean
  soonLabel: string
  accent?: boolean
}) {
  if (value === true) {
    return (
      <span className="inline-flex items-center">
        <Check className={accent ? 'text-gray-900' : 'text-gray-700'} />
        {soon && <SoonPill label={soonLabel} />}
      </span>
    )
  }
  if (value === false) {
    return <Dash className="text-gray-300" />
  }
  return (
    <span className="inline-flex items-center text-sm text-gray-700">
      <span>{label ?? value}</span>
      {soon && <SoonPill label={soonLabel} />}
    </span>
  )
}

const BASIC_BULLET_KEYS = [
  'premiumDomain',
  'publicProfile',
  'worldMap',
  'liveTimezone',
  'links',
  'themes',
  'analytics',
  'ogImage',
  'footer',
] as const

const PRO_BULLET_KEYS: { key: string; soon?: boolean }[] = [
  { key: 'everythingInBasic' },
  { key: 'customDomain', soon: true },
  { key: 'customTheme' },
  { key: 'verifiedBadge' },
  { key: 'featured' },
  { key: 'analytics', soon: true },
  { key: 'drafts', soon: true },
  { key: 'autoSync', soon: true },
  { key: 'embed', soon: true },
  { key: 'support' },
]

const FAQ_KEYS = ['noFree', 'cancel', 'data', 'switch', 'fees'] as const

export default async function PricingPage() {
  const t = await getTranslations('pricing')
  const tCommon = await getTranslations('common')
  const tNav = await getTranslations('nav')
  const soonLabel = tCommon('soon').toUpperCase()

  // Detect whether the viewer is already paying so we can dim the button on
  // their current plan and route the other plan's CTA into the Customer
  // Portal instead of creating a second Stripe subscription.
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const currentPlan = user ? (await getBillingState(user.id)).plan : null

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Map and Explore hidden until those pages feel populated. */}
            <AccountMenu className="hidden sm:inline-flex" />
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <Link
              href="/create-card"
              className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
            >
              {tNav('getCard')}
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
            {t('headline')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            {t('subhead')}
          </p>
        </div>
      </header>

      {/* Pricing cards */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* Basic — featured. */}
          <div className="relative rounded-2xl border-2 border-gray-900 bg-gray-900 text-white p-7 sm:p-8 flex flex-col shadow-xl shadow-gray-900/20">
            <span className="absolute -top-3 right-6 inline-flex items-center gap-1 bg-amber-300 text-gray-900 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full">
              {t('mostPopular')}
            </span>
            <div className="mb-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-2">{t('basic.label')}</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-semibold tracking-tight">$2.8</span>
                <span className="text-gray-400">{t('perMonth')}</span>
              </div>
              <p className="mt-2 text-sm text-gray-300">{t('basic.tagline')}</p>
            </div>
            <ul className="space-y-3 flex-1">
              {BASIC_BULLET_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-[15px] text-gray-100">
                  <Check className="text-amber-300 mt-0.5 shrink-0" />
                  <span>{t(`basicBullets.${key}`)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 mb-8 text-xs text-gray-400 italic">{t('comingMore')}</p>
            <PlanCheckoutButton
              plan="basic"
              currentPlan={currentPlan}
              className="w-full block text-center text-sm font-medium bg-white text-gray-900 hover:bg-gray-100 px-5 py-3 rounded-full transition"
            >
              {t('basic.cta')}
            </PlanCheckoutButton>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-gray-200 bg-white p-7 sm:p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-2">{t('pro.label')}</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-semibold tracking-tight">$9.8</span>
                <span className="text-gray-500">{t('perMonth')}</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{t('pro.tagline')}</p>
            </div>
            <ul className="space-y-3 flex-1">
              {PRO_BULLET_KEYS.map(({ key, soon }) => (
                <li key={key} className="flex items-start gap-2.5 text-[15px] text-gray-800">
                  <Check className="text-gray-700 mt-0.5 shrink-0" />
                  <span>
                    {t(`proBullets.${key}`)}
                    {soon && <SoonPill label={soonLabel} />}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 mb-8 text-xs text-gray-500 italic">{t('comingMore')}</p>
            <PlanCheckoutButton
              plan="pro"
              currentPlan={currentPlan}
              className="w-full block text-center text-sm font-medium border border-gray-300 hover:border-gray-900 px-5 py-3 rounded-full transition"
            >
              {t('pro.cta')}
            </PlanCheckoutButton>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-5">
          {t('footnote')}
        </p>
      </section>

      {/* Feature comparison table */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-8">
          {t('compareTitle')}
        </h2>
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-sm font-medium text-gray-500 px-5 sm:px-6 py-4">{t('compare.feature')}</th>
                <th className="text-center text-sm font-medium text-gray-500 px-3 py-4 w-28 sm:w-36">{t('compare.basic')}</th>
                <th className="text-center text-sm font-medium text-gray-900 px-3 py-4 w-28 sm:w-36">{t('compare.pro')}</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((section, sIdx) => (
                <React.Fragment key={section.sectionKey}>
                  <tr className="border-t border-gray-200">
                    <td colSpan={3} className="bg-gray-50/50 px-5 sm:px-6 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t(`sections.${section.sectionKey}`)}
                    </td>
                  </tr>
                  {section.items.map((item, iIdx) => (
                    <tr
                      key={item.key}
                      className={iIdx === section.items.length - 1 && sIdx === FEATURE_ROWS.length - 1 ? '' : 'border-t border-gray-100'}
                    >
                      <td className="px-5 sm:px-6 py-3.5 text-[15px] text-gray-800">{t(`features.${item.key}`)}</td>
                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-flex justify-center">
                          <CellValue
                            value={item.basic}
                            label={item.basicKey ? t(`features.${item.basicKey}`) : undefined}
                            soonLabel={soonLabel}
                          />
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-flex justify-center">
                          <CellValue
                            value={item.pro}
                            label={item.proKey ? t(`features.${item.proKey}`) : undefined}
                            soon={item.soon}
                            soonLabel={soonLabel}
                            accent
                          />
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
          {t('faqTitle')}
        </h2>
        <div className="space-y-5">
          {FAQ_KEYS.map((key) => (
            <Faq key={key} q={t(`faq.${key}.q`)} a={t(`faq.${key}.a`)} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            {t('finalCta.title')}
          </h2>
          <p className="text-gray-600 mb-8">
            {t.rich('finalCta.body', {
              // Tag form: next-intl invokes this with the chunks between
              // <handle>…</handle> in the message so the URL example stays
              // localisable while keeping the monospace styling.
              handle: (chunks) => <span className="font-mono">{chunks}</span>,
            })}
          </p>
          <PlanCheckoutButton
            plan="basic"
            currentPlan={currentPlan}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-4 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-900/10"
          >
            <span>{t('finalCta.cta')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </PlanCheckoutButton>
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
