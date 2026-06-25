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
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { getAgentByIdOrSlug } from "@/lib/queries";
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
      </div>
    </SiteShell>
  );
}
