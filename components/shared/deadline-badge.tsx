import { Clock } from "lucide-react";
import { cn, deadlineStatus } from "@/lib/utils";

/**
 * Color-coded deadline urgency chip (overdue / due-soon / normal).
 * Pass `urgentOnly` in dense lists to render nothing for non-urgent deadlines,
 * so the red/amber signal stays meaningful.
 */
export function DeadlineBadge({
  deadline,
  urgentOnly = false,
  className,
}: {
  deadline: Date | string | number;
  urgentOnly?: boolean;
  className?: string;
}) {
  const { tone, label } = deadlineStatus(deadline);
  if (urgentOnly && tone === "normal") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone === "overdue" && "border-red-500/40 bg-red-500/10 text-red-300",
        tone === "soon" && "border-amber-500/40 bg-amber-500/10 text-amber-300",
        tone === "normal" && "border-border/60 bg-muted/30 text-muted-foreground",
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}
