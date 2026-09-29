import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [{ source: "/agency", destination: "/agencies", permanent: true }];
  },
};

export default nextConfig;
