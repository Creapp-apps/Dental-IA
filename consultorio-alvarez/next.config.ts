import type { NextConfig } from "next";

// DT-007: headers de seguridad para todas las rutas (incluye / y /login).
// CSP permisiva a propósito (mantiene 'unsafe-inline'/'unsafe-eval' para no romper
// Next/PWA); agrega frame-ancestors/object-src/base-uri. Una CSP estricta con nonce
// queda como follow-up. Permissions-Policy deja camera/microphone en self (fotos/escaneos).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self' https:",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=(), payment=(self), usb=(), bluetooth=(), serial=(), magnetometer=(), gyroscope=(), accelerometer=()',
  },
]

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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
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
        "192.168.1.14:3000",
        "192.168.1.14",
        "192.168.1.4:3000",
        "192.168.1.4",
        "*.local:3000",
        "*.local"
      ]
    }
  }
};

export default nextConfig;
