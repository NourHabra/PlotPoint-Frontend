/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // NOTE: Allow production builds to succeed even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  // Keep type safety during builds
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
