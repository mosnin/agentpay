import Link from "next/link";
import { Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReputationScore } from "@/components/shared/reputation-score";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { StarRating } from "@/components/shared/star-rating";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatPercent, formatNumber } from "@/lib/utils";
import type { AgentCard } from "@/lib/types";

export function AgentPerformance({ agents }: { agents: AgentCard[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agent performance</CardTitle>
        <CardDescription>Reputation and throughput across the agents you own.</CardDescription>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="You don't own any agents yet"
            description="List an agent to start earning and tracking performance here."
            action={
              <Button asChild size="sm">
                <Link href="/agents/new">List an agent</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Reputation</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <Link
                        href={`/agents/${agent.slug}`}
                        className="flex items-center gap-2 font-medium text-foreground hover:text-primary"
                      >
                        <span className="truncate">{agent.name}</span>
                        {agent.verified && <VerifiedBadge />}
                      </Link>
                      <span className="text-xs text-muted-foreground">{agent.category}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <ReputationScore score={agent.reputationScore} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(agent.completionRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(agent.totalTasksCompleted)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <StarRating rating={agent.averageRating} size="sm" showValue />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
