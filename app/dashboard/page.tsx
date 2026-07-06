import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  Coins,
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
import { AgentPerformance } from "@/components/dashboard/agent-performance";
import { NeedsAttention, AllCaughtUp } from "@/components/dashboard/needs-attention";
import { GetStarted } from "@/components/dashboard/get-started";
import {
  RecentPaymentsCard,
  type RecentPayment,
} from "@/components/dashboard/recent-payments-card";
import {
  ReputationFeed,
  type ReputationChange,
} from "@/components/dashboard/reputation-feed";
import { isClerkEnabled, requireOnboardedUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your marketplace activity at a glance.",
};

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  const data = await getDashboardData(user.id);
  const {
    stats,
    charts,
    recentTasks,
    recentPayments,
    reputationChanges,
    ownedAgents,
    needsAttention,
  } = data;

  // A brand-new operator: nothing owned, nothing commissioned yet.
  const isNewUser = stats.agentsOwned === 0 && recentTasks.length === 0;

  // A warm, personal greeting — fall back to the generic title if no name.
  const firstName = user.name?.trim().split(/\s+/)[0];

  const metrics = [
    {
      label: "Total spend",
      value: formatCurrency(stats.totalSpend),
      hint: "Released to sellers",
      icon: Wallet,
      tone: "blue" as const,
    },
    {
      label: "Total earnings",
      value: formatCurrency(stats.totalEarnings),
      hint: "From your agents",
      icon: Coins,
      tone: "green" as const,
    },
    {
      label: "Active tasks",
      value: formatNumber(stats.activeTasks),
      hint: "In progress",
      icon: ListTodo,
      tone: "orange" as const,
    },
    {
      label: "Agents owned",
      value: formatNumber(stats.agentsOwned),
      hint: "Listed in marketplace",
      icon: Bot,
      tone: "purple" as const,
    },
    {
      label: "Average reputation",
      value: stats.agentsOwned > 0 ? `${stats.averageReputation}/100` : "—",
      hint: "Across owned agents",
      icon: ShieldCheck,
      tone: "blue" as const,
    },
    {
      label: "Tasks completed",
      value: formatNumber(stats.tasksCompleted),
      hint: "As a buyer",
      icon: CheckCircle2,
      tone: "green" as const,
    },
  ];

  return (
    <AppShell isAdmin={user.role === "admin"} showMockBanner={!isClerkEnabled()}>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Your marketplace activity at a glance."
      >
        <Button asChild variant="outline">
          <Link href="/marketplace">Browse agents</Link>
        </Button>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="h-4 w-4" />
            New task
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {isNewUser && <GetStarted />}

        {/* Overview metrics */}
        <section
          aria-label="Overview"
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
        >
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              tone={metric.tone}
              hint={metric.hint}
              href={
                ["Total earnings", "Agents owned", "Average reputation"].includes(
                  metric.label,
                )
                  ? "/seller"
                  : undefined
              }
            />
          ))}
        </section>

        {/* Needs your attention — tasks waiting on the operator's next move.
            For an active operator with nothing pending, affirm inbox-zero. */}
        {needsAttention.length > 0 ? (
          <NeedsAttention items={needsAttention} />
        ) : (
          !isNewUser && <AllCaughtUp />
        )}

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

        {/* Agent performance */}
        <section aria-label="Agent performance">
          <AgentPerformance agents={ownedAgents} />
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
