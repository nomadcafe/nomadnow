'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useLocale, useTranslations } from 'next-intl'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface StatsResponse {
  isPro: boolean
  totals: { views: number; clicks: number }
  last7Days: { views: number; clicks: number }
  pro?: {
    uniqueVisitors7d: number
    viewsDaily: { date: string; count: number }[]
    clicksByTarget: { targetType: string; targetUrl: string | null; count: number }[]
  }
}

// The /edit/overview landing — reframes the edit shell from "a form you land in"
// into "your dashboard". Two jobs: (1) make the card's public link + share
// tools permanent (they previously lived only in the one-shot post-creation
// CelebrationBanner), and (2) surface the first-party analytics so the user can
// see their card is actually working. Stats are fetched client-side from
// /api/stats; the free/Pro split is decided server-side and reflected in the
// payload (no `pro` block on a free plan).
export function OverviewDashboard({
  handle,
  displayName,
  updatedAt,
}: {
  handle: string
  displayName: string | null
  updatedAt: string | null
}) {
  const t = useTranslations('edit.overview')
  const tCelebrate = useTranslations('celebrate')
  const tNav = useTranslations('nav')
  const locale = useLocale()

  const [origin, setOrigin] = useState('https://nomad.now')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [statsError, setStatsError] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)

  const url = `${origin}/${handle}`

  // Resolve the real host client-side so staging/dev links copy correctly.
  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  // Render the QR to a PNG data URL once the URL is known — used both for the
  // preview <img> and the download button.
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(url, { width: 320, margin: 1, errorCorrectionLevel: 'M' })
      .then((data) => {
        if (alive) setQrDataUrl(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [url])

  useEffect(() => {
    let alive = true
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: StatsResponse) => {
        if (alive) setStats(data)
      })
      .catch(() => {
        if (alive) setStatsError(true)
      })
      .finally(() => {
        if (alive) setStatsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API fails on insecure origins — degrade silently.
    }
  }

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tCelebrate('tweetTemplate', { url }),
  )}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

  const updatedLabel = useMemo(() => {
    if (!updatedAt) return null
    try {
      return new Date(updatedAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return null
    }
  }, [updatedAt, locale])

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-12">
      <div className="space-y-8">
        {/* Header — "your card is live" reassurance + quick jumps. */}
        <section className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {t('live')}
                </span>
                {updatedLabel && (
                  <span className="text-xs text-gray-400">
                    {t('lastUpdated', { date: updatedLabel })}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {displayName || `@${handle}`}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${handle}`}
                className="text-sm font-medium px-4 py-2 rounded-full border border-gray-300 hover:border-gray-900 transition"
              >
                {tNav('viewProfile')}
              </Link>
              <Link
                href="/edit/content"
                className="text-sm font-medium px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition"
              >
                {t('editContent')}
              </Link>
            </div>
          </div>
        </section>

        {/* Share — link + copy + QR + social. The permanent home for what the
            CelebrationBanner only showed once. */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('shareTitle')}</h2>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">
                {t('yourLink')}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-mono text-gray-900 bg-gray-100 rounded-lg px-3 py-2 break-all">
                  {origin.replace(/^https?:\/\//, '')}/{handle}
                </code>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full border border-gray-300 hover:border-gray-900 transition"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                  {copied ? t('copied') : t('copy')}
                </button>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <a
                  href={tweetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  {tCelebrate('shareX')}
                </a>
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full border border-gray-300 hover:border-gray-900 transition"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065c0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  {tCelebrate('shareLinkedin')}
                </a>
              </div>
            </div>

            {/* QR — hand-someone-your-card / "grab a coffee" IRL flow. */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-32 h-32 rounded-xl border border-gray-200 bg-white p-2 flex items-center justify-center">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt={t('qrAlt')} className="w-full h-full" />
                ) : (
                  <LoadingSpinner size="sm" />
                )}
              </div>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`nomadnow-${handle}-qr.png`}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 transition"
                >
                  {t('downloadQr')}
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Analytics. */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('statsTitle')}</h2>
          {statsLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : statsError || !stats ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
              {t('statsError')}
            </div>
          ) : (
            <StatsView stats={stats} t={t} locale={locale} />
          )}
        </section>
      </div>
    </main>
  )
}

function StatsView({
  stats,
  t,
  locale,
}: {
  stats: StatsResponse
  t: ReturnType<typeof useTranslations>
  locale: string
}) {
  const noData = stats.totals.views === 0 && stats.totals.clicks === 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile
          label={t('views')}
          value={stats.totals.views}
          sub={t('inLast7', { count: stats.last7Days.views })}
        />
        <StatTile
          label={t('clicks')}
          value={stats.totals.clicks}
          sub={t('inLast7', { count: stats.last7Days.clicks })}
        />
        {stats.isPro && stats.pro ? (
          <>
            <StatTile label={t('unique')} value={stats.pro.uniqueVisitors7d} />
            <StatTile
              label={t('ctr')}
              value={
                stats.totals.views > 0
                  ? `${Math.round((stats.totals.clicks / stats.totals.views) * 100)}%`
                  : '—'
              }
            />
          </>
        ) : (
          <ProUpsell t={t} />
        )}
      </div>

      {noData && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500 text-center">
          {t('statsEmpty')}
        </div>
      )}

      {stats.isPro && stats.pro && !noData && (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">
              {t('trend')}
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.pro.viewsDaily} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) =>
                      new Date(d).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
                    }
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip
                    labelFormatter={(d) =>
                      new Date(d as string).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
                    }
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#111827" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {stats.pro.clicksByTarget.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                {t('breakdown')}
              </div>
              <ul className="space-y-2">
                {stats.pro.clicksByTarget.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                        {t(`target.${c.targetType}` as string)}
                      </span>
                      {c.targetUrl && (
                        <span className="text-gray-500 font-mono text-xs truncate">
                          {c.targetUrl.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-gray-900 tabular-nums shrink-0">{c.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatTile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function ProUpsell({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <Link
      href="/pricing"
      className="col-span-2 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5 hover:border-amber-300 transition group"
    >
      <div className="text-xs uppercase tracking-wide text-amber-700 font-medium">{t('proTitle')}</div>
      <div className="text-sm text-gray-700 mt-1">{t('proBody')}</div>
      <div className="text-sm font-semibold text-amber-800 mt-2 group-hover:underline">
        {t('proCta')} →
      </div>
    </Link>
  )
}
