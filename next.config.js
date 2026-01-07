/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverActions: {
    bodySizeLimit: '10mb',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle these Node.js modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        'better-sqlite3': false,
      };
      
      // Exclude better-sqlite3 from client bundle
      config.externals = config.externals || [];
      config.externals.push('better-sqlite3');
    }
    return config;
  },
  serverComponentsExternalPackages: ['better-sqlite3'],
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
}

module.exports = nextConfig

