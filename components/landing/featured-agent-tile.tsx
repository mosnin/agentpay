"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
} from "@/components/ui/expandable-screen";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { StarRating } from "@/components/shared/star-rating";
import { ReputationScore } from "@/components/shared/reputation-score";
import { CapabilityBadge } from "@/components/shared/capability-badge";
import type { AgentCard } from "@/lib/types";
import { formatCurrency, formatLatency, formatPercent } from "@/lib/utils";

/**
 * Landing tile that morphs into a full-screen agent quick view
 * (ExpandableScreen). The tile and the screen share one surface, so the
 * expansion reads as the card growing — not a modal appearing.
 */
export function FeaturedAgentTile({ agent }: { agent: AgentCard }) {
  const capabilities = agent.capabilities.map((c) => c.capability);

  return (
    <ExpandableScreen
      layoutId={`featured-agent-${agent.id}`}
      triggerRadius="16px"
      contentRadius="24px"
    >
      <ExpandableScreenTrigger
        className="h-full"
        backgroundClassName="border border-border/60 bg-card transition-colors hover:border-primary/40"
      >
        <div className="flex h-full flex-col gap-4 p-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary">
              <CategoryIcon category={agent.category} className="h-5 w-5" />
            </span>
            <ReputationScore score={agent.reputationScore} variant="inline" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-foreground">{agent.name}</span>
              {agent.verified && <VerifiedBadge />}
            </div>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {agent.shortDescription}
            </p>
          </div>
          <div className="mt-auto flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {formatCurrency(agent.startingPrice, agent.currency)}
              <span className="font-normal text-muted-foreground"> starting</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              Quick view
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </ExpandableScreenTrigger>

      <ExpandableScreenContent
        className="border border-border/60 bg-card"
        closeButtonClassName="text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-6 py-14 sm:px-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-primary">
                <CategoryIcon category={agent.category} className="h-7 w-7" />
              </span>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                    {agent.name}
                  </h3>
                  {agent.verified && <VerifiedBadge showLabel />}
                </div>
                <div className="text-sm text-muted-foreground">
                  {agent.category}
                  {agent.organization ? ` · ${agent.organization.name}` : ""}
                </div>
                {agent.averageRating > 0 && (
                  <StarRating rating={agent.averageRating} size="sm" showValue />
                )}
              </div>
            </div>
            <ReputationScore score={agent.reputationScore} variant="ring" showLabel />
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {agent.longDescription}
          </p>

          {capabilities.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Capabilities
              </div>
              <div className="flex flex-wrap gap-1.5">
                {capabilities.map((c) => (
                  <CapabilityBadge key={c.slug} name={c.name} />
                ))}
              </div>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Completion</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {agent.totalTasksCompleted > 0
                  ? formatPercent(agent.completionRate)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tasks done</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {agent.totalTasksCompleted}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> Latency
              </dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {agent.totalTasksCompleted > 0
                  ? formatLatency(agent.averageLatencyMinutes)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Starting at</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(agent.startingPrice, agent.currency)}
              </dd>
            </div>
          </dl>

          <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-border/60 pt-6">
            <Button asChild>
              <Link href={`/tasks/new?agent=${agent.id}&category=${encodeURIComponent(agent.category)}`}>
                Hire this agent
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/agents/${agent.slug}`}>View full profile</Link>
            </Button>
          </div>
        </div>
      </ExpandableScreenContent>
    </ExpandableScreen>
  );
}
