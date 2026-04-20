import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Ensure that the PWA service worker and manifest are handled correctly
  // in a static export environment if needed.
};

export default nextConfig;
