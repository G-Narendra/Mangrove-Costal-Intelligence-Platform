import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: false,
  devIndicators: false,
  allowedDevOrigins: ['192.168.1.29', 'localhost:2540', '127.0.0.1:2540'],
  serverExternalPackages: ['jspdf', 'jspdf-autotable', 'genkit', '@genkit-ai/google-genai'],
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // 1 hour memory cache for compiled routes
    pagesBufferLength: 20,          // Keep up to 20 pages hot in Turbopack memory
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
    ],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|woff2|woff)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

