/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@arbme/core-lib'],
  webpack: (config) => {
    // Fix for WalletConnect/RainbowKit module resolution issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://warpcast.com',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://warpcast.com https://*.farcaster.xyz https://farcaster.xyz",
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/app',
        destination: '/',
        permanent: true,
      },
      {
        source: '/app/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
