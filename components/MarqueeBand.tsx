const ITEMS = [
  '🇵🇹 Lisbon',
  '🇹🇭 Bangkok',
  '🇲🇽 Mexico City',
  '🇯🇵 Tokyo',
  '🇮🇩 Bali',
  '🇬🇪 Tbilisi',
  '🇪🇸 Madrid',
  '🇻🇳 Hanoi',
  '🇲🇾 Kuala Lumpur',
  '🇵🇭 Cebu',
  '🇨🇴 Medellín',
  '🇦🇷 Buenos Aires',
  '🇲🇦 Marrakech',
  '🇰🇷 Seoul',
  '🇸🇬 Singapore',
  '🇨🇿 Prague',
]

// Pure-CSS infinite marquee. Renders the list twice so the loop has no seam.
export function MarqueeBand() {
  return (
    <div className="relative overflow-hidden border-y border-gray-100 bg-gray-50/40 py-5">
      <div className="flex w-max animate-marquee gap-12 whitespace-nowrap text-sm font-medium text-gray-500">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            {item}
          </span>
        ))}
      </div>
      {/* Edge fade */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent" />
    </div>
  )
}
