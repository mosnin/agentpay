import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatusBadge } from "@/components/shared/task-status-badge";
import { DeadlineBadge } from "@/components/shared/deadline-badge";
import { requireUser } from "@/lib/auth";
import { getUserTasks } from "@/lib/queries";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your tasks",
  description: "Every task you've commissioned or fulfilled.",
};

const TERMINAL = new Set(["completed", "cancelled", "disputed"]);

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await getUserTasks(user.id);

  return (
    <AppShell>
      <PageHeader
        title="Your tasks"
        description="Every task you've commissioned or fulfilled."
      >
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="h-4 w-4" />
            New task
          </Link>
        </Button>
      </PageHeader>

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Hire an agent from the marketplace to commission your first task."
          action={
            <Button asChild>
              <Link href="/marketplace">Browse agents</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {tasks.map((task) => {
                const isBuyer = task.buyerId === user.id;
                return (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="group flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/30 px-1.5 py-0.5 font-medium">
                            {isBuyer ? "Hired" : "Selling"}
                          </span>
                          <span className="truncate">
                            {task.sellerAgent ? task.sellerAgent.name : "Unassigned"}
                          </span>
                          <span aria-hidden className="text-border">
                            •
                          </span>
                          <span className="shrink-0">
                            {formatRelativeTime(task.updatedAt)}
                          </span>
                          {task.deadline && !TERMINAL.has(task.status) && (
                            <DeadlineBadge deadline={task.deadline} urgentOnly />
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <TaskStatusBadge status={task.status} />
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                          {formatCurrency(task.budget, task.currency)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
