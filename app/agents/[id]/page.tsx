import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { getAgentByIdOrSlug, getSimilarAgents } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { getAgentCard } from "@/lib/interop/a2aAdapter";
import { listToolsForAgent } from "@/lib/interop/mcpAdapter";
import { AgentProfileHeader } from "@/components/agents/agent-profile-header";
import { AgentTabs, type AgentTab } from "@/components/agents/agent-tabs";
import { AgentOverview } from "@/components/agents/agent-overview";
import { AgentSchemas } from "@/components/agents/agent-schemas";
import { AgentCardPanel } from "@/components/agents/agent-card-panel";
import { AgentReviews } from "@/components/agents/agent-reviews";
import { RecentTasks } from "@/components/agents/recent-tasks";
import { McpTools } from "@/components/agents/mcp-tools";
import { AgentArtifacts } from "@/components/agents/agent-artifacts";
import { AgentCard } from "@/components/marketplace/agent-card";
import { RecordRecentAgent } from "@/components/agents/recently-viewed";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const agent = await getAgentByIdOrSlug(id);
  if (!agent) return { title: "Agent not found" };
  // Bare name — the root layout template appends " — Bids".
  const description = agent.shortDescription;
  const shareTitle = `${agent.name} · Bids`;
  return {
    title: agent.name,
    description,
    alternates: { canonical: `/agents/${agent.slug}` },
    openGraph: {
      type: "website",
      siteName: "Bids",
      url: `/agents/${agent.slug}`,
      title: shareTitle,
      description,
    },
    twitter: { card: "summary_large_image", title: shareTitle, description },
  };
}

/** Server-rendered tab trigger (label + optional count). Text-only by design —
 * seven icons in a tab row is noise, not wayfinding. */
function TabLabel({ label, count }: { label: string; count?: number }) {
  return (
    <>
      {label}
      {typeof count === "number" && (
        <span className="ml-0.5 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </>
  );
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [agent, currentUser] = await Promise.all([
    getAgentByIdOrSlug(id),
    getCurrentUser(),
  ]);

  if (!agent) {
    notFound();
  }

  const isOwner = !!currentUser && currentUser.id === agent.ownerId;
  const reviewCount = agent._count.reviews;
  const card = getAgentCard(agent);
  const tools = listToolsForAgent(agent);
  const similar = await getSimilarAgents(agent.category, agent.id, 3);
  const hireHref = `/tasks/new?agent=${agent.id}&category=${encodeURIComponent(agent.category)}`;

  const tabs: AgentTab[] = [
    {
      value: "overview",
      trigger: <TabLabel label="Overview" />,
      content: <AgentOverview agent={agent} reviewCount={reviewCount} />,
    },
    {
      value: "schemas",
      trigger: <TabLabel label="Schemas" />,
      content: (
        <AgentSchemas inputSchema={agent.inputSchema} outputSchema={agent.outputSchema} />
      ),
    },
    {
      value: "agent-card",
      trigger: <TabLabel label="Agent Card" />,
      content: (
        <AgentCardPanel
          card={card}
          agentId={agent.id}
          endpointUrl={agent.endpointUrl}
          mcpServerUrl={agent.mcpServerUrl}
        />
      ),
    },
    {
      value: "reviews",
      trigger: <TabLabel label="Reviews" count={reviewCount} />,
      content: (
        <AgentReviews
          reviews={agent.reviews}
          averageRating={agent.averageRating}
          reviewCount={reviewCount}
        />
      ),
    },
    {
      value: "tasks",
      trigger: <TabLabel label="Recent tasks" count={agent._count.tasks} />,
      content: <RecentTasks tasks={agent.tasks} />,
    },
    {
      value: "artifacts",
      trigger: <TabLabel label="Artifacts" />,
      content: <AgentArtifacts tasks={agent.tasks} />,
    },
    {
      value: "mcp-tools",
      trigger: <TabLabel label="MCP tools" count={tools.length} />,
      content: <McpTools tools={tools} mcpServerUrl={agent.mcpServerUrl} />,
    },
  ];

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <RecordRecentAgent
          agent={{ slug: agent.slug, name: agent.name, category: agent.category }}
        />
        <nav className="mb-5 flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/marketplace" className="transition-colors hover:text-foreground">
            Marketplace
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">{agent.name}</span>
        </nav>

        <AgentProfileHeader agent={agent} reviewCount={reviewCount} isOwner={isOwner} />

        <div className="mt-8">
          <AgentTabs tabs={tabs} />
        </div>

        {similar.length > 0 && (
          <section className="mt-12" aria-label="Similar agents">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  More {agent.category} agents
                </h2>
                <p className="text-sm text-muted-foreground">
                  Other specialists you can hire for similar work.
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground"
              >
                <Link href={`/marketplace?category=${encodeURIComponent(agent.category)}`}>
                  View all
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((a, i) => (
                <AgentCard
                  key={a.id}
                  agent={a}
                  className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Mobile sticky Hire bar — keep the primary action one tap away */}
        <div className="sticky bottom-4 z-30 mt-6 lg:hidden">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/90 px-4 py-2.5 shadow-lg backdrop-blur-md">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {agent.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(agent.startingPrice, agent.currency)} starting
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href={hireHref}>
                Hire
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
