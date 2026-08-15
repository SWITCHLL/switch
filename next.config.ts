import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack is the default bundler in Next.js 16; no extra flag needed.

  // Tell Turbopack/webpack not to bundle these packages — let Node.js resolve
  // them at runtime. The Prisma generated client uses import.meta.url and
  // must run in Node.js, not inside the Next.js bundle.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg'],

  // Image optimization: allow common CDN and hosting domains
  images: {
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
    // Typesafe server actions
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
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
