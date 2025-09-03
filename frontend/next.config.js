/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'trustelectonline.com'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'trustelectonline.com',
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
    
    return [
      // Remove /api from destination since BACKEND_URL now includes /api
      { source: '/api/:path*', destination: `${BACKEND_URL}/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/../uploads/:path*` },
    ];
  },
}

module.exports = nextConfig