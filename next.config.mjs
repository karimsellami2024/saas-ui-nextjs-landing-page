/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Disable type checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  transpilePackages: ['three'], // Transpile Three.js for Next.js compatibility
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i, // Ensure SVG files are processed correctly
      issuer: /\.[jt]sx?$/, // Only apply to JS/TSX files importing SVGs
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgoConfig: {
              plugins: [
                {
                  name: 'preset-default', // Use default SVGO optimizations
                  params: {
                    overrides: {
                      removeViewBox: false, // Preserve viewBox for SVG responsiveness
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    });
    return config;
  },
};

export default nextConfig;