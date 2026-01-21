/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/app',
  output: 'standalone',
  transpilePackages: ['@arbme/core-lib'],
  assetPrefix: '/app',
}

module.exports = nextConfig
