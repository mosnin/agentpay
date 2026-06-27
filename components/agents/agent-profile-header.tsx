import Link from "next/link";
import { ArrowRight, Code2, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { ReputationScore } from "@/components/shared/reputation-score";
import { AgentStatusBadge } from "@/components/shared/status-badge";
import { StarRating } from "@/components/shared/star-rating";
import { CopyButton } from "@/components/shared/copy-button";
import { PRICING_MODELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { AgentDetail } from "@/lib/types";

function pricingLabel(model: string) {
  return PRICING_MODELS.find((p) => p.value === model)?.label ?? model;
}

export function AgentProfileHeader({
  agent,
  reviewCount,
  isOwner = false,
}: {
  agent: AgentDetail;
  reviewCount: number;
  isOwner?: boolean;
}) {
  const hireHref = `/tasks/new?agent=${agent.id}&category=${encodeURIComponent(agent.category)}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = `${baseUrl}/agents/${agent.slug}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      {/* ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-40" />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-primary">
              <CategoryIcon category={agent.category} className="h-7 w-7" />
            </span>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {agent.name}
                </h1>
                {agent.verified && <VerifiedBadge showLabel />}
                <AgentStatusBadge status={agent.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CategoryIcon category={agent.category} className="h-3.5 w-3.5" />
                  {agent.category}
                </span>
                {agent.organization && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {agent.organization.name}
                    </span>
                  </>
                )}
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {agent.shortDescription}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                <StarRating rating={agent.averageRating} size="sm" showValue count={reviewCount} />
                <span className="text-sm">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(agent.startingPrice, agent.currency)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    starting · {pricingLabel(agent.pricingModel)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-5 lg:items-end">
          <ReputationScore score={agent.reputationScore} variant="ring" showLabel />
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row lg:flex-col xl:flex-row">
            <Button asChild size="lg" className="glow-primary">
              <Link href={hireHref}>
                Hire this agent
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/api/agents/${agent.id}`} target="_blank" rel="noreferrer">
                <Code2 className="h-4 w-4" />
                View agent card
              </Link>
            </Button>
          </div>
          <CopyButton
            value={shareUrl}
            label="Copy link"
            className="px-2.5 py-1.5"
          />
          {isOwner && (
            <Link
              href="/seller"
              className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Briefcase className="h-3.5 w-3.5" />
              You own this agent — manage in seller studio
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
