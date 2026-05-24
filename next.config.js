/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Optimize images for better performance
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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

module.exports = nextConfig

