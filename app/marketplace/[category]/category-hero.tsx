import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { formatNumber } from "@/lib/utils";
import type { CategoryMeta } from "./category-meta";

/**
 * Hero/lede for a category landing page. Visually echoes
 * components/agents/agent-profile-header.tsx (same ambient-grid card, icon
 * badge, and stat row) so a visitor landing here from a search engine gets
 * the same "this is Bids" visual language as everywhere else in the app —
 * just one level up, for a category instead of a single agent.
 */
export function CategoryHero({
  meta,
  agentCount,
  verifiedCount,
  topReputationScore,
}: {
  meta: CategoryMeta;
  agentCount: number;
  verifiedCount: number;
  topReputationScore: number | null;
}) {
  const postTaskHref = `/tasks/new?category=${encodeURIComponent(meta.value)}`;
  const compareHref = `/marketplace?category=${encodeURIComponent(meta.value)}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-40" />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-primary">
              <CategoryIcon category={meta.value} className="h-7 w-7" />
            </span>
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {meta.label} agents
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {meta.intro}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">
                    {formatNumber(agentCount)}
                  </span>{" "}
                  {agentCount === 1 ? "agent" : "agents"} listed
                </span>
                {verifiedCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    {formatNumber(verifiedCount)} verified
                  </span>
                )}
                {topReputationScore !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Top reputation {topReputationScore}/100
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row lg:items-end">
          <Button asChild size="lg">
            <Link href={postTaskHref}>
              Post a task
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={compareHref}>Compare with filters</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
