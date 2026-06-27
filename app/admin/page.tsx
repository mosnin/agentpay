import type { Metadata } from "next";
import { Bot, ShieldAlert, Scale, Wallet } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { getAdminData } from "@/lib/queries";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { AdminTabs } from "./admin-tabs";

export const metadata: Metadata = {
  title: "Admin — Agent Market",
  description: "Moderate agents, disputes, payments, and reputation.",
};

export default async function AdminPage() {
  const data = await getAdminData();

  const agents = data.agents.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    category: a.category,
    status: a.status,
    verified: a.verified,
    reputationScore: a.reputationScore,
    ownerName: a.owner.name ?? "Unknown",
    ownerEmail: a.owner.email,
    organizationName: a.organization?.name ?? null,
    capabilityCount: a._count.capabilities,
    taskCount: a._count.tasks,
  }));

  const disputes = data.disputes.map((d) => ({
    id: d.id,
    taskId: d.taskId,
    taskTitle: d.task.title,
    sellerAgentName: d.task.sellerAgent?.name ?? null,
    reason: d.reason,
    status: d.status,
    resolution: d.resolution,
    openedByName: d.openedBy.name ?? d.openedBy.email,
    createdAt: d.createdAt.toISOString(),
  }));

  const suspiciousTasks = data.suspiciousTasks.map((t) => {
    const flags: string[] = [];
    if (t.status === "disputed") flags.push("Open dispute");
    if (t.payment?.status === "refunded") flags.push("Payment refunded");
    if (t.payment?.status === "failed") flags.push("Payment failed");
    if (t.budget >= 100) flags.push("High budget");
    if (flags.length === 0) flags.push("Flagged for review");
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      budget: t.budget,
      currency: t.currency,
      buyerName: t.buyer.name ?? t.buyer.email,
      sellerAgentName: t.sellerAgent?.name ?? null,
      flags,
    };
  });

  const payments = data.payments.map((p) => ({
    id: p.id,
    taskId: p.task?.id ?? null,
    taskTitle: p.task?.title ?? "—",
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    mode: p.mode,
    provider: p.provider,
    transactionHash: p.transactionHash,
    updatedAt: p.updatedAt.toISOString(),
  }));

  const reputationEvents = data.reputationEvents.map((e) => ({
    id: e.id,
    agentName: e.agent.name,
    type: e.type,
    scoreDelta: e.scoreDelta,
    reason: e.reason,
    createdAt: e.createdAt.toISOString(),
  }));

  const { stats } = data;

  return (
    <AppShell>
      <PageHeader
        title="Admin"
        description="Moderate agents, disputes, payments, and reputation."
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Total agents"
            value={formatNumber(stats.agentCount)}
            icon={Bot}
            hint="Listed in the marketplace"
          />
          <MetricCard
            label="Unverified"
            value={formatNumber(stats.unverifiedCount)}
            icon={ShieldAlert}
            hint="Awaiting verification"
          />
          <MetricCard
            label="Open disputes"
            value={formatNumber(stats.openDisputes)}
            icon={Scale}
            hint="Need resolution"
          />
          <MetricCard
            label="Total released"
            value={formatCurrency(stats.totalReleased)}
            icon={Wallet}
            hint="Settled to sellers"
          />
        </div>

        <AdminTabs
          agents={agents}
          disputes={disputes}
          suspiciousTasks={suspiciousTasks}
          payments={payments}
          reputationEvents={reputationEvents}
        />
      </div>
    </AppShell>
  );
}
