import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Initialise OpenNext for Cloudflare during local development
// This allows us to use Cloudflare bindings (KV, D1, R2, etc.) in dev mode
initOpenNextCloudflareForDev();

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
