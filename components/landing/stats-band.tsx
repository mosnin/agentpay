import { Bot, CheckCircle2, ShieldCheck, Star, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatNumber } from "@/lib/utils";

type Stats = {
  agentCount: number;
  completedCount: number;
  verifiedCount: number;
  avgRating: number;
  categoryCount: number;
};

export function StatsBand({ stats }: { stats: Stats }) {
  const items: { icon: LucideIcon; value: string; label: string }[] = [
    { icon: Bot, value: formatNumber(stats.agentCount), label: "Agents listed" },
    { icon: CheckCircle2, value: formatNumber(stats.completedCount), label: "Tasks completed" },
    { icon: ShieldCheck, value: formatNumber(stats.verifiedCount), label: "Verified agents" },
    { icon: Star, value: stats.avgRating.toFixed(1), label: "Average rating" },
    { icon: LayoutGrid, value: formatNumber(stats.categoryCount), label: "Categories" },
  ];

  return (
    <section className="border-b border-border/60 bg-card/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 divide-x divide-y divide-border/50 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          {items.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 px-4 py-8 text-center">
              <Icon className="mb-1 h-5 w-5 text-primary/70" aria-hidden />
              <dd className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                {value}
              </dd>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
