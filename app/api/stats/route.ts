import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { isPro } from '@/lib/billing'
import { formatErrorResponse, logError } from '@/lib/errors'

// Owner-only analytics summary for the /edit/overview dashboard. Reads the
// signed-in user's own view/click rows with the service-role client (the tables
// are RLS-locked with no policies, migration 0033) and returns ONLY aggregates
// — never raw visitor_hash/referrer rows — scoped to auth.uid().
//
// Gating (product decision): totals + a 7-day headline are free so every user
// feels the value; the daily trend, unique-visitor estimate, and per-target
// click breakdown are Pro. Free responses omit the `pro` block entirely.

const DAY_MS = 24 * 60 * 60 * 1000
const TREND_DAYS = 14
// Cap the rows we pull for in-JS aggregation. A card doing >5k clicks in 30
// days has outgrown this endpoint and wants a real warehouse; until then this
// bounds latency without materially skewing the breakdown.
const BREAKDOWN_ROW_CAP = 5000

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * DAY_MS).toISOString()
}

export async function GET() {
  try {
    const { user } = await requireUser()
    const admin = createAdminSupabase()

    const { data: profile } = await admin
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle()
    const pro = isPro((profile as { plan?: string | null } | null)?.plan)

    const since7 = iso(7)

    // Totals + 7-day headline: cheap COUNT(*) with head:true (no rows shipped).
    const [totalViews, views7d, totalClicks, clicks7d] = await Promise.all([
      admin.from('card_views').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      admin
        .from('card_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', since7),
      admin.from('card_clicks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      admin
        .from('card_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', since7),
    ])

    const base = {
      isPro: pro,
      totals: {
        views: totalViews.count ?? 0,
        clicks: totalClicks.count ?? 0,
      },
      last7Days: {
        views: views7d.count ?? 0,
        clicks: clicks7d.count ?? 0,
      },
    }

    if (!pro) {
      return NextResponse.json(base)
    }

    // ── Pro depth ──────────────────────────────────────────────────────────
    const sinceTrend = iso(TREND_DAYS)
    const since30 = iso(30)

    const [viewRows, clickRows] = await Promise.all([
      admin
        .from('card_views')
        .select('created_at, visitor_hash')
        .eq('user_id', user.id)
        .gte('created_at', sinceTrend)
        .order('created_at', { ascending: false })
        .limit(BREAKDOWN_ROW_CAP),
      admin
        .from('card_clicks')
        .select('target_type, target_url')
        .eq('user_id', user.id)
        .gte('created_at', since30)
        .order('created_at', { ascending: false })
        .limit(BREAKDOWN_ROW_CAP),
    ])

    // Daily view trend, one bucket per calendar day (UTC) for the last
    // TREND_DAYS, zero-filled so the chart has no gaps. uniqueVisitors counts
    // distinct daily-salted hashes over the same window (approximate — a hash
    // rotates each day, so a repeat visitor across days counts once per day).
    const dayBuckets = new Map<string, number>()
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      dayBuckets.set(new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10), 0)
    }
    const uniqueHashes = new Set<string>()
    for (const row of viewRows.data ?? []) {
      const createdAt = row.created_at as string
      const day = createdAt.slice(0, 10)
      if (dayBuckets.has(day)) dayBuckets.set(day, (dayBuckets.get(day) ?? 0) + 1)
      // uniqueVisitors7d honours its label even though the trend spans 14d.
      if (row.visitor_hash && createdAt >= since7) uniqueHashes.add(row.visitor_hash as string)
    }
    const viewsDaily = Array.from(dayBuckets, ([date, count]) => ({ date, count }))

    // Click breakdown: bucket by (target_type, target_url) so the dashboard can
    // rank "which destination earns clicks". CTAs collapse to their type since
    // there's one per card; links/works key on the URL.
    const clickAgg = new Map<string, { targetType: string; targetUrl: string | null; count: number }>()
    for (const row of clickRows.data ?? []) {
      const targetType = row.target_type as string
      const targetUrl = (row.target_url as string | null) ?? null
      const key = `${targetType}|${targetUrl ?? ''}`
      const existing = clickAgg.get(key)
      if (existing) existing.count += 1
      else clickAgg.set(key, { targetType, targetUrl, count: 1 })
    }
    const clicksByTarget = Array.from(clickAgg.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    return NextResponse.json({
      ...base,
      pro: {
        uniqueVisitors7d: uniqueHashes.size,
        viewsDaily,
        clicksByTarget,
      },
    })
  } catch (error) {
    logError(error, { operation: 'card_stats' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode },
    )
  }
}
