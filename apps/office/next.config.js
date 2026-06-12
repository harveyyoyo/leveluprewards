/** @type {import('next').NextConfig} */
const path = require('path');

function formatBuildTimeEastern() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

const nextConfig = {
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/icon.png' }];
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
    optimizePackageImports: ['lucide-react', 'firebase/firestore', 'firebase/auth'],
  },
  webpack: (config, { dev }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };
    if (dev && process.platform === 'win32') {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        poll: 1000,
        aggregateTimeout: 400,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      };
    }
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_VERSION: 'office-0.1.0',
    NEXT_PUBLIC_BUILD_TIME: formatBuildTimeEastern(),
    NEXT_PUBLIC_OFFICE_DEV_ORIGIN: process.env.NEXT_PUBLIC_OFFICE_DEV_ORIGIN || 'http://127.0.0.1:3001',
  },
};

module.exports = nextConfig;
