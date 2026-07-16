import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // These packages use Node.js native features — opt out of bundling
  serverExternalPackages: ['pdf-parse', '@xenova/transformers', 'sharp', 'onnxruntime-node'],

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
