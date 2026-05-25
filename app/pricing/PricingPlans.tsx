'use client'

import { useState } from 'react'
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

const PRO_BULLET_KEYS: { key: string; soon?: boolean }[] = [
  { key: 'everythingInBasic' },
  { key: 'customDomain', soon: true },
  { key: 'verifiedBadge' },
  { key: 'featured' },
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
  const [billing, setBilling] = useState<Billing>('monthly')
  const isYearly = billing === 'yearly'
  const unit = isYearly ? t('perYear') : t('perMonth')

  return (
    <>
      <div className="flex justify-center mb-8">
        <div role="tablist" aria-label={t('billing.aria')} className="inline-flex items-center bg-gray-100 p-1 rounded-full text-sm">
          <button
            type="button"
            role="tab"
            aria-selected={!isYearly}
            onClick={() => setBilling('monthly')}
            className={`px-4 py-1.5 rounded-full transition ${
              !isYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('billing.monthly')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isYearly}
            onClick={() => setBilling('yearly')}
            className={`px-4 py-1.5 rounded-full transition inline-flex items-center gap-2 ${
              isYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t('billing.yearly')}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              {t('billing.save')}
            </span>
          </button>
        </div>
      </div>

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
