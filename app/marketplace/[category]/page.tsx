import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { AgentCard } from "@/components/marketplace/agent-card";
import { Button } from "@/components/ui/button";
import { getAgents, getAgentsPaginated, AGENTS_PAGE_SIZE } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import { CATEGORY_META, getCategoryBySlug } from "./category-meta";
import { CategoryHero } from "./category-hero";
import { RelatedCategories } from "./related-categories";

// Fixed, finite taxonomy (lib/constants.ts#CATEGORIES) — every valid route is
// already enumerated by generateStaticParams, so an unlisted slug is never a
// "not yet generated" page, it's a 404. Unlike /agents/[id] (open-ended,
// grows with the catalog), this route set never grows without a code change.
export const dynamicParams = false;

type SearchParams = { [key: string]: string | string[] | undefined };

export function generateStaticParams() {
  return CATEGORY_META.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const meta = getCategoryBySlug(slug);
  if (!meta) return { title: "Category not found" };

  // Bare title — the root layout template appends " — Bids".
  const title = `${meta.label} agents`;
  const description = `Hire vetted ${meta.label.toLowerCase()} agents on Bids. ${meta.intro}`;
  const url = `/marketplace/${meta.slug}`;
  const shareTitle = `${title} · Bids`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "Bids", url, title: shareTitle, description },
    twitter: { card: "summary_large_image", title: shareTitle, description },
  };
}

function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

function hrefWithPage(slug: string, page: number): string {
  return page > 1 ? `/marketplace/${slug}?page=${page}` : `/marketplace/${slug}`;
}

export default async function CategoryMarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ category: slug }, sp] = await Promise.all([params, searchParams]);
  const meta = getCategoryBySlug(slug);
  if (!meta) notFound();

  const pageRaw = one(sp.page);
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);

  // Two fetches, both reusing lib/queries.ts helpers (never edited here):
  // the paginated slice for the grid, and the full (unpaginated) category
  // roster for the hero's verified-count / top-reputation stats — those need
  // to reflect the *whole* category, not just whatever page the visitor is
  // on, and getAgentsPaginated's own `total` only covers the count, not the
  // per-agent fields those stats are derived from.
  const [{ agents }, categoryAgents] = await Promise.all([
    getAgentsPaginated({ category: meta.value, sort: "reputation" }, page),
    getAgents({ category: meta.value, sort: "reputation" }),
  ]);

  const total = categoryAgents.length;
  const verifiedCount = categoryAgents.filter((a) => a.verified).length;
  const topReputationScore = categoryAgents[0]?.reputationScore ?? null;
  const totalPages = Math.max(1, Math.ceil(total / AGENTS_PAGE_SIZE));
  const offset = (page - 1) * AGENTS_PAGE_SIZE;

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <nav className="mb-5 flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/marketplace" className="transition-colors hover:text-foreground">
            Marketplace
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">{meta.label}</span>
        </nav>

        <div className="space-y-8">
          <CategoryHero
            meta={meta}
            agentCount={total}
            verifiedCount={verifiedCount}
            topReputationScore={topReputationScore}
          />

          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {total === 0 ? (
                  <span className="font-medium text-foreground">0</span>
                ) : (
                  <>
                    <span className="font-medium text-foreground">
                      {formatNumber(offset + 1)}–{formatNumber(offset + agents.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">{formatNumber(total)}</span>
                  </>
                )}{" "}
                {total === 1 ? "agent" : "agents"} in {meta.label}
              </p>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground"
              >
                <Link href={`/marketplace?category=${encodeURIComponent(meta.value)}`}>
                  Sort &amp; filter
                </Link>
              </Button>
            </div>

            {agents.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title={`No ${meta.label.toLowerCase()} agents listed yet`}
                description="Check back soon, or browse the full marketplace to see everything currently live."
                action={
                  <Button asChild variant="outline">
                    <Link href="/marketplace">Browse marketplace</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent, i) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500"
                      style={{ animationDelay: `${i * 60}ms` }}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav
                    aria-label="Pagination"
                    className="flex items-center justify-center gap-3 pt-6"
                  >
                    {page > 1 ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={hrefWithPage(meta.slug, page - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    {page < totalPages ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={hrefWithPage(meta.slug, page + 1)}>
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>

          <RelatedCategories categories={CATEGORY_META} currentSlug={meta.slug} />
        </div>
      </div>
    </SiteShell>
  );
}
