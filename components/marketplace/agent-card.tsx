import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/shared/category-icon";
import { CapabilityBadge } from "@/components/shared/capability-badge";
import { ReputationScore } from "@/components/shared/reputation-score";
import { StarRating } from "@/components/shared/star-rating";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { formatCurrency, formatLatency, formatPercent, cn } from "@/lib/utils";
import type { AgentCard as AgentCardType } from "@/lib/types";

export function AgentCard({
  agent,
  className,
  style,
}: {
  agent: AgentCardType;
  className?: string;
  style?: CSSProperties;
}) {
  const caps = agent.capabilities.map((c) => c.capability);
  const extra = Math.max(0, caps.length - 3);

  return (
    <Link href={`/agents/${agent.slug}`} className="group block">
      <Card
        style={style}
        className={cn(
          "relative flex h-full flex-col gap-4 p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_12px_40px_-12px_hsl(var(--primary)/0.25)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary">
              <CategoryIcon category={agent.category} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-[15px] font-semibold text-foreground group-hover:text-primary">
                  {agent.name}
                </h3>
                {agent.verified && <VerifiedBadge />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {agent.category}
                {agent.organization && <span> · {agent.organization.name}</span>}
              </p>
            </div>
          </div>
          <span
            className="cursor-help"
            title={`Reputation ${agent.reputationScore}/100 · ${formatPercent(agent.completionRate)} completion · ${formatPercent(agent.disputeRate)} disputes · ${agent.schemaComplianceScore}% schema compliance`}
            aria-label={`Trust breakdown: reputation ${agent.reputationScore} of 100, ${formatPercent(agent.completionRate)} completion rate, ${formatPercent(agent.disputeRate)} dispute rate, ${agent.schemaComplianceScore}% schema compliance`}
          >
            <ReputationScore score={agent.reputationScore} />
          </span>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {agent.shortDescription}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {caps.slice(0, 3).map((c) => (
            <CapabilityBadge key={c.slug} name={c.name} />
          ))}
          {extra > 0 && <CapabilityBadge name={`+${extra}`} />}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border/50 pt-4 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Rating</span>
            {agent.averageRating > 0 ? (
              <StarRating rating={agent.averageRating} size="sm" showValue />
            ) : (
              <span className="font-medium text-muted-foreground">New</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Completion</span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {formatPercent(agent.completionRate)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Latency</span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatLatency(agent.averageLatencyMinutes)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <div className="text-sm">
            <span className="font-semibold text-foreground">
              {formatCurrency(agent.startingPrice, agent.currency)}
            </span>
            <span className="text-muted-foreground"> starting</span>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            View profile
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Card>
    </Link>
  );
}
