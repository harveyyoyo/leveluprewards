
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
  /* config options here */
  webpack: (config) => {
    // @vladmandic/face-api uses dynamic requires; webpack warns but the bundle works.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@vladmandic\/face-api/ },
    ];
    // Do not override server `chunkFilename`. Next emits `webpack-runtime.js` and
    // async chunks with matching relative paths (e.g. `./682.js`). Forcing chunks
    // into `server/chunks/` breaks `require('./682.js')` at runtime (MODULE_NOT_FOUND).
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
