const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Restrict the server-side image optimizer to hosts we actually serve from.
    // A wildcard ('**') let a card owner point a stay photo_url at an internal
    // address (e.g. https://169.254.169.254/...) and have the optimizer fetch
    // it server-side on every visit — SSRF. User uploads live on Supabase
    // Storage (*.supabase.co); Google avatars from OAuth on googleusercontent.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
    // Optimize images for better performance
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        // Baseline security headers on every response.
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Clickjacking defense via CSP (modern equivalent of X-Frame-Options).
          // frame-ancestors only governs who may frame US; our own embed
          // iframes (youtube/vimeo/spotify) are frame-src and unaffected. A
          // full script/style CSP is intentionally deferred — Next ships inline
          // scripts/styles that need nonces and would break without care.
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
    ]
  },
  // Compress responses
  compress: true,
  // Power optimization
  poweredByHeader: false,
  // Exclude native modules from webpack bundling
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude @resvg/resvg-js native bindings from webpack
      config.externals = config.externals || []
      config.externals.push({
        '@resvg/resvg-js': 'commonjs @resvg/resvg-js',
      })
    }
    return config
  },
  // Externalize native modules for server-side
  serverExternalPackages: ['@resvg/resvg-js'],
  // Experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['recharts', '@supabase/supabase-js'],
  },
}

module.exports = withNextIntl(nextConfig)

