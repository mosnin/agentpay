import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MetricTone = "blue" | "green" | "orange" | "purple" | "gray" | "dark";

// Solid colored chips, glyph in white — the reference's KPI signature.
const CHIP: Record<MetricTone, string> = {
  blue: "bg-info text-info-foreground",
  green: "bg-success text-success-foreground",
  orange: "bg-warning text-warning-foreground",
  purple: "bg-[hsl(262_83%_66%)] text-white",
  gray: "bg-muted-foreground text-white",
  dark: "bg-foreground text-background",
};

/**
 * KPI card in the ops-dashboard style: a colored icon chip + label on top,
 * a large tabular number, and a hairline-divided footer carrying context or
 * a delta. Icon + tone are optional — omit them for a chip-free stat.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "gray",
  hint,
  trend,
  className,
  href,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: MetricTone;
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
        href && "h-full transition-colors hover:border-foreground/20",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              CHIP[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="truncate text-[13px] font-medium text-muted-foreground">
          {label}
        </span>
      </div>

      <div className="mt-3 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </div>

      {(hint || trend) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className="truncate text-muted-foreground">{hint ?? "vs last week"}</span>
          {trend && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", trendColor)}>
              <TrendIcon className="h-3.5 w-3.5" />
              {trend.value}
            </span>
          )}
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
