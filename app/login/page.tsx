'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { createBrowserSupabase } from '@/lib/supabase/browser'

function LoginForm() {
  const t = useTranslations('login')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('next') || '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)

    const supabase = createBrowserSupabase()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })

    if (error) {
      setStatus('error')
      // Surface Supabase's own message — already localized by their backend
      // when their email templates are. Fallback to the i18n generic if empty.
      setError(error.message || t('errorGeneric'))
      return
    }
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <div className="text-center space-y-3 py-4">
        <svg
          className="w-12 h-12 mx-auto text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <div className="text-base font-medium text-gray-900">
          {t('sentTitle')}
        </div>
        <div className="text-sm text-gray-500">
          {t.rich('sentBody', {
            email: () => <span className="font-mono text-gray-700">{email}</span>,
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            setStatus('idle')
            setError(null)
          }}
          className="mt-3 text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2"
        >
          {t('tryAnother')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('emailPlaceholder')}
        aria-label={t('emailLabel')}
        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-gray-900 text-white px-4 py-3 rounded-full font-medium hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? t('submitting') : t('submit')}
      </button>
      {error && (
        <div className="text-red-600 text-sm text-center pt-1" role="alert">
          {error}
        </div>
      )}
    </form>
  )
}

export default function LoginPage() {
  const t = useTranslations('login')
  const tCommon = useTranslations('common')

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition">
              {tCommon('cancel')}
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('title')}</h1>
            <p className="text-sm text-gray-600">{t('subtitle')}</p>
          </div>

          <Suspense fallback={<div className="h-32" />}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
