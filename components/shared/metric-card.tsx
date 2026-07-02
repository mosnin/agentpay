import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Compact stat card: label / value / hint. Deliberately chrome-free — no
 * decorative icon chip — so the number is the hierarchy.
 */
export function MetricCard({
  label,
  value,
  hint,
  trend,
  className,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  className?: string;
  href?: string;
}) {
  const TrendIcon =
    trend?.direction === "up" ? ArrowUpRight : trend?.direction === "down" ? ArrowDownRight : Minus;
  const trendColor =
    trend?.direction === "up"
      ? "text-success"
      : trend?.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  const card = (
    <Card
      className={cn(
        "p-4 sm:p-5",
        href && "h-full transition-colors group-hover:border-primary/40",
        className,
      )}
    >
      <div className="truncate text-[13px] font-medium text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      {(trend || hint) && (
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {trend && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", trendColor)}>
              <TrendIcon className="h-3.5 w-3.5" />
              {trend.value}
            </span>
          )}
          {hint && <span className="truncate text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="group block h-full">
        {card}
      </Link>
    );
  }
  return card;
}
