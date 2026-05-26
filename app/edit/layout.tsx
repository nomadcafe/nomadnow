import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { AccountMenu } from '@/components/AccountMenu'
import { createServerSupabase } from '@/lib/supabase/server'
import { getAccountInitial } from '@/lib/account'
import { EditTabs } from './EditTabs'

// Unified edit shell — replaces the split between /create-card (content) and
// /settings (look + account) with a single tabbed entrypoint. Auth-gates at
// the layout so each sub-page can assume the user is signed in. Looks up the
// user's handle once and threads it through to "View profile" so the link is
// available on every tab without each page re-fetching.
export default async function EditLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/edit')
  }

  const [tNav, accountInitial, handleResult] = await Promise.all([
    getTranslations('nav'),
    getAccountInitial(),
    supabase.from('users').select('handle').eq('id', user.id).maybeSingle(),
  ])
  const handle = (handleResult.data?.handle as string | null) ?? null

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            {handle && (
              <Link
                href={`/${handle}`}
                className="text-sm text-gray-500 hover:text-gray-900 transition"
              >
                {tNav('viewProfile')}
              </Link>
            )}
            <AccountMenu className="hidden sm:inline-flex" initial={accountInitial} />
          </div>
        </div>
      </nav>
      <EditTabs />
      {children}
    </div>
  )
}
