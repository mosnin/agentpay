import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { cn } from "@/lib/utils";

type ChartVariant = "area" | "bar" | "line";

interface ChartCardProps {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  variant?: ChartVariant;
  color?: string;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  /** Shown when `data` is empty. */
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function ChartCard({
  title,
  description,
  data,
  xKey,
  yKey,
  variant = "area",
  color,
  height = 240,
  valuePrefix,
  valueSuffix,
  emptyIcon,
  emptyTitle = "No data yet",
  emptyDescription = "Data will appear here as activity comes in.",
  className,
}: ChartCardProps) {
  const hasData = data.length > 0;

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1">
        {hasData ? (
          <DashboardChart
            variant={variant}
            data={data}
            xKey={xKey}
            yKey={yKey}
            color={color}
            height={height}
            valuePrefix={valuePrefix}
            valueSuffix={valueSuffix}
          />
        ) : (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            className="border-0 bg-transparent py-10"
          />
        )}
      </CardContent>
    </Card>
  );
}
