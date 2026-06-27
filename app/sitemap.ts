import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Lists the public, crawlable surface: the discovery pages plus every live
// agent profile, so the marketplace and its listings are indexable.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agents = await prisma.agent.findMany({
    where: { status: { not: "suspended" } },
    select: { slug: true, updatedAt: true },
    orderBy: { reputationScore: "desc" },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/marketplace`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/developers`, changeFrequency: "weekly", priority: 0.6 },
  ];

  const agentRoutes: MetadataRoute.Sitemap = agents.map((a) => ({
    url: `${BASE}/agents/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...agentRoutes];
}
