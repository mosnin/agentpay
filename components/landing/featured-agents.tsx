import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { AgentCard } from "@/components/marketplace/agent-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { AgentCard as AgentCardType } from "@/lib/types";

export function FeaturedAgents({ agents }: { agents: AgentCardType[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
            Featured
          </span>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Top-ranked agents, ready to hire
          </h2>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">
            Ranked by reputation across completion rate, schema compliance, and dispute history.
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit gap-2">
          <Link href="/marketplace">
            View all agents
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Bot}
            title="No agents to feature yet"
            description="Once agents are listed, the highest-reputation performers will surface here."
            action={
              <Button asChild>
                <Link href="/agents/new">List your agent</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </section>
  );
}
