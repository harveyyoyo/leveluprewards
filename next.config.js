
/** @type {import('next').NextConfig} */
const path = require('path');

const projectRoot = __dirname;

/** Footer build stamp — always US Eastern (EST/EDT via America/New_York). */
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
  /** Allow HMR / _next assets when visiting dev via public tunnels (see Next.js allowedDevOrigins). */
  allowedDevOrigins: [
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.ngrok.app',
    '*.trycloudflare.com',
  ],
  async rewrites() {
    // Browsers and tools often request /favicon.ico; serve the same asset as app/icon.png.
    return [{ source: '/favicon.ico', destination: '/icon.png' }];
  },
  async redirects() {
    return [
      {
        source: '/:schoolId/admin-signin',
        destination: '/:schoolId/admin-sign-in',
        permanent: true,
      },
      {
        source: '/:schoolId/halloffame',
        destination: '/:schoolId/hall-of-fame',
        permanent: true,
      },
      {
        source: '/leveluparcade',
        destination: '/',
        permanent: true,
      },
      {
        source: '/level-up-arcade',
        destination: '/',
        permanent: true,
      },
      {
        source: '/promotions',
        destination: '/flyers',
        permanent: true,
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
    /** Faster dev compiles for barrel-import packages (tree-shaken imports). */
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      'firebase/firestore',
      'firebase/auth',
      'firebase/functions',
    ],
  },
  /* config options here */
  webpack: (config, { dev, isServer }) => {
    // Explicit alias — Windows dev has intermittently emitted server bundles that still
    // contain literal `@/…` requires (MODULE_NOT_FOUND for AppProvider, ui/*, etc.).
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };
    // Windows: native file watching misses rapid `.next` churn → corrupt graphs; polling is slower but safer.
    if (dev && process.platform === 'win32') {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        poll: 1000,
        aggregateTimeout: 400,
        // Avoid Watchpack scanning drive root (EINVAL on hiberfil.sys, etc.).
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          path.join(projectRoot, 'node_modules'),
          path.join(projectRoot, '.next'),
        ],
      };
    }
    // @vladmandic/face-api uses dynamic requires; webpack warns but the bundle works.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@vladmandic\/face-api/ },
    ];
    // Windows + long-running dev servers in this repo have been intermittently
    // producing corrupted/partial webpack cache artifacts (ENOENT renames) which
    // then cascade into missing chunks at runtime. Disabling persistent cache
    // makes dev startup slower but keeps the server stable.
    // Use in-memory cache to avoid disk corruption on Windows while still
    // getting fast HMR within a dev session. Filesystem cache caused ENOENT
    // errors on long-running Windows servers.
    if (dev) {
      // In-memory cache only in dev (filesystem cache caused ENOENT on Windows).
      config.cache = { type: 'memory' };
    }
    return config;
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
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_VERSION: `beta-1.1.0`,
    NEXT_PUBLIC_BUILD_TIME: formatBuildTimeEastern(),
  },
};

module.exports = nextConfig;
