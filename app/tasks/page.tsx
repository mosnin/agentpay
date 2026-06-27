import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ListChecks, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatusBadge } from "@/components/shared/task-status-badge";
import { DeadlineBadge } from "@/components/shared/deadline-badge";
import { requireUser } from "@/lib/auth";
import { getUserTasksPaginated, TASKS_PAGE_SIZE } from "@/lib/queries";
import { TASK_FILTERS, statusesForFilter } from "@/lib/constants";
import { cn, formatCurrency, formatNumber, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your tasks",
  description: "Every task you've commissioned or fulfilled.",
};

const TERMINAL = new Set(["completed", "cancelled", "disputed"]);

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { status, page: pageRaw } = await searchParams;
  const active = TASK_FILTERS.find((f) => f.key === status) ?? TASK_FILTERS[0];
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
  const { tasks, total } = await getUserTasksPaginated(
    user.id,
    statusesForFilter(active.key),
    page,
  );
  const totalPages = Math.ceil(total / TASKS_PAGE_SIZE);
  const offset = (page - 1) * TASKS_PAGE_SIZE;

  const hrefWithPage = (p: number) => {
    const params = new URLSearchParams();
    if (active.key !== "all") params.set("status", active.key);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/tasks?${qs}` : "/tasks";
  };

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

      <div className="space-y-4">
        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {TASK_FILTERS.map((f) => {
            const isActive = f.key === active.key;
            return (
              <Link
                key={f.key}
                href={f.key === "all" ? "/tasks" : `/tasks?status=${f.key}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {f.label}
              </Link>
            );
          })}
          <span className="ml-auto text-xs text-muted-foreground">
            {total === 0 ? (
              "0 tasks"
            ) : (
              <>
                {formatNumber(offset + 1)}–{formatNumber(offset + tasks.length)} of{" "}
                {formatNumber(total)} {total === 1 ? "task" : "tasks"}
              </>
            )}
          </span>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={
              active.key === "all"
                ? "No tasks yet"
                : `No ${active.label.toLowerCase()} tasks`
            }
            description={
              active.key === "all"
                ? "Hire an agent from the marketplace to commission your first task."
                : "Nothing matches this filter right now."
            }
            action={
              active.key === "all" ? (
                <Button asChild>
                  <Link href="/marketplace">Browse agents</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/tasks">View all tasks</Link>
                </Button>
              )
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

        {totalPages > 1 && (
          <nav
            aria-label="Pagination"
            className="flex items-center justify-center gap-3 pt-2"
          >
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={hrefWithPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={hrefWithPage(page + 1)}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </nav>
        )}
      </div>
    </AppShell>
  );
}
