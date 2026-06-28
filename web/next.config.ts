import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:8000";
const webRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent repo has an empty package-lock.json; pin Turbopack to web/ so
  // module paths resolve to web/node_modules instead of [project]/web/...
  turbopack: {
    root: webRoot,
  },
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
