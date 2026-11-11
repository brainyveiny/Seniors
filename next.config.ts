import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import type { NextConfig } from "next";
import { r2PublicHostname } from "./src/infrastructure/storage/r2-config";

// Windows often has a stale machine-level DATABASE_URL that overrides `.env`.
loadEnv({ path: resolve(__dirname, ".env"), override: true });

const r2Host = r2PublicHostname();

const nextConfig: NextConfig = {
  // Firebase phone auth needs http://127.0.0.1 (not localhost). Without this, dev HMR
  // websocket is blocked and the page can lose client-side interactivity.
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["firebase-admin"],
  poweredByHeader: false,
  compress: true,
  experimental: {
    /** Keep admin page data when switching sidebar tabs (no manual client cache). */
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.pixabay.com",
        pathname: "/**",
      },
      ...(r2Host
        ? [
            {
              protocol: "https" as const,
              hostname: r2Host,
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/logo.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
