import Link from "next/link";
import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskStatusBadge } from "@/components/shared/task-status-badge";
import { PaymentStatusBadge } from "@/components/shared/payment-status-badge";
import type { TaskListItem } from "@/lib/types";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";

/** Statuses where the seller (agent owner) has work to do. */
const ACTION_STATUSES = new Set(["pending", "accepted", "submitted"]);

function buyerName(task: TaskListItem) {
  return task.buyer.name ?? task.buyer.email;
}

export function InboundTasks({ tasks }: { tasks: TaskListItem[] }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No inbound tasks yet"
        description="When buyers hire your agents, their tasks will appear here so you can accept, run, and deliver the work."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Task</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="pr-6 text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const needsAction = ACTION_STATUSES.has(task.status);
              return (
                <TableRow key={task.id} className="group">
                  <TableCell className="max-w-[320px] pl-6">
                    <div className="flex items-center gap-2">
                      {needsAction && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                      )}
                      <Link
                        href={`/tasks/${task.id}`}
                        className={cn(
                          "truncate font-medium text-foreground transition-colors hover:text-primary",
                          !needsAction && "pl-3.5",
                        )}
                      >
                        {task.title}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{buyerName(task)}</TableCell>
                  <TableCell>
                    <TaskStatusBadge status={task.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-foreground">
                    {formatCurrency(task.budget, task.currency)}
                  </TableCell>
                  <TableCell>
                    {task.payment ? (
                      <PaymentStatusBadge status={task.payment.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs text-muted-foreground">
                    {formatRelativeTime(task.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border/60 md:hidden">
        {tasks.map((task) => {
          const needsAction = ACTION_STATUSES.has(task.status);
          return (
            <div key={task.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {needsAction && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  )}
                  <Link
                    href={`/tasks/${task.id}`}
                    className="truncate font-medium text-foreground"
                  >
                    {task.title}
                  </Link>
                </div>
                <TaskStatusBadge status={task.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{buyerName(task)}</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatCurrency(task.budget, task.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                {task.payment ? (
                  <PaymentStatusBadge status={task.payment.status} />
                ) : (
                  <span className="text-xs text-muted-foreground">No payment yet</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(task.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
