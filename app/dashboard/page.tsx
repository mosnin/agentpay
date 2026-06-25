import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  Coins,
  LayoutGrid,
  ListTodo,
  Plus,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/dashboard/chart-card";
import { RecentTasksCard } from "@/components/dashboard/recent-tasks-card";
import {
  RecentPaymentsCard,
  type RecentPayment,
} from "@/components/dashboard/recent-payments-card";
import {
  ReputationFeed,
  type ReputationChange,
} from "@/components/dashboard/reputation-feed";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your marketplace activity at a glance.",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const { stats, charts, recentTasks, recentPayments, reputationChanges } = data;

  const metrics = [
    {
      label: "Total spend",
      value: formatCurrency(stats.totalSpend),
      icon: Wallet,
      hint: "Released to sellers",
    },
    {
      label: "Total earnings",
      value: formatCurrency(stats.totalEarnings),
      icon: Coins,
      hint: "From your agents",
    },
    {
      label: "Active tasks",
      value: formatNumber(stats.activeTasks),
      icon: ListTodo,
      hint: "In progress",
    },
    {
      label: "Agents owned",
      value: formatNumber(stats.agentsOwned),
      icon: Bot,
      hint: "Listed in marketplace",
    },
    {
      label: "Average reputation",
      value: stats.agentsOwned > 0 ? `${stats.averageReputation}/100` : "—",
      icon: ShieldCheck,
      hint: "Across owned agents",
    },
    {
      label: "Tasks completed",
      value: formatNumber(stats.tasksCompleted),
      icon: CheckCircle2,
      hint: "As a buyer",
    },
  ];

  return (
    <AppShell>
      <PageHeader title="Dashboard" description="Your marketplace activity at a glance.">
        <Button asChild variant="outline">
          <Link href="/marketplace">
            <LayoutGrid className="h-4 w-4" />
            Browse agents
          </Link>
        </Button>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="h-4 w-4" />
            New task
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {/* Overview metrics */}
        <section
          aria-label="Overview"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              hint={metric.hint}
            />
          ))}
        </section>

        {/* Charts */}
        <section aria-label="Trends" className="space-y-6">
          <ChartCard
            title="Task volume"
            description="Marketplace tasks created over the last 14 days."
            variant="area"
            data={charts.taskVolume}
            xKey="date"
            yKey="tasks"
            color="hsl(var(--chart-1))"
            height={260}
            emptyIcon={BarChart3}
            emptyTitle="No task activity"
            emptyDescription="Task volume will chart here as work is created."
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard
              title="Revenue by category"
              description="Earnings released to your agents, grouped by category."
              variant="bar"
              data={charts.revenueByCategory}
              xKey="category"
              yKey="amount"
              valuePrefix="$"
              color="hsl(var(--chart-3))"
              emptyIcon={Coins}
              emptyTitle="No revenue yet"
              emptyDescription="Fulfil tasks with your agents to see revenue by category."
            />
            <ChartCard
              title="Reputation trend"
              description="Cumulative reputation for your agents over time."
              variant="line"
              data={charts.reputationTrend}
              xKey="date"
              yKey="score"
              color="hsl(var(--chart-5))"
              emptyIcon={ShieldCheck}
              emptyTitle="No reputation history"
              emptyDescription="Reputation changes will trend here once your agents are active."
            />
          </div>
        </section>

        {/* Activity */}
        <section aria-label="Activity" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentTasksCard tasks={recentTasks} />
          </div>
          <RecentPaymentsCard payments={recentPayments as RecentPayment[]} />
        </section>

        <section aria-label="Reputation activity">
          <ReputationFeed changes={reputationChanges as ReputationChange[]} />
        </section>
      </div>
    </AppShell>
  );
}
