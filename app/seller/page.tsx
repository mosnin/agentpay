import type { Metadata } from "next";
import Link from "next/link";
import { CircleDollarSign, Inbox, PlusCircle, Star, Store } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardChart } from "@/components/dashboard/lazy-chart";
import { isClerkEnabled, requireOnboardedUser } from "@/lib/auth";
import { getSellerData } from "@/lib/queries";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { SellerAgents } from "./seller-agents";
import { InboundTasks } from "./inbound-tasks";
import { SellerReviews } from "./seller-reviews";

export const metadata: Metadata = {
  title: "Seller studio",
  description: "Manage your listings, inbound work, earnings, and reviews.",
};

/** Pipeline value of inbound work, grouped by lifecycle stage, for the mini-chart. */
function buildPipeline(tasks: Awaited<ReturnType<typeof getSellerData>>["inboundTasks"]) {
  const buckets: { key: string; label: string; statuses: string[] }[] = [
    { key: "open", label: "Open", statuses: ["pending", "accepted"] },
    { key: "in_progress", label: "In progress", statuses: ["running", "submitted", "validating"] },
    { key: "completed", label: "Completed", statuses: ["completed"] },
  ];

  return buckets.map((bucket) => {
    const value = tasks
      .filter((t) => bucket.statuses.includes(t.status))
      .reduce((sum, t) => sum + t.budget, 0);
    return { stage: bucket.label, value };
  });
}

export default async function SellerPage() {
  const user = await requireOnboardedUser();
  const data = await getSellerData(user.id);
  const { stats } = data;

  const pipeline = buildPipeline(data.inboundTasks);
  const hasPipeline = pipeline.some((p) => p.value > 0);

  return (
    <AppShell isAdmin={user.role === "admin"} showMockBanner={!isClerkEnabled()}>
      <PageHeader
        title="Seller studio"
        description="Manage your listings, inbound work, earnings, and reviews."
      >
        <Button asChild>
          <Link href="/agents/new">
            <PlusCircle className="h-4 w-4" />
            List an agent
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-10">
        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <MetricCard
            label="Total earnings"
            value={formatCurrency(stats.totalEarnings)}
            icon={CircleDollarSign}
            tone="green"
            hint="Released to your agents"
          />
          <MetricCard
            label="Listings"
            value={formatNumber(stats.agentCount)}
            icon={Store}
            tone="blue"
            hint={stats.agentCount === 1 ? "Active agent" : "Active agents"}
          />
          <MetricCard
            label="Open inbound tasks"
            value={formatNumber(stats.openInbound)}
            icon={Inbox}
            tone="orange"
            hint="Awaiting your action"
          />
          <MetricCard
            label="Avg rating"
            value={stats.avgRating.toFixed(2)}
            icon={Star}
            tone="purple"
            hint={`${formatNumber(stats.reviewCount)} ${
              stats.reviewCount === 1 ? "review" : "reviews"
            }`}
          />
        </section>

        {/* Earnings pipeline mini-chart */}
        {hasPipeline && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inbound pipeline value</CardTitle>
                <CardDescription>
                  Budget of inbound tasks by stage — your potential and realized earnings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardChart
                  variant="bar"
                  data={pipeline}
                  xKey="stage"
                  yKey="value"
                  height={220}
                  valuePrefix="$"
                />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Owned agents */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Your agents
              </h2>
              <p className="text-sm text-muted-foreground">
                Listings you own and their live marketplace performance.
              </p>
            </div>
            {data.ownedAgents.length > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/agents/new">
                  <PlusCircle className="h-4 w-4" />
                  New listing
                </Link>
              </Button>
            )}
          </div>
          <SellerAgents agents={data.ownedAgents} />
        </section>

        {/* Inbound tasks */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Inbound tasks
            </h2>
            <p className="text-sm text-muted-foreground">
              Work buyers have routed to your agents. Highlighted rows need your attention.
            </p>
          </div>
          <InboundTasks tasks={data.inboundTasks} />
        </section>

        {/* Reviews */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Recent reviews
            </h2>
            <p className="text-sm text-muted-foreground">
              Buyer feedback across your agents, newest first.
            </p>
          </div>
          <SellerReviews reviews={data.reviews} />
        </section>
      </div>
    </AppShell>
  );
}
