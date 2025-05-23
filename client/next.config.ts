import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    domains: [
      "bookface-images.s3.amazonaws.com",
      "logo.clearbit.com",
      "images.sprig.com",
      "www.ycombinator.com",
    ],
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
