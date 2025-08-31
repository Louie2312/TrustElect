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
    const backend = process.env.BACKEND_URL;
    if (!backend) {
      console.warn('BACKEND_URL is not set; rewrites will not be applied.');
      return [];
    }
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ];
  },
}

module.exports = nextConfig