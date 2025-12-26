/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker deployment
  webpack: (config) => {
    // Required for pdf.js worker
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
