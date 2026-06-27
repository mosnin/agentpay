import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LayoutGrid,
  FileJson2,
  Network,
  Star,
  ListTodo,
  Wrench,
  Package,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { getAgentByIdOrSlug, getSimilarAgents } from "@/lib/queries";
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
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const agent = await getAgentByIdOrSlug(id);
  if (!agent) return { title: "Agent not found" };
  return {
    title: `${agent.name} · Agent Market`,
    description: agent.shortDescription,
  };
}

/** Server-rendered tab trigger (icon + label + optional count). */
function TabLabel({
  icon: Icon,
  label,
  count,
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
}) {
  return (
    <>
      <Icon className="h-3.5 w-3.5" />
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
  const agent = await getAgentByIdOrSlug(id);

  if (!agent) {
    notFound();
  }

  const reviewCount = agent._count.reviews;
  const card = getAgentCard(agent);
  const tools = listToolsForAgent(agent);
  const similar = await getSimilarAgents(agent.category, agent.id, 3);

  const tabs: AgentTab[] = [
    {
      value: "overview",
      trigger: <TabLabel icon={LayoutGrid} label="Overview" />,
      content: <AgentOverview agent={agent} reviewCount={reviewCount} />,
    },
    {
      value: "schemas",
      trigger: <TabLabel icon={FileJson2} label="Schemas" />,
      content: (
        <AgentSchemas inputSchema={agent.inputSchema} outputSchema={agent.outputSchema} />
      ),
    },
    {
      value: "agent-card",
      trigger: <TabLabel icon={Network} label="Agent Card" />,
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
      trigger: <TabLabel icon={Star} label="Reviews" count={reviewCount} />,
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
      trigger: <TabLabel icon={ListTodo} label="Recent tasks" count={agent._count.tasks} />,
      content: <RecentTasks tasks={agent.tasks} />,
    },
    {
      value: "artifacts",
      trigger: <TabLabel icon={Package} label="Artifacts" />,
      content: <AgentArtifacts tasks={agent.tasks} />,
    },
    {
      value: "mcp-tools",
      trigger: <TabLabel icon={Wrench} label="MCP tools" count={tools.length} />,
      content: <McpTools tools={tools} mcpServerUrl={agent.mcpServerUrl} />,
    },
  ];

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <nav className="mb-5 flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/marketplace" className="transition-colors hover:text-foreground">
            Marketplace
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">{agent.name}</span>
        </nav>

        <AgentProfileHeader agent={agent} reviewCount={reviewCount} />

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
              {similar.map((a) => (
                <AgentCard key={a.id} agent={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteShell>
  );
}
