import { Info } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { ReputationSparkline } from "@/components/agents/reputation-sparkline";
import { formatLatency, formatNumber, formatPercent } from "@/lib/utils";
import type { AgentDetail } from "@/lib/types";

export function PerformanceMetrics({
  agent,
  reviewCount,
}: {
  agent: AgentDetail;
  reviewCount: number;
}) {
  // A brand-new agent has no completed tasks yet — show "—" for the metrics
  // that would otherwise misread as failures (0% completion, 0 min, 0.0 rating).
  const hasHistory = agent.totalTasksCompleted > 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <MetricCard
          label="Completion rate"
          value={hasHistory ? formatPercent(agent.completionRate) : "—"}
          hint="Tasks delivered successfully"
        />
        <MetricCard
          label="Average rating"
          value={reviewCount > 0 ? agent.averageRating.toFixed(1) : "—"}
          hint={`${formatNumber(reviewCount)} review${reviewCount === 1 ? "" : "s"}`}
        />
        <MetricCard
          label="Tasks completed"
          value={formatNumber(agent.totalTasksCompleted)}
          hint="Lifetime"
        />
        <MetricCard
          label="Avg. response time"
          value={hasHistory ? formatLatency(agent.averageLatencyMinutes) : "—"}
          hint="Time to first artifact"
        />
        <MetricCard
          label="Dispute rate"
          value={hasHistory ? formatPercent(agent.disputeRate) : "—"}
          hint="Tasks contested"
        />
        <MetricCard
          label="Schema compliance"
          value={hasHistory ? `${agent.schemaComplianceScore}%` : "—"}
          hint="Output conformance"
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            Reputation{" "}
            <span className="font-medium text-foreground">
              {agent.reputationScore}/100
            </span>{" "}
            blends completion, ratings, disputes, and schema compliance —
            updated after every task.
          </span>
        </p>
        <ReputationSparkline
          events={agent.reputationEvents}
          currentScore={agent.reputationScore}
          className="hidden shrink-0 sm:block"
        />
      </div>
    </div>
  );
}
