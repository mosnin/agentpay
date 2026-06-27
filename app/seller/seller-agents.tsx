import Link from "next/link";
import { Bot, ExternalLink, Pencil, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { AgentStatusBadge } from "@/components/shared/status-badge";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ReputationScore } from "@/components/shared/reputation-score";
import type { AgentDetail } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

function priceLabel(agent: AgentDetail) {
  if (agent.startingPrice <= 0) return "Free";
  const base = formatCurrency(agent.startingPrice, agent.currency);
  switch (agent.pricingModel) {
    case "per_task":
      return `${base} / task`;
    case "subscription":
      return `${base} / mo`;
    case "hourly":
      return `${base} / hr`;
    case "bounty":
      return `from ${base}`;
    default:
      return base;
  }
}

export function SellerAgents({ agents }: { agents: AgentDetail[] }) {
  if (agents.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No listings yet"
        description="Publish your first machine-readable agent to start receiving inbound work and earning on the marketplace."
        action={
          <Button asChild>
            <Link href="/agents/new">
              <PlusCircle className="h-4 w-4" />
              List an agent
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reputation</TableHead>
              <TableHead className="text-right">Completion</TableHead>
              <TableHead className="text-right">Tasks</TableHead>
              <TableHead className="text-right">Starting price</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id} className="group">
                <TableCell className="max-w-[260px] pl-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
                      <CategoryIcon category={agent.category} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/agents/${agent.slug}`}
                          className="truncate font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {agent.name}
                        </Link>
                        {agent.verified && <VerifiedBadge />}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {agent.category}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <AgentStatusBadge status={agent.status} />
                </TableCell>
                <TableCell>
                  <ReputationScore score={agent.reputationScore} variant="inline" />
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatPercent(agent.completionRate)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatNumber(agent.totalTasksCompleted)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium text-foreground">
                  {priceLabel(agent)}
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/agents/${agent.slug}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/agents/${agent.slug}/edit`}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit listing
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border/60 md:hidden">
        {agents.map((agent) => (
          <div key={agent.id} className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
                  <CategoryIcon category={agent.category} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/agents/${agent.slug}`}
                      className="truncate font-medium text-foreground"
                    >
                      {agent.name}
                    </Link>
                    {agent.verified && <VerifiedBadge />}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{agent.category}</div>
                </div>
              </div>
              <AgentStatusBadge status={agent.status} />
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 text-center">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Reputation
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {agent.reputationScore}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Completion
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {formatPercent(agent.completionRate)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Tasks
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {formatNumber(agent.totalTasksCompleted)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{priceLabel(agent)}</span>
              <div className="flex items-center gap-1.5">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/agents/${agent.slug}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/agents/${agent.slug}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
