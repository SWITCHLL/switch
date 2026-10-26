import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack is the default bundler in Next.js 16; no extra flag needed.

  // Tell Turbopack/webpack not to bundle these packages — let Node.js resolve
  // them at runtime. The Prisma generated client uses import.meta.url and
  // must run in Node.js, not inside the Next.js bundle.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'bcryptjs'],

  // Image optimization: allow common CDN and hosting domains
  images: {
    // Next.js 16 requires an explicit qualities allowlist — omitting it causes
    // a 400 Bad Request for any image optimization request.
    qualities: [25, 50, 75, 90, 100],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      // Cloudinary
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // AWS S3 / CloudFront
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      // Uploadthing
      { protocol: 'https', hostname: 'utfs.io' },
      // Supabase Storage
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },

  // Experimental features
  experimental: {
    // Tree-shake icon and UI library imports — prevents entire packages from
    // landing in the client bundle when only a few exports are used.
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'date-fns',
    ],
  },

  // Typed routes — disabled until all routes are implemented
  // typedRoutes: true,

  // Compiler options
  compiler: {
    // Remove console logs in production (keep errors/warnings)
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + inline (Next.js requires unsafe-inline for hydration) + Paystack
              "script-src 'self' 'unsafe-inline' https://js.paystack.co",
              // Styles: self + inline (Tailwind inlines critical CSS)
              "style-src 'self' 'unsafe-inline'",
              // Images: self, data URIs, and all configured CDN/storage domains
              "img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co https://images.unsplash.com https://avatars.githubusercontent.com https://*.s3.amazonaws.com https://*.cloudfront.net https://utfs.io",
              // Fonts served from self
              "font-src 'self'",
              // API calls: self + Paystack + Sentry tunnel
              "connect-src 'self' https://api.paystack.co https://*.supabase.co https://*.sentry.io",
              // Paystack checkout iframe + Google Maps embed
              'frame-src https://checkout.paystack.com https://maps.google.com https://www.google.com',
              // Workers / service workers
              "worker-src 'self' blob:",
              // No plugins
              "object-src 'none'",
              // Upgrade insecure requests in production
              ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'codegreen-oe',

  project: 'switch',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
})
