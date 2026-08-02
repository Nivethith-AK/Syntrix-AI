import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Avoid picking a parent lockfile outside this monorepo package.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
