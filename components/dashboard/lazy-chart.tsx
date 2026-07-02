"use client";

import dynamic from "next/dynamic";

// Recharts is ~100kB of client JS — defer it so dashboards paint immediately
// and the chart hydrates in after. Drop-in replacement for DashboardChart.
export const DashboardChart = dynamic(
  () => import("./dashboard-chart").then((m) => m.DashboardChart),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="h-[240px] w-full animate-pulse rounded-lg bg-muted/30"
      />
    ),
  },
);
