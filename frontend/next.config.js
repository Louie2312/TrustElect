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
      // FIXED: Keep /api in destination to match backend routes
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
}

module.exports = nextConfig