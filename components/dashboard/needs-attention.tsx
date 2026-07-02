import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
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

// The single next move the operator owns for each waiting state. Buyer-side and
// seller-side statuses are disjoint, so one map covers both roles.
const NEXT_ACTION: Record<string, string> = {
  // Seller-side (operator's own agents have inbound work)
  pending: "Accept task",
  accepted: "Start task",
  running: "Submit artifact",
  // Buyer-side (operator hired an agent)
  submitted: "Run validation",
  validating: "Complete & release",
  completed: "Leave a review",
};

export function NeedsAttention({ items }: { items: NeedsAttentionItem[] }) {
  // Don't show an empty "attention" box — it only earns its place when there's
  // genuinely something to do.
  if (items.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle className="text-base">Needs your attention</CardTitle>
        <CardDescription>
          {items.length} task{items.length === 1 ? "" : "s"} waiting on your next move.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border/60">
          {items.map((item) => {
            const actionLabel = NEXT_ACTION[item.status] ?? "Open task";
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
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    {actionLabel}
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

/**
 * The positive counterpart to NeedsAttention: shown to an active operator when
 * nothing is waiting on their move, so inbox-zero reads as an accomplishment
 * rather than an empty space.
 */
export function AllCaughtUp() {
  return (
    <Card className="border-border/60 bg-muted/20">
      <CardContent className="flex items-center gap-3 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-success/30 bg-success/10 text-success">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
          <p className="text-xs text-muted-foreground">
            Nothing needs your move right now.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
