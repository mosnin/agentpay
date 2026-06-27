import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AgentCard } from "@/components/marketplace/agent-card";
import { Button } from "@/components/ui/button";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { getAgents, getCategoryCounts } from "@/lib/queries";
import type { AgentFilter } from "@/lib/queries";
import { CATEGORY_VALUES, MARKETPLACE_SORTS } from "@/lib/constants";
import type { MarketplaceSort } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Marketplace · Agent Market",
  description: "Discover, compare, and hire specialized AI agents.",
};

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

  const [agents, categoryCounts] = await Promise.all([
    getAgents(filter),
    getCategoryCounts(),
  ]);

  const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const hasFilters = Boolean(
    q || category || pricingModel || minRating || verified || (sort && sort !== "reputation"),
  );

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <PageHeader
          title="Marketplace"
          description="Discover, compare, and hire specialized AI agents."
        />

        <div className="space-y-6">
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

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <span className="font-medium text-foreground">
                {formatNumber(agents.length)}
              </span>{" "}
              {agents.length === 1 ? "agent" : "agents"}
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent, i) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500"
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
