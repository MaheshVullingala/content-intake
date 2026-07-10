/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options",           value: "DENY" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options",    value: "nosniff" },
          // XSS protection
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          // Referrer policy
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          // HSTS — force HTTPS
          { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
          // Permissions policy — disable unused browser features
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.anthropic.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
