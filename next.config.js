const fs = require('fs');
const path = require('path');

/**
 * Firebase's modular SDK pulls many `node_modules/@firebase/*` packages. Next's server
 * bundler can emit a broken vendor chunk (e.g. `./vendor-chunks/@firebase.js`) on Windows.
 * Marking these as external avoids that split and loads them with Node at runtime.
 */
function firebaseServerExternalPackages() {
  const scopedRoot = path.join(__dirname, 'node_modules', '@firebase');
  let scoped = [];
  try {
    scoped = fs
      .readdirSync(scopedRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => `@firebase/${d.name}`);
  } catch {
    /* optional during fresh installs */
  }
  return ['firebase', ...scoped];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Smaller Cloud Function / Firebase upload: trace only required server deps */
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: firebaseServerExternalPackages(),
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@playwright/**/*',
        'node_modules/playwright*/**/*',
        'e2e/**/*',
        'tests/**/*',
        'playwright-report/**/*',
        'test-results/**/*',
      ],
    },
  },
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ];
    return [{ source: '/:path*', headers: security }];
  },
  images: {
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
  env: {
    NEXT_PUBLIC_VERSION: `beta-1.1.0`,
  },
};

module.exports = nextConfig;
