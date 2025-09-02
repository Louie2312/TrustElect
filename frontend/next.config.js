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
    
    console.log('Next.js rewrites using BACKEND_URL:', BACKEND_URL);
    
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
}

module.exports = nextConfig