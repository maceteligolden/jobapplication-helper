/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mark pdf-parse and canvas as external packages
  // This prevents Next.js from bundling them and allows Node.js runtime to handle them natively
  // In Next.js 15+, serverExternalPackages is at the top level, not in experimental
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
};

export default nextConfig;
