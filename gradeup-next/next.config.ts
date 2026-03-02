import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Bundle analyzer for performance optimization
// Run with: npm run analyze
// Note: Dynamic import wrapped in function to avoid top-level await (Jest compatibility)
const withBundleAnalyzer = (config: NextConfig) => {
  if (process.env.ANALYZE === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analyzer = require('@next/bundle-analyzer')({ enabled: true });
    return analyzer(config);
  }
  return config;
};

// Security headers for production
// Note: Content-Security-Policy is now handled dynamically in middleware.ts
// with nonce-based CSP for enhanced security (no 'unsafe-inline' or 'unsafe-eval')
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()',
  },
  // CSP is now set dynamically in middleware.ts with per-request nonces
  // This provides better XSS protection than static 'unsafe-inline'
  //
  // Note: Cross-Origin-Embedder-Policy and Cross-Origin-Resource-Policy are
  // intentionally omitted because they block external resources (images from
  // Unsplash, etc.) which crashes React during hydration. These headers are
  // only needed for SharedArrayBuffer/high-resolution timers use cases.
];

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com', // YouTube thumbnails
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com', // YouTube thumbnails (alternate)
      },
    ],
  },

  // Performance optimizations
  experimental: {
    // Optimize tree-shaking for large icon/chart libraries
    // These packages have many exports - Next.js will only bundle what's used
    optimizePackageImports: [
      'lucide-react',           // Icon library - only bundle used icons
      'recharts',               // Charting library - lazy loaded but optimize imports
      'date-fns',               // Date utilities - only bundle used functions
      '@sentry/nextjs',         // Error tracking - only bundle used integrations
      'dompurify',              // HTML sanitization - bundle only when needed
      'clsx',                   // Class name utility
      'tailwind-merge',         // Tailwind class merging
      '@supabase/supabase-js',  // Supabase client - only bundle used methods
    ],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Export with Sentry configuration and optional bundle analyzer
// Note: Sentry will only be active when SENTRY_DSN is configured
const configWithAnalyzer = withBundleAnalyzer(nextConfig);

export default withSentryConfig(configWithAnalyzer, {
  // Suppress source map upload warnings during build
  silent: true,
  // Source map configuration
  sourcemaps: {
    // Don't delete source maps after upload
    deleteSourcemapsAfterUpload: false,
  },
});
