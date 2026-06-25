"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Variant = "area" | "bar" | "line";

interface DashboardChartProps {
  variant?: Variant;
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  valuePrefix = "",
  valueSuffix = "",
}: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-1 font-medium text-foreground">{label}</div>
      <div className="text-muted-foreground">
        {valuePrefix}
        {typeof payload[0].value === "number"
          ? payload[0].value.toLocaleString()
          : payload[0].value}
        {valueSuffix}
      </div>
    </div>
  );
}

export function DashboardChart({
  variant = "area",
  data,
  xKey,
  yKey,
  color = "hsl(var(--chart-1))",
  height = 240,
  valuePrefix,
  valueSuffix,
}: DashboardChartProps) {
  const axisProps = {
    stroke: "hsl(var(--muted-foreground))",
    fontSize: 11,
    tickLine: false,
    axisLine: false,
  } as const;

  const tooltip = (
    <Tooltip
      cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
      content={<ChartTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />}
    />
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      {variant === "bar" ? (
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" />
          <YAxis {...axisProps} width={48} />
          {tooltip}
          <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      ) : variant === "line" ? (
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" />
          <YAxis {...axisProps} width={36} domain={["auto", "auto"]} />
          {tooltip}
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      ) : (
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" />
          <YAxis {...axisProps} width={36} />
          {tooltip}
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${yKey})`}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
