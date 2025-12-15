/** @type {import('next').NextConfig} */
const nextConfig = {
  // Existing configurations remain
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { 
    unoptimized: true,
    domains: ['localhost', 'images.pexels.com', 'www.alphavantage.co']
  },

  // 👇 ADD THIS WEBPACK CONFIGURATION
  webpack: (config, { isServer }) => {
    // We only want to run this customization for the server-side bundle
    if (isServer) {
      // These modules are native Node.js dependencies that should NOT be bundled 
      // into the Vercel Serverless Function (Node.js runtime environment).
      config.externals.push('bufferutil', 'utf-8-validate');
    }

    return config;
  },
  // 👆 END OF NEW CONFIGURATION
};

module.exports = nextConfig;
