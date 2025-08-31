/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'trustelect-production.up.railway.app'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'trustelect-production.up.railway.app',
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    // Always provide rewrites, even if BACKEND_URL is not set
    const BACKEND_URL = process.env.BACKEND_URL || 'https://trustelect-production.up.railway.app';
    
    console.log('Next.js rewrites using BACKEND_URL:', BACKEND_URL);
    
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
}

module.exports = nextConfig