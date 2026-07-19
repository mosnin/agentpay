import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Lists the public, crawlable surface: the discovery pages, every category
// landing page (app/marketplace/[category]), plus every live agent profile,
// so the marketplace and its listings are indexable.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    select: { slug: true, category: true, updatedAt: true },
    orderBy: { reputationScore: "desc" },
  });

  // The home + marketplace freshness tracks the catalog: the most recent agent
  // update. (Developers is static docs with no tracked change date, so it's left
  // without a lastModified rather than faking "now" on every crawl.)
  const latestAgentUpdate = agents.reduce<Date | undefined>(
    (latest, a) => (!latest || a.updatedAt > latest ? a.updatedAt : latest),
    undefined,
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: latestAgentUpdate, changeFrequency: "daily", priority: 1 },
    {
      url: `${BASE}/marketplace`,
      lastModified: latestAgentUpdate,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    { url: `${BASE}/developers`, changeFrequency: "weekly", priority: 0.6 },
  ];

  // One SEO landing page per category (app/marketplace/[category]).
  // Freshness tracks the most recently updated agent *within that category*
  // specifically, falling back to the catalog-wide freshness for a category
  // with no active agents yet rather than an undefined date.
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((category) => {
    const latestInCategory = agents
      .filter((a) => a.category === category.value)
      .reduce<Date | undefined>(
        (latest, a) => (!latest || a.updatedAt > latest ? a.updatedAt : latest),
        undefined,
      );
    return {
      url: `${BASE}/marketplace/${slugify(category.value)}`,
      lastModified: latestInCategory ?? latestAgentUpdate,
      changeFrequency: "daily" as const,
      priority: 0.85,
    };
  });

  const agentRoutes: MetadataRoute.Sitemap = agents.map((a) => ({
    url: `${BASE}/agents/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...agentRoutes];
}
