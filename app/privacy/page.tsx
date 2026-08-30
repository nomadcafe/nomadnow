import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { CONTACT_EMAIL, toLegalSections } from '@/lib/legal'

// Privacy policy. Content is i18n-driven: an intro paragraph plus a list of
// { h, p } sections read via tLegal.raw('privacy.sections') and shape-checked by
// toLegalSections. Keep the copy in messages/{en,zh,ja}.json in sync across
// locales.
export default async function PrivacyPage() {
  const tNav = await getTranslations('nav')
  const tLegal = await getTranslations('legal')
  const sections = toLegalSections(tLegal.raw('privacy.sections'))

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
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
          {tNav('privacy')}
        </h1>
        <p className="text-sm text-gray-400 mb-8">{tLegal('lastUpdated')}</p>

        <p className="text-base leading-relaxed text-gray-700 mb-10">
          {tLegal('privacy.intro')}
        </p>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold tracking-tight mb-2">{section.h}</h2>
              <p className="text-[15px] leading-relaxed text-gray-700">{section.p}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-gray-500">
          {tLegal.rich('contactPrompt', {
            email: (chunks) => (
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-gray-900">
                {chunks}
              </a>
            ),
          })}
        </p>
      </main>
    </div>
  )
}
