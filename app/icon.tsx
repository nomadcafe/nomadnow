import { ImageResponse } from 'next/og'

// Code-generated favicon — the site previously shipped no icon at all, so the
// browser tab was blank and /favicon.ico 404'd. Next wires this into <head>
// automatically as <link rel="icon">. The mark is the brand's "live / now"
// green dot (same #22c55e as the homepage eyebrow pulse) on a near-black
// rounded tile — legible at 16px and on-message for nomad.now.
export const runtime = 'nodejs'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 15,
            height: 15,
            borderRadius: '50%',
            background: '#22c55e',
          }}
        />
      </div>
    ),
    size,
  )
}
