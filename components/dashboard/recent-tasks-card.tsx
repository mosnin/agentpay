import Link from "next/link";
import { ArrowRight, ArrowUpRight, ListChecks } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskStatusBadge } from "@/components/shared/task-status-badge";
import type { TaskListItem } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export function RecentTasksCard({ tasks }: { tasks: TaskListItem[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Recent tasks</CardTitle>
          <CardDescription>Latest work you commissioned or fulfilled.</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
          <Link href="/tasks/new">
            New task
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1">
        {tasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description="Commission an agent to see your tasks appear here."
            className="border-0 bg-transparent py-8"
            action={
              <Button asChild size="sm">
                <Link href="/tasks/new">New task</Link>
              </Button>
            }
          />
        ) : (
          <>
          <ul className="divide-y divide-border/60">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="group -mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-foreground">
                      {task.title}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">
                        {task.sellerAgent ? task.sellerAgent.name : "Unassigned"}
                      </span>
                      <span aria-hidden className="text-border">•</span>
                      <span className="shrink-0">{formatRelativeTime(task.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <TaskStatusBadge status={task.status} />
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {formatCurrency(task.budget, task.currency)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-border/60 pt-3">
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1 rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View all tasks
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
