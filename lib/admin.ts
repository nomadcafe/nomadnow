// Admin allow-list. Moderation (card takedown) is gated to a small set of
// operator accounts identified by their Supabase auth user id, supplied via
// the ADMIN_USER_IDS env var (comma-separated UUIDs). This is deliberately an
// env allow-list rather than a DB `is_admin` column: it needs no migration, an
// admin can never be granted by a compromised write path, and the set changes
// rarely. Server-only — never import into client code.

function adminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false
  const ids = adminUserIds()
  return ids.length > 0 && ids.includes(userId)
}
