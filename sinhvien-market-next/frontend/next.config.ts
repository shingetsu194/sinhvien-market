import type { NextConfig } from "next";

const phpBackendUrl = process.env.PHP_BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!phpBackendUrl) return [];
    return [
      {
        source: "/products/image",
        destination: `${phpBackendUrl}/products/image`,
      },
      {
        source: "/users/avatar",
        destination: `${phpBackendUrl}/users/avatar`,
      },
      {
        source: "/banners/image",
        destination: `${phpBackendUrl}/banners/image`,
      },
      {
        source: "/giveaways/image",
        destination: `${phpBackendUrl}/giveaways/image`,
      },
      {
        source: "/transactions/proof",
        destination: `${phpBackendUrl}/transactions/proof`,
      },
      {
        // Google OAuth: start + callback handled by PHP GoogleAuthController.
        source: "/auth/google",
        destination: `${phpBackendUrl}/auth/google`,
      },
      {
        source: "/auth/google/callback",
        destination: `${phpBackendUrl}/auth/google/callback`,
      },
      {
        source: "/api/:path*",
        destination: `${phpBackendUrl}/api/:path*`,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    agentUpgrade: "security",
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
