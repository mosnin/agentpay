import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  className,
  href,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  className?: string;
  href?: string;
}) {
  const TrendIcon =
    trend?.direction === "up" ? ArrowUpRight : trend?.direction === "down" ? ArrowDownRight : Minus;
  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-400"
      : trend?.direction === "down"
        ? "text-red-400"
        : "text-muted-foreground";

  const card = (
    <Card
      className={cn(
        "relative overflow-hidden p-5",
        href && "h-full transition-colors group-hover:border-primary/40",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {trend && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trend.value}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
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
