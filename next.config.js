
/** @type {import('next').NextConfig} */
const fs = require('fs');
const path = require('path');

class DuplicateServerDevChunksPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('DuplicateServerDevChunksPlugin', () => {
      const chunksDir = path.join(compiler.outputPath, 'chunks');
      if (!fs.existsSync(chunksDir)) return;
      for (const fileName of fs.readdirSync(chunksDir)) {
        if (!/\.js$/.test(fileName)) continue;
        const sourcePath = path.join(chunksDir, fileName);
        const targetPath = path.join(compiler.outputPath, fileName);
        try {
          if (!fs.existsSync(targetPath)) {
            fs.copyFileSync(sourcePath, targetPath);
          }
        } catch (error) {
          console.warn(
            `[DuplicateServerDevChunksPlugin] Could not copy ${sourcePath} to ${targetPath}:`,
            error,
          );
        }
      }
    });
  }
}

const nextConfig = {
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
        destination: '/level-up-arcade',
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
    // Windows: native file watching misses rapid `.next` churn → corrupt graphs; polling is slower but safer.
    if (dev && process.platform === 'win32') {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        poll: 1000,
        aggregateTimeout: 400,
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
    config.cache = { type: 'memory' };
    if (dev && isServer) {
      // In local Windows dev, Next's server split chunks have repeatedly emitted
      // page bundles that reference missing `.next/server/vendor-chunks/*` files.
      // Keep server dev output bundled per entry to avoid stale vendor chunk refs.
      config.optimization.splitChunks = false;
      // Numeric chunk ids (`1682.js`) are harder to debug and easier to desync after HMR;
      // named ids reduce “Cannot find module './NNNN.js'” crashes when paired with the plugin below.
      config.optimization.chunkIds = 'named';
      config.optimization.moduleIds = 'named';
      // The generated server webpack runtime loads async chunks via
      // `require("./" + chunkId + ".js")`, so dev chunks must live beside
      // `.next/server/webpack-runtime.js`, not under `.next/server/chunks`.
      config.output.chunkFilename = '[name].js';
      config.plugins.push(new DuplicateServerDevChunksPlugin());
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
    NEXT_PUBLIC_BUILD_TIME: new Date().toLocaleString(),
  },
};

module.exports = nextConfig;
