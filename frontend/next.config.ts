import type { NextConfig } from "next";

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
            // Allowed sources: self, supabase (for images and auth), localhost:8000 (fastapi)
            value: "default-src 'self'; img-src 'self' https://*.supabase.co blob: data:; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://*.supabase.co;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
