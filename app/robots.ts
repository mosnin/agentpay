import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Allow crawling of the public marketplace; keep the operator console and the
// API out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/seller", "/api/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
