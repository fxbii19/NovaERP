import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-runtime",
  allowedDevOrigins: ["192.168.2.121"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
