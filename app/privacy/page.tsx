import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

// Privacy stub. Intentionally minimal — the body text is i18n-driven so
// it's easy to swap in real reviewed copy without touching layout. The
// "draft" amber notice is on purpose: it makes clear to anyone landing
// here that this page hasn't been through legal review yet, and to the
// owner that it still needs to be replaced before launch.
export default async function PrivacyPage() {
  const tNav = await getTranslations('nav')
  const tLegal = await getTranslations('legal')

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <nav className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-900 transition"
            >
              {tNav('back')}
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
          {tNav('privacy')}
        </h1>

        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {tLegal('draftNotice')}
        </div>

        <p className="text-base leading-relaxed text-gray-700 mb-6">
          {tLegal('privacyBody')}
        </p>
        <p className="text-sm text-gray-500">{tLegal('contactPrompt')}</p>
      </main>
    </div>
  )
}
