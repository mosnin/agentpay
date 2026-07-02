"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { ReputationScore } from "@/components/shared/reputation-score";
import { StarRating } from "@/components/shared/star-rating";
import { formatCurrency } from "@/lib/utils";

interface AgentSummary {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  verified: boolean;
  reputationScore: number;
  averageRating: number;
  reviewCount: number;
  startingPrice: number;
  currency: string;
  organization: string | null;
}

// Module-level cache so hovering the same agent across many rows fetches once.
const cache = new Map<string, AgentSummary>();

function parse(raw: unknown): AgentSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const trust = (a.trust ?? {}) as Record<string, unknown>;
  const pricing = (a.pricing ?? {}) as Record<string, unknown>;
  const org = a.organization as { name?: string } | null;
  if (!a.slug) return null;
  return {
    slug: String(a.slug),
    name: String(a.name ?? "Agent"),
    category: String(a.category ?? ""),
    shortDescription: String(a.short_description ?? ""),
    verified: Boolean(trust.verified),
    reputationScore: Number(trust.reputation_score ?? 0),
    averageRating: Number(a.average_rating ?? 0),
    reviewCount: Number(a.review_count ?? 0),
    startingPrice: Number(pricing.starting_price ?? 0),
    currency: String(pricing.currency ?? "USD"),
    organization: org?.name ?? null,
  };
}

/**
 * Wraps any agent-name reference so hovering reveals its trust profile —
 * reputation, rating, price — without navigating. The deep quick-view
 * (ExpandableScreen) is for committing; this is for glancing. Data is
 * lazy-fetched on first open from the public agent card and cached.
 */
export function AgentHoverCard({
  agentId,
  children,
}: {
  agentId: string;
  children: React.ReactNode;
}) {
  const [data, setData] = React.useState<AgentSummary | null>(
    () => cache.get(agentId) ?? null,
  );
  const [loading, setLoading] = React.useState(false);
  const requested = React.useRef(Boolean(cache.get(agentId)));

  const load = React.useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    setLoading(true);
    fetch(`/api/agents/${agentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        const parsed = parse(raw);
        if (parsed) {
          cache.set(agentId, parsed);
          setData(parsed);
        }
      })
      .catch(() => {
        requested.current = false; // allow a retry on next hover
      })
      .finally(() => setLoading(false));
  }, [agentId]);

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={(o) => o && load()}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        {data ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/agents/${data.slug}`}
                    className="truncate font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {data.name}
                  </Link>
                  {data.verified && <VerifiedBadge />}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {data.category}
                  {data.organization ? ` · ${data.organization}` : ""}
                </div>
              </div>
              <ReputationScore score={data.reputationScore} variant="inline" />
            </div>

            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {data.shortDescription}
            </p>

            <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
              {data.averageRating > 0 ? (
                <StarRating rating={data.averageRating} size="sm" showValue count={data.reviewCount} />
              ) : (
                <span className="text-muted-foreground">No reviews yet</span>
              )}
              <span className="font-medium text-foreground">
                {formatCurrency(data.startingPrice, data.currency)}
                <span className="font-normal text-muted-foreground"> start</span>
              </span>
            </div>

            <Link
              href={`/agents/${data.slug}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              View full profile
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2" aria-live="polite">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <span className="sr-only">{loading ? "Loading agent…" : "Agent preview"}</span>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
