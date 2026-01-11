/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          }
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/default",
        permanent: false,
      },
    ];
  },
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  
  // Disable source maps in production for security
  productionBrowserSourceMaps: false,
  
  // Image optimization
  images: {
    domains: process.env.NEXT_PUBLIC_API_URL 
      ? [new URL(process.env.NEXT_PUBLIC_API_URL).hostname]
      : ['localhost'],
    formats: ['image/webp'],
  },
}

export default nextConfig
