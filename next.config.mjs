/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// When Clerk is configured, the CSP must admit its frontend API, avatar CDN,
// telemetry, and the Cloudflare Turnstile bot-protection frame it embeds.
// Development instances live on *.clerk.accounts.dev; production instances
// use a Frontend API host on your own domain (clerk.<your-domain>). A
// subdomain is not covered by 'self'; admit the exact publishable-key host. Directives stay strict when keyless.
const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const clerkHost = (() => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const host = Buffer.from(key.replace(/^pk_(test|live)_/, ""), "base64")
    .toString("utf8")
    .replace(/\$$/, "");
  return /^[a-zA-Z0-9.-]+$/.test(host) && host.includes(".")
    ? ` https://${host}`
    : "";
})();
const clerkScript = hasClerk
  ? `${clerkHost} https://*.clerk.accounts.dev https://challenges.cloudflare.com https://*.protect.clerk.com`
  : "";
const clerkConnect = hasClerk
  ? `${clerkHost} https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.protect.clerk.com:*`
  : "";
const clerkImg = hasClerk ? " https://img.clerk.com" : "";
const hasPrivy = hasClerk && Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
const privyConnect = hasPrivy
  ? " https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com"
  : "";
const clerkFrame = hasClerk
  ? `frame-src https://challenges.cloudflare.com${hasPrivy ? " https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org" : ""}`
  : "";

const CSP = [
  "default-src 'self'",
  // unsafe-eval is required only by dev HMR — production ships without it.
  // unsafe-inline remains for Next.js's inline bootstrap scripts (a nonce
  // strategy requires per-request CSP via middleware; revisit post-MVP).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${clerkScript}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://avatars.githubusercontent.com https://images.unsplash.com${clerkImg}`,
  "font-src 'self'",
  `connect-src 'self'${clerkConnect}${privyConnect}`,
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
  webpack(config) {
    // Optional for space-constrained CI/local builds; no runtime behavior changes.
    if (process.env.BIDS_BUILD_NO_CACHE === "1") config.cache = false;
    return config;
  },
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
  // NOTE: an `experimental.optimizePackageImports: ["framer-motion", "motion"]`
  // entry was trialed here for barrel-file tree-shaking, but the optimizer
  // mis-maps some of the `motion` package's re-exports (e.g. `usePageInView`,
  // used by components/logos-carousel.tsx) and broke the production prerender
  // of "/". The gain was modest and this app imports motion via `motion/react`
  // anyway, so it's removed. Next already optimizes recharts/lucide-react/
  // date-fns by default; the real motion win is the next/dynamic split of the
  // heavy islands (see components/tasks/task-status-island.tsx).
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
