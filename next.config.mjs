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
  experimental: {
    // Barrel-file tree-shaking: rewrites `import { x } from "pkg"` to import
    // straight from the submodule that actually defines `x`, so unused
    // exports never enter the client bundle. `recharts`, `lucide-react`, and
    // `date-fns` are already in Next's own default optimizePackageImports
    // list (see node_modules/next/dist/server/config.js) — no entry needed
    // here. `framer-motion` and `motion` (the ui/tasks components under
    // components/elastic-slider.tsx, components/ui/expandable-screen.tsx,
    // components/ui/dynamic-island.tsx, etc. import from both, see this
    // team's report) are NOT on that default list, so they're added
    // explicitly. This is config-only and behavior-preserving; it does not
    // by itself defer the animation *engine* out of the initial bundle —
    // see the report for the remaining next/dynamic + LazyMotion work in
    // files this team doesn't own.
    optimizePackageImports: ["framer-motion", "motion"],
  },
  // The OG image routes read public/brand assets via fs.readFileSync at
  // request time. The path is built with path.join(process.cwd(), ...),
  // which Next's build-time file tracing doesn't always resolve statically,
  // so the asset can be missing from the deployed serverless bundle
  // (ENOENT in production, works fine locally). Force it into every route's
  // trace explicitly.
  outputFileTracingIncludes: {
    "/**": ["./public/brand/**"],
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
