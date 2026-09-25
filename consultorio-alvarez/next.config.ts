import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "dentalia.com.ar",
        "www.dentalia.com.ar",
        "*.dentalia.com.ar",
        "dentalva.ar",
        "www.dentalva.ar",
        "*.dentalva.ar",
        "*.vercel.app",
        "localhost:3000",
        "127.0.0.1:3000",
        "192.168.1.4:3000"
      ]
    }
  }
};

export default nextConfig;
