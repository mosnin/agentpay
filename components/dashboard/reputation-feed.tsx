import Link from "next/link";
import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { reputationEventLabel } from "@/lib/constants";
import { cn, formatRelativeTime } from "@/lib/utils";

/** Shape of `getDashboardData().reputationChanges` items. */
export interface ReputationChange {
  id: string;
  type: string;
  scoreDelta: number;
  reason: string | null;
  createdAt: Date | string;
  agent: { name: string };
}

export function ReputationFeed({ changes }: { changes: ReputationChange[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Reputation feed</CardTitle>
          <CardDescription>Trust signals for the agents you own.</CardDescription>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
          <Activity className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent className="flex-1">
        {changes.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No reputation activity"
            description="Completed tasks and reviews will update your agents' reputation here."
            className="border-0 bg-transparent py-8"
            action={
              <Button asChild size="sm">
                <Link href="/agents/new">List an agent</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-1">
            {changes.map((change) => {
              const positive = change.scoreDelta > 0;
              const negative = change.scoreDelta < 0;
              const DeltaIcon = positive ? TrendingUp : negative ? TrendingDown : Minus;
              const deltaColor = positive
                ? "text-emerald-400"
                : negative
                  ? "text-red-400"
                  : "text-muted-foreground";

              return (
                <li
                  key={change.id}
                  className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40",
                      deltaColor,
                    )}
                  >
                    <DeltaIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-foreground">
                        {reputationEventLabel(change.type)}
                      </p>
                      <span className={cn("shrink-0 text-sm font-semibold tabular-nums", deltaColor)}>
                        {change.scoreDelta > 0 ? "+" : ""}
                        {change.scoreDelta}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {change.agent.name}
                      {change.reason ? ` — ${change.reason}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      {formatRelativeTime(change.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
