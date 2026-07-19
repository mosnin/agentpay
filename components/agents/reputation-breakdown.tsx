import { History } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import { REPUTATION_HALF_LIFE_DAYS } from "@/lib/reputation";
import {
  formatLatency,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "@/lib/utils";

/**
 * Narrow, self-contained stat shape for ReputationBreakdown — every field
 * maps 1:1 to a real Agent column written by lib/reputation.ts
 * (recalcAgentDerivedStats / recordReputationEvent), never a seeded or
 * hand-entered number. An AgentDetail (or any object that structurally
 * satisfies this) can be passed straight through as `stats`.
 */
export interface ReputationBreakdownStats {
  reputationScore: number;
  completionRate: number; // 0..1, share of assigned tasks that reached "completed"
  disputeRate: number; // 0..1, share of assigned tasks EVER disputed (lifetime)
  averageLatencyMinutes: number; // task creation -> first delivered artifact
  averageRating: number; // 0..5, mean of real Review rows
  totalTasksCompleted: number;
  reputationUpdatedAt: Date | string | null;
}

function freshnessLabel(updatedAt: Date | string | null): string {
  if (!updatedAt) return "Not yet recomputed from task history.";
  return `Last recomputed ${formatRelativeTime(updatedAt)}.`;
}

/**
 * Shows the REAL derivation behind an agent's reputation: real completion /
 * dispute rates, real latency, real review count, and an explicit note that
 * the headline score decays toward recent performance rather than being a
 * flat, permanent number. Purely presentational — the caller fetches
 * `stats` (typically the Agent row itself) and passes it straight in.
 */
export function ReputationBreakdown({
  stats,
  reviewCount,
  className,
}: {
  stats: ReputationBreakdownStats;
  reviewCount: number;
  className?: string;
}) {
  const hasTaskHistory = stats.totalTasksCompleted > 0;
  const hasReviews = reviewCount > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Reputation breakdown</CardTitle>
        <CardDescription>
          {hasTaskHistory || hasReviews
            ? `Based on ${formatNumber(stats.totalTasksCompleted)} completed task${stats.totalTasksCompleted === 1 ? "" : "s"} and ${formatNumber(reviewCount)} review${reviewCount === 1 ? "" : "s"}.`
            : "No completed tasks yet — these metrics populate as soon as this agent delivers real work."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <MetricCard
            label="Completion rate"
            value={hasTaskHistory ? formatPercent(stats.completionRate) : "—"}
            hint="Completed vs. total assigned"
          />
          <MetricCard
            label="Dispute rate"
            value={hasTaskHistory ? formatPercent(stats.disputeRate) : "—"}
            hint="Ever contested by a buyer"
          />
          <MetricCard
            label="Avg. latency"
            value={hasTaskHistory ? formatLatency(stats.averageLatencyMinutes) : "—"}
            hint="Time to first artifact"
          />
          <MetricCard
            label="Reviews"
            value={formatNumber(reviewCount)}
            hint={hasReviews ? `${stats.averageRating.toFixed(1)}★ average` : "No reviews yet"}
          />
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
          <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span>
            Reputation{" "}
            <span className="font-medium text-foreground">{stats.reputationScore}/100</span>{" "}
            weighs recent task history more heavily than old activity — it decays on a{" "}
            {REPUTATION_HALF_LIFE_DAYS}-day half-life, so this reflects how the agent is
            performing lately, not just its all-time record. {freshnessLabel(stats.reputationUpdatedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
