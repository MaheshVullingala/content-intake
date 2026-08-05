/** @type {import('next').NextConfig} */

// Derive the Supabase origin from NEXT_PUBLIC_SUPABASE_URL so the CSP
// below works against whatever Supabase instance is actually configured
// — the current cloud project today, a self-hosted instance on the
// internal VM later — without needing a code change when the URL
// changes. Previously this was hardcoded to https://*.supabase.co /
// https://*.supabase.in, which would silently block every API call and
// image load once NEXT_PUBLIC_SUPABASE_URL points at an internal domain
// instead (the browser enforces CSP regardless of where the request
// would otherwise succeed). Falls back to the public cloud domains only
// if the env var is unset at build time, so a misconfigured build fails
// safe rather than opening the CSP wide.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
let supabaseOrigin   = "https://*.supabase.co https://*.supabase.in";
let supabaseWsOrigin = "wss://*.supabase.co";
try {
  const { protocol, host } = new URL(supabaseUrl);
  supabaseOrigin   = `${protocol}//${host}`;
  supabaseWsOrigin = `${protocol === "https:" ? "wss:" : "ws:"}//${host}`;
} catch {
  // NEXT_PUBLIC_SUPABASE_URL not set/parseable at build time — keep the
  // cloud fallback above.
}

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
              `img-src 'self' data: blob: ${supabaseOrigin}`,
              `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin} https://api.anthropic.com`,
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
