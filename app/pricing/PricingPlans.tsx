'use client'

import { useTranslations } from 'next-intl'
import { PlanCheckoutButton } from '@/components/PlanCheckoutButton'

type Plan = 'basic' | 'pro'
type Billing = 'monthly' | 'yearly'

interface Props {
  currentPlan: Plan | null
}

const BASIC_BULLET_KEYS = [
  'premiumDomain',
  'worldMap',
  'liveTimezone',
  'stays',
  'links',
  'themes',
  'travelStats',
  'analytics',
  'ogImage',
  'footer',
] as const

// Pro bullets — order is by "what's live today first, roadmap after" so the
// reader hits the live differentiators (accent / verified) before the soon
// pills start. Must agree with the FEATURE_ROWS table on page.tsx — every
// row marked `soon` in the table is mirrored here.
const PRO_BULLET_KEYS: { key: string; soon?: boolean }[] = [
  { key: 'everythingInBasic' },
  { key: 'accentCustom' },
  { key: 'verifiedBadge' },
  { key: 'handles', soon: true },
  { key: 'customDomain', soon: true },
  { key: 'featured', soon: true },
  { key: 'analytics', soon: true },
  { key: 'drafts', soon: true },
  { key: 'autoSync', soon: true },
  { key: 'embed', soon: true },
  { key: 'support' },
]

// Yearly = 10 × monthly (2 months free). Kept inline rather than computed so
// the displayed price always matches what marketing decided, not floating-
// point output like "$9.80" vs "$9.8".
const PRICES: Record<Plan, { monthly: string; yearly: string }> = {
  basic: { monthly: '$1.98', yearly: '$18' },
  pro: { monthly: '$9.8', yearly: '$80' },
}

function Check({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

export function PricingPlans({ currentPlan }: Props) {
  const t = useTranslations('pricing')
  const tCommon = useTranslations('common')
  const soonLabel = tCommon('soon').toUpperCase()
  // Monthly/yearly toggle is hidden until yearly Stripe price IDs are wired
  // and the checkout path supports the yearly interval. The previous UI
  // showed a yearly tab that flipped the prices but disabled the checkout
  // button — a dead-end funnel where users committed to a price and then
  // discovered they couldn't actually pay it. Better to not offer the
  // option until it actually works. The yearly branch and PRICES.yearly
  // entries are kept so re-enabling is just restoring the toggle here.
  const isYearly: boolean = false
  const unit = t('perMonth')

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        {/* Basic — featured. */}
        <div className="relative rounded-2xl border-2 border-gray-900 bg-gray-900 text-white p-7 sm:p-8 flex flex-col shadow-xl shadow-gray-900/20">
          <span className="absolute -top-3 right-6 inline-flex items-center gap-1 bg-amber-300 text-gray-900 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full">
            {t('mostPopular')}
          </span>
          <div className="mb-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-2">{t('basic.label')}</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-semibold tracking-tight">{isYearly ? PRICES.basic.yearly : PRICES.basic.monthly}</span>
              <span className="text-gray-400">{unit}</span>
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
          {isYearly ? (
            <div
              className="w-full block text-center text-sm font-medium bg-white/15 text-white/70 px-5 py-3 rounded-full cursor-not-allowed"
              aria-disabled="true"
            >
              {t('yearlyComingSoon')}
            </div>
          ) : (
            <PlanCheckoutButton
              plan="basic"
              currentPlan={currentPlan}
              className="w-full block text-center text-sm font-medium bg-white text-gray-900 hover:bg-gray-100 px-5 py-3 rounded-full transition"
            >
              {t('basic.cta')}
            </PlanCheckoutButton>
          )}
        </div>

        {/* Pro */}
        <div className="rounded-2xl border border-gray-200 bg-white p-7 sm:p-8 flex flex-col">
          <div className="mb-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-2">{t('pro.label')}</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-semibold tracking-tight">{isYearly ? PRICES.pro.yearly : PRICES.pro.monthly}</span>
              <span className="text-gray-500">{unit}</span>
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
          {isYearly ? (
            <div
              className="w-full block text-center text-sm font-medium border border-gray-200 text-gray-400 px-5 py-3 rounded-full cursor-not-allowed"
              aria-disabled="true"
            >
              {t('yearlyComingSoon')}
            </div>
          ) : (
            <PlanCheckoutButton
              plan="pro"
              currentPlan={currentPlan}
              className="w-full block text-center text-sm font-medium border border-gray-300 hover:border-gray-900 px-5 py-3 rounded-full transition"
            >
              {t('pro.cta')}
            </PlanCheckoutButton>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 mt-5">
        {t('footnote')}
      </p>
    </>
  )
}
