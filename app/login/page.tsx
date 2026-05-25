'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { createBrowserSupabase } from '@/lib/supabase/browser'

type FormStatus = 'idle' | 'sending' | 'sent' | 'error' | 'oauth'

function LoginForm() {
  const t = useTranslations('login')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  // Default landing after login is /settings — it's the most useful
  // logged-in page (shows account state, billing, profile knobs) and makes
  // it visually obvious the session worked. Callers that want a different
  // destination (e.g. middleware bouncing protected routes to /login)
  // override via ?next=…
  const redirectTo = searchParams.get('next') || '/settings'

  async function handleGoogle() {
    setStatus('oauth')
    setError(null)
    const supabase = createBrowserSupabase()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setStatus('error')
      setError(error.message || t('googleError'))
      return
    }
    // Otherwise the browser is redirecting to Google's consent screen — no
    // further client-side work; auth/callback handles the code exchange.
  }

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
            email,
            highlight: (chunks) => <span className="font-mono text-gray-700">{chunks}</span>,
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

  const busy = status === 'sending' || status === 'oauth'

  return (
    <div className="space-y-5">
      {/* Google — primary option. Most users have a Google account and one
          click beats waiting for email. Brand-colored G logo per Google's
          identity guidelines (single character is permitted). */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-900 px-4 py-3 rounded-full font-medium hover:border-gray-900 hover:shadow-sm transition disabled:opacity-50 disabled:cursor-wait"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.5 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.3z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.45.34-2.12V7.04H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.96l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        <span>{status === 'oauth' ? t('googleSigningIn') : t('google')}</span>
      </button>

      {/* Divider between OAuth and magic-link paths. */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs uppercase tracking-wider text-gray-400">
            {t('or')}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          aria-label={t('emailLabel')}
          disabled={busy}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-gray-900 text-white px-4 py-3 rounded-full font-medium hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'sending' ? t('submitting') : t('submit')}
        </button>
      </form>

      {error && (
        <div className="text-red-600 text-sm text-center" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  const t = useTranslations('login')

  return (
    // Subtle warm wash so the page doesn't feel like a stark form. Matches
    // the homepage's sunset gradient at very low opacity.
    <div className="min-h-screen bg-white text-gray-900 flex flex-col relative">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-50"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(255, 204, 153, 0.25) 0%, transparent 70%)',
        }}
      />
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">{t('title')}</h1>
            <p className="text-sm text-gray-600">{t('subtitle')}</p>
          </div>

          <Suspense fallback={<div className="h-48" />}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
