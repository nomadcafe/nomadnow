import Link from 'next/link'

interface LogoProps {
  // When false, renders as a plain span (use in places that already wrap in <Link>).
  asLink?: boolean
  // 'sm' for nav (default), 'md' for footer / login card.
  size?: 'sm' | 'md'
  className?: string
}

// nomad.now wordmark with a live-status pulse dot.
// The dot ties the brand to the product's core differentiator: live current city.
export function Logo({ asLink = true, size = 'sm', className = '' }: LogoProps) {
  const textSize = size === 'md' ? 'text-2xl' : 'text-xl'
  const dotSize = size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5'
  const pingSize = size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5'

  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${textSize} font-semibold tracking-tight leading-none ${className}`}>
      <span className="relative inline-flex">
        <span className={`absolute inset-0 ${pingSize} rounded-full bg-green-500 opacity-60 motion-safe:animate-ping`} aria-hidden />
        <span className={`relative ${dotSize} rounded-full bg-green-500`} aria-hidden />
      </span>
      <span>
        nomad<span className="text-gray-400">.now</span>
      </span>
    </span>
  )

  if (!asLink) return inner
  return (
    <Link href="/" aria-label="Nomad.now home" className="inline-flex items-center hover:opacity-80 transition">
      {inner}
    </Link>
  )
}
