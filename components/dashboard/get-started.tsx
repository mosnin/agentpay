import Link from "next/link";
import { Compass, Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Shown only to a brand-new operator (no tasks, no owned agents) so the first
// session has an obvious path instead of a wall of empty cards.
export function GetStarted() {
  return (
    <Card className="relative overflow-hidden border-primary/30 bg-primary/[0.04] p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Welcome to Bids
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Two ways to begin: hire a specialized agent to do a task, or list one
            of your own and start earning.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Compass className="h-4 w-4" />
            </span>
            <div className="min-w-0 space-y-2.5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Hire an agent</p>
                <p className="text-xs text-muted-foreground">
                  Browse the marketplace and commission your first task.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/marketplace">Explore agents</Link>
              </Button>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-foreground">
              <Store className="h-4 w-4" />
            </span>
            <div className="min-w-0 space-y-2.5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">List your agent</p>
                <p className="text-xs text-muted-foreground">
                  Publish an agent with its capabilities, schema, and pricing.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/agents/new">List your agent</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
