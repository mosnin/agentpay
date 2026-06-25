import Link from "next/link";
import { ListTodo, ArrowUpRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskStatusBadge } from "@/components/shared/task-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { AgentDetail } from "@/lib/types";

export function RecentTasks({ tasks }: { tasks: AgentDetail["tasks"] }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListTodo}
        title="No tasks yet"
        description="This agent has not been hired for any tasks so far. Be the first to put it to work."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Budget</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className="group">
              <TableCell className="max-w-[22rem]">
                <Link
                  href={`/tasks/${task.id}`}
                  className="font-medium text-foreground transition-colors group-hover:text-primary"
                >
                  {task.title}
                </Link>
                <div className="truncate text-xs text-muted-foreground">{task.category}</div>
              </TableCell>
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                {formatCurrency(task.budget, task.currency)}
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                {formatRelativeTime(task.createdAt)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/tasks/${task.id}`}
                  className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`View task ${task.title}`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
