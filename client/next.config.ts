import type { NextConfig } from "next";

// This function helps determine if we're running in a Railway environment
const isRailway = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_SERVICE_NAME;

const nextConfig: NextConfig = {
  // Keep static export for production builds
  output: 'export',
  
  // Configure images
  images: {
    domains: [
      "bookface-images.s3.amazonaws.com",
      "logo.clearbit.com",
      "images.sprig.com",
      "www.ycombinator.com",
    ],
    unoptimized: true,
  },
  
  // Keep trailing slash for consistency
  trailingSlash: true,
  
  // Environment variables that will be available to the browser
  // This is important for Railway deployment
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088',
  },
  
  // This ensures that the NEXT_PUBLIC_API_URL is properly set at build time
  // which is critical for static exports
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088',
  },
};

export default nextConfig;
