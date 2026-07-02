/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// When Clerk is configured, the CSP must admit its frontend API, avatar CDN,
// telemetry, and the Cloudflare Turnstile bot-protection frame it embeds.
// Development instances live on *.clerk.accounts.dev; production instances
// use a Frontend API host on your own domain (clerk.<your-domain>) — covered
// by 'self' plus the wildcard below. Directives stay strict when keyless.
const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const clerkScript = hasClerk
  ? " https://*.clerk.accounts.dev https://challenges.cloudflare.com"
  : "";
const clerkConnect = hasClerk
  ? " https://*.clerk.accounts.dev https://clerk-telemetry.com"
  : "";
const clerkImg = hasClerk ? " https://img.clerk.com" : "";
const clerkFrame = hasClerk ? "frame-src https://challenges.cloudflare.com" : "";

const CSP = [
  "default-src 'self'",
  // unsafe-eval is required only by dev HMR — production ships without it.
  // unsafe-inline remains for Next.js's inline bootstrap scripts (a nonce
  // strategy requires per-request CSP via middleware; revisit post-MVP).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${clerkScript}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://avatars.githubusercontent.com https://images.unsplash.com${clerkImg}`,
  "font-src 'self'",
  `connect-src 'self'${clerkConnect}`,
  hasClerk ? "worker-src 'self' blob:" : "",
  clerkFrame,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
