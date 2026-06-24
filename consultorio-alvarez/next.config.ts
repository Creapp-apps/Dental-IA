import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: ["192.168.1.4:3000", "localhost:3000"]
    }
  }
};

export default nextConfig;
