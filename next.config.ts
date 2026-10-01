import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// BUILD_STANDALONE=1 builds the self-contained Node server used by the Docker
// image; the default build targets Cloudflare Workers through OpenNext.
const standalone = process.env.BUILD_STANDALONE === "1";

// Initialise OpenNext for Cloudflare during local development
// This allows us to use Cloudflare bindings (KV, D1, R2, etc.) in dev mode
if (!standalone) {
  initOpenNextCloudflareForDev();
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(standalone ? { output: "standalone" as const } : {}),
  // Linear-hosted avatars + common third-party providers Linear uses when a
  // user hasn't uploaded a photo. Keeps the allowlist narrow -- branding
  // logos and markdown images deliberately stay on <img> because their
  // hosts are arbitrary user-provided URLs.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'public.linear.app' },
      { protocol: 'https', hostname: '**.linear.app' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'www.gravatar.com' },
      { protocol: 'https', hostname: 'secure.gravatar.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        url: false,
        punycode: false,
        zlib: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        os: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
