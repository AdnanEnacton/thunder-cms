import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@thunder/database", "@thunder/types"],
};

export default nextConfig;