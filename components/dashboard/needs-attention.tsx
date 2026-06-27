import Link from "next/link";
import { ArrowRight, Bell, Lock, ScanSearch, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DeadlineBadge } from "@/components/shared/deadline-badge";

export interface NeedsAttentionItem {
  id: string;
  title: string;
  status: string;
  agentName: string | null;
  budget: number;
  currency: string;
  deadline: Date | string | null;
}

// The single next move the operator owns for each waiting state.
const NEXT_ACTION: Record<string, { label: string; icon: LucideIcon }> = {
  submitted: { label: "Run validation", icon: ScanSearch },
  validating: { label: "Complete & release", icon: Lock },
  completed: { label: "Leave a review", icon: Star },
};

export function NeedsAttention({ items }: { items: NeedsAttentionItem[] }) {
  // Don't show an empty "attention" box — it only earns its place when there's
  // genuinely something to do.
  if (items.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Needs your attention</CardTitle>
          <CardDescription>
            {items.length} task{items.length === 1 ? "" : "s"} waiting on your next move.
          </CardDescription>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <Bell className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border/60">
          {items.map((item) => {
            const action = NEXT_ACTION[item.status] ?? {
              label: "Open task",
              icon: ArrowRight,
            };
            const Icon = action.icon;
            return (
              <li key={item.id}>
                <Link
                  href={`/tasks/${item.id}`}
                  className="group -mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="truncate">
                        {item.agentName ?? "Unassigned"} ·{" "}
                        {formatCurrency(item.budget, item.currency)}
                      </span>
                      {item.status !== "completed" && item.deadline && (
                        <DeadlineBadge deadline={item.deadline} urgentOnly />
                      )}
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <Icon className="h-3.5 w-3.5" />
                    {action.label}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
