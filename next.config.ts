import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // These packages use Node.js native features — opt out of bundling
  serverExternalPackages: ['sharp'],

  // Allow Supabase storage image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
