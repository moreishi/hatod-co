import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hailing/constants"],
};

export default nextConfig;
