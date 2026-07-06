import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, X } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AgentCard } from "@/components/marketplace/agent-card";
import { RecentlyViewed } from "@/components/agents/recently-viewed";
import { Button } from "@/components/ui/button";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { getAgentsPaginated, AGENTS_PAGE_SIZE, getCategoryCounts } from "@/lib/queries";
import type { AgentFilter } from "@/lib/queries";
import { CATEGORY_VALUES, MARKETPLACE_SORTS, PRICING_MODELS } from "@/lib/constants";
import type { MarketplaceSort } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Discover, compare, and hire specialized AI agents.",
};

import { ChevronLeft, ChevronRight } from "lucide-react";

type SearchParams = { [key: string]: string | string[] | undefined };

/** Coerce a possibly-array query param to a single trimmed string. */
function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

const VALID_SORTS = new Set<string>(MARKETPLACE_SORTS.map((s) => s.value));
const VALID_PRICING = new Set(["per_task", "subscription", "bounty", "hourly"]);
const VALID_CATEGORIES = new Set<string>(CATEGORY_VALUES);

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const q = one(sp.q);
  const categoryRaw = one(sp.category);
  const pricingRaw = one(sp.pricingModel);
  const minRatingRaw = one(sp.minRating);
  const sortRaw = one(sp.sort);
  const verified = one(sp.verified) === "true";
  const pageRaw = one(sp.page);
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);

  // Validate against known values so a hand-edited URL can't break the query.
  const category =
    categoryRaw && VALID_CATEGORIES.has(categoryRaw) ? categoryRaw : undefined;
  const pricingModel =
    pricingRaw && VALID_PRICING.has(pricingRaw) ? pricingRaw : undefined;
  const sort: MarketplaceSort | undefined =
    sortRaw && VALID_SORTS.has(sortRaw)
      ? (sortRaw as MarketplaceSort)
      : undefined;
  const parsedRating = minRatingRaw ? Number(minRatingRaw) : NaN;
  const minRating =
    Number.isFinite(parsedRating) && parsedRating > 0 ? parsedRating : undefined;

  const filter: AgentFilter = {
    q,
    category,
    pricingModel,
    minRating,
    verified: verified || undefined,
    sort,
  };

  const [{ agents, total: agentTotal }, categoryCounts] = await Promise.all([
    getAgentsPaginated(filter, page),
    getCategoryCounts(),
  ]);

  const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const totalPages = Math.ceil(agentTotal / AGENTS_PAGE_SIZE);
  const offset = (page - 1) * AGENTS_PAGE_SIZE;
  const hasFilters = Boolean(
    q || category || pricingModel || minRating || verified || (sort && sort !== "reputation"),
  );
  const pricingLabel = (v: string) =>
    PRICING_MODELS.find((p) => p.value === v)?.label ?? v;
  // Build a marketplace URL with one filter removed and the rest preserved (resets to page 1).
  const hrefWithout = (omit: string) => {
    const sp = new URLSearchParams();
    if (q && omit !== "q") sp.set("q", q);
    if (category && omit !== "category") sp.set("category", category);
    if (pricingModel && omit !== "pricingModel") sp.set("pricingModel", pricingModel);
    if (minRating && omit !== "minRating") sp.set("minRating", String(minRating));
    if (verified && omit !== "verified") sp.set("verified", "true");
    if (sort && sort !== "reputation") sp.set("sort", sort);
    const qs = sp.toString();
    return qs ? `/marketplace?${qs}` : "/marketplace";
  };
  // Build a marketplace URL changing only the page, preserving all other params.
  const hrefWithPage = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (pricingModel) sp.set("pricingModel", pricingModel);
    if (minRating) sp.set("minRating", String(minRating));
    if (verified) sp.set("verified", "true");
    if (sort && sort !== "reputation") sp.set("sort", sort);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/marketplace?${qs}` : "/marketplace";
  };
  const activeChips: { key: string; label: string }[] = [];
  if (q) activeChips.push({ key: "q", label: `“${q}”` });
  if (category) activeChips.push({ key: "category", label: category });
  if (pricingModel)
    activeChips.push({ key: "pricingModel", label: pricingLabel(pricingModel) });
  if (minRating) activeChips.push({ key: "minRating", label: `${minRating}★ & up` });
  if (verified) activeChips.push({ key: "verified", label: "Verified only" });

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <PageHeader
          title="Marketplace"
          description="Discover, compare, and hire specialized AI agents."
        />

        <div className="space-y-6">
          <RecentlyViewed />
          <MarketplaceFilters
            q={q}
            category={category}
            pricingModel={pricingModel}
            minRating={minRating ? String(minRating) : "0"}
            verified={verified}
            sort={sort ?? "reputation"}
            categoryCounts={categoryCounts}
            totalCount={total}
          />

          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeChips.map((c) => (
                <Link
                  key={c.key}
                  href={hrefWithout(c.key)}
                  aria-label={`Remove filter ${c.label}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {c.label}
                  <X className="h-3 w-3" />
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {agentTotal === 0 ? (
                <span className="font-medium text-foreground">0</span>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {formatNumber(offset + 1)}–{formatNumber(offset + agents.length)}
                  </span>
                  {" of "}
                  <span className="font-medium text-foreground">
                    {formatNumber(agentTotal)}
                  </span>
                </>
              )}{" "}
              {agentTotal === 1 ? "agent" : "agents"}
              {category && (
                <>
                  {" "}
                  in <span className="text-foreground">{category}</span>
                </>
              )}
              {q && (
                <>
                  {" "}
                  matching{" "}
                  <span className="text-foreground">&ldquo;{q}&rdquo;</span>
                </>
              )}
            </p>
            {hasFilters && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground"
              >
                <Link href="/marketplace">Clear filters</Link>
              </Button>
            )}
          </div>

          {agents.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No agents match your filters"
              description="Try a broader search, switch categories, or clear your filters to see the full marketplace."
              action={
                <Button asChild variant="outline">
                  <Link href="/marketplace">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
              {totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="flex items-center justify-center gap-3 pt-2"
                >
                  {page > 1 ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={hrefWithPage(page - 1)}>
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
                      <Link href={hrefWithPage(page + 1)}>
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
      </div>
    </SiteShell>
  );
}
