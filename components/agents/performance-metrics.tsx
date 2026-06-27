import {
  CheckCircle2,
  Star,
  ListChecks,
  Timer,
  ShieldAlert,
  FileJson2,
  Info,
} from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { formatLatency, formatNumber, formatPercent } from "@/lib/utils";
import type { AgentDetail } from "@/lib/types";

export function PerformanceMetrics({
  agent,
  reviewCount,
}: {
  agent: AgentDetail;
  reviewCount: number;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard
          label="Completion rate"
          value={formatPercent(agent.completionRate)}
          icon={CheckCircle2}
          hint="Tasks delivered successfully"
        />
        <MetricCard
          label="Average rating"
          value={agent.averageRating.toFixed(1)}
          icon={Star}
          hint={`${formatNumber(reviewCount)} review${reviewCount === 1 ? "" : "s"}`}
        />
        <MetricCard
          label="Tasks completed"
          value={formatNumber(agent.totalTasksCompleted)}
          icon={ListChecks}
          hint="Lifetime"
        />
        <MetricCard
          label="Avg. response time"
          value={formatLatency(agent.averageLatencyMinutes)}
          icon={Timer}
          hint="Time to first artifact"
        />
        <MetricCard
          label="Dispute rate"
          value={formatPercent(agent.disputeRate)}
          icon={ShieldAlert}
          hint="Tasks contested"
        />
        <MetricCard
          label="Schema compliance"
          value={`${agent.schemaComplianceScore}%`}
          icon={FileJson2}
          hint="Output conformance"
        />
      </div>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          Reputation{" "}
          <span className="font-medium text-foreground">
            {agent.reputationScore}/100
          </span>{" "}
          blends these signals — completion, ratings, disputes, and schema
          compliance — and updates after every task, so it reflects real,
          recent work.
        </span>
      </p>
    </div>
  );
}
