import Link from 'next/link'
import { Logo } from './Logo'
import { isReservedHandle } from '@/lib/reserved-handles'
import { handleSchema } from '@/lib/validation'

interface ProfileNotFoundProps {
  handle: string
}

// What we show when /{handle} doesn't resolve to a real profile.
// Distinguishes three cases and steers the visitor toward action:
//   1. Handle format is invalid → educate
//   2. Handle is reserved → polite refusal
//   3. Handle is available → big "Claim this" CTA (this is the conversion path
//      for anyone who clicked an aspirational / dead link)
export function ProfileNotFound({ handle }: ProfileNotFoundProps) {
  const lower = handle.toLowerCase()
  const validFormat = handleSchema.safeParse(lower).success
  const reserved = isReservedHandle(lower)

  let state: 'invalid' | 'reserved' | 'available'
  if (!validFormat) state = 'invalid'
  else if (reserved) state = 'reserved'
  else state = 'available'

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/explore"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
            >
              Explore
            </Link>
            <Link
              href="/map"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
            >
              Map
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          {state === 'available' && (
            <>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Available
              </div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tighter leading-[1.05] mb-4">
                <span className="text-gray-300">nomad.now/</span>
                <span className="break-all">{lower}</span>
              </h1>
              <p className="text-gray-600 mb-10 text-lg leading-relaxed">
                Nobody&apos;s claimed this handle yet. Take it before someone else does.
              </p>
              <Link
                href={`/create-card?handle=${encodeURIComponent(lower)}`}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-4 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-900/10"
              >
                Claim @{lower}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <div className="mt-5 text-xs text-gray-500">
                Free, no subscription · 1 minute to set up
              </div>
            </>
          )}

          {state === 'reserved' && (
            <>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Reserved
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                <span className="text-gray-300">nomad.now/</span>
                <span className="break-all">{lower}</span>
              </h1>
              <p className="text-gray-600 mb-8 leading-relaxed">
                This handle is reserved — usually because it collides with a system
                page (like <span className="font-mono text-gray-700">/login</span>) or
                a brand-protected name.
              </p>
              <Link
                href="/create-card"
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
              >
                Pick a different handle
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </>
          )}

          {state === 'invalid' && (
            <>
              <div className="mb-6">
                <svg
                  className="w-16 h-16 mx-auto text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight mb-3">Not a valid handle</h1>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Handles use letters, numbers, hyphens, and underscores only —
                between 1 and 50 characters.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/create-card"
                  className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
                >
                  Pick a handle
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-full font-medium border border-gray-200 hover:bg-gray-50 transition"
                >
                  Explore nomads
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-gray-400">
          © 2026 Nomad.now · The bio link for people who don&apos;t live in one place.
        </div>
      </footer>
    </div>
  )
}
