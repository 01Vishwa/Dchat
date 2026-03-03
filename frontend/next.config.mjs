/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Supabase storage if needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Ensure server-side env vars are available to API routes
  serverExternalPackages: [],

  // Increase body parser limit for file uploads (API routes)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Redirect root to dashboard (handled by middleware, but belt-and-suspenders)
  async headers() {
    return [
      {
        // Allow CORS for API routes when backend is on another domain
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
};

export default nextConfig;
