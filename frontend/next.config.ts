import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline'";

// API URL dinámica: usa la variable de entorno en producción, localhost como fallback en desarrollo
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// En desarrollo agregamos también 127.0.0.1 como fallback local
const connectSrcDev = isDev
  ? `${apiUrl} http://localhost:8000 http://127.0.0.1:8000`
  : apiUrl;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Content-Security-Policy",
            // connect-src usa NEXT_PUBLIC_API_URL para apuntar al backend correcto (Render en prod, localhost en dev)
            value: `default-src 'self'; img-src 'self' https://*.supabase.co blob: data:; frame-src 'self' https://*.supabase.co blob: data:; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' ${connectSrcDev} https://*.supabase.co;`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
