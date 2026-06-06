import { logError } from './errors'
import type { ReportReason } from '@/types/database'

// Out-of-band "wake me up" notifications to a chat channel (Discord or Slack
// incoming webhook). The DB row is always the source of truth — this is only
// the ping so a solo operator can react the same day instead of discovering a
// phishing card via the table.
//
// Gated on ABUSE_WEBHOOK_URL: unset (local/preview/CI) => no-op. Fail-open and
// fire-safe: a webhook outage must never fail the underlying report write.
//
// One payload serves both platforms: Discord reads `content` and ignores
// `text`; Slack reads `text` and ignores `content`.

const WEBHOOK_URL = process.env.ABUSE_WEBHOOK_URL

export async function notifyAbuseReport(report: {
  id: string
  handle: string
  reason: ReportReason
  details: string | null
}): Promise<void> {
  if (!WEBHOOK_URL) return

  const lines = [
    `🚩 **Abuse report** on \`nomad.now/${report.handle}\``,
    `Reason: **${report.reason}**`,
    report.details ? `Details: ${report.details.slice(0, 500)}` : null,
    `Report ID: ${report.id}`,
  ].filter(Boolean)
  const message = lines.join('\n')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
        body: JSON.stringify({ content: message, text: message }),
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    // Timeout / network failure — log and move on; the row is already saved.
    logError(error, { operation: 'notify_abuse_report', reportId: report.id })
  }
}
