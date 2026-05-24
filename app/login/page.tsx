'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { createBrowserSupabase } from '@/lib/supabase/browser'

function LoginForm() {
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
      setError(error.message)
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
          Check your inbox
        </div>
        <div className="text-sm text-gray-500">
          We sent a magic link to <span className="font-mono text-gray-700">{email}</span>.
          <br />
          Click it to sign in — you can close this tab.
        </div>
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
        placeholder="you@example.com"
        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-gray-900 text-white px-4 py-3 rounded-full font-medium hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? 'Sending…' : 'Send magic link'}
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
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition">
            Cancel
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Sign in</h1>
            <p className="text-sm text-gray-600">
              We&apos;ll email you a magic link. No password.
            </p>
          </div>

          <Suspense fallback={<div className="h-32" />}>
            <LoginForm />
          </Suspense>

          <p className="text-xs text-gray-400 text-center mt-10">
            Don&apos;t have a card yet?{' '}
            <Link href="/create-card" className="text-gray-600 hover:text-gray-900 underline underline-offset-2">
              Get one
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
