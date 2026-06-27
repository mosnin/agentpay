"use client";

import Link from "next/link";
import {
  Bot,
  Scale,
  AlertTriangle,
  Wallet,
  Activity,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { TaskStatusBadge } from "@/components/shared/task-status-badge";
import { PaymentStatusBadge } from "@/components/shared/payment-status-badge";
import { DisputeStatusBadge } from "@/components/shared/status-badge";
import { CategoryIcon } from "@/components/shared/category-icon";
import { CopyButton } from "@/components/shared/copy-button";
import { cn, formatCurrency, formatDate, formatRelativeTime, initials, truncate } from "@/lib/utils";
import { PAYMENT_MODES } from "@/lib/constants";
import { VerifyButton } from "./verify-button";
import { ResolveDisputeDialog } from "./resolve-dispute-dialog";

// ---------------------------------------------------------------------------
// Serializable prop shapes (mapped from getAdminData on the server page)
// ---------------------------------------------------------------------------

export interface AdminAgentRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: string;
  verified: boolean;
  reputationScore: number;
  ownerName: string;
  ownerEmail: string;
  organizationName: string | null;
  capabilityCount: number;
  taskCount: number;
}

export interface AdminDisputeRow {
  id: string;
  taskId: string;
  taskTitle: string;
  sellerAgentName: string | null;
  reason: string;
  status: string;
  resolution: string | null;
  openedByName: string;
  createdAt: string;
}

export interface AdminSuspiciousTaskRow {
  id: string;
  title: string;
  status: string;
  budget: number;
  currency: string;
  buyerName: string;
  sellerAgentName: string | null;
  flags: string[];
}

export interface AdminPaymentRow {
  id: string;
  taskId: string | null;
  taskTitle: string;
  amount: number;
  currency: string;
  status: string;
  mode: string;
  provider: string;
  transactionHash: string | null;
  updatedAt: string;
}

export interface AdminReputationEventRow {
  id: string;
  agentName: string;
  type: string;
  scoreDelta: number;
  reason: string | null;
  createdAt: string;
}

interface AdminTabsProps {
  agents: AdminAgentRow[];
  disputes: AdminDisputeRow[];
  suspiciousTasks: AdminSuspiciousTaskRow[];
  payments: AdminPaymentRow[];
  reputationEvents: AdminReputationEventRow[];
}

const PAYMENT_MODE_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_MODES.map((m) => [m.value, m.label]),
);

function reputationTypeLabel(type: string) {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function TabCard({ children }: { children: React.ReactNode }) {
  return <Card className="overflow-hidden p-0">{children}</Card>;
}

export function AdminTabs({
  agents,
  disputes,
  suspiciousTasks,
  payments,
  reputationEvents,
}: AdminTabsProps) {
  const openDisputeCount = disputes.filter((d) => d.status === "open").length;

  return (
    <Tabs defaultValue="agents" className="space-y-4">
      <div className="overflow-x-auto">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="agents" className="gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            Agents
            <CountPill value={agents.length} />
          </TabsTrigger>
          <TabsTrigger value="disputes" className="gap-1.5">
            <Scale className="h-3.5 w-3.5" />
            Disputes
            {openDisputeCount > 0 && <CountPill value={openDisputeCount} tone="danger" />}
          </TabsTrigger>
          <TabsTrigger value="suspicious" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Suspicious tasks
            <CountPill value={suspiciousTasks.length} />
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="reputation" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Reputation events
          </TabsTrigger>
        </TabsList>
      </div>

      {/* AGENTS ------------------------------------------------------------ */}
      <TabsContent value="agents">
        {agents.length === 0 ? (
          <EmptyState icon={Bot} title="No agents" description="No agents are listed yet." />
        ) : (
          <TabCard>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Agent</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="text-right">Reputation</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Caps</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Tasks</TableHead>
                  <TableHead className="pr-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-4">
                      <Link
                        href={`/agents/${a.slug}`}
                        className="flex items-center gap-3 font-medium text-foreground transition-colors hover:text-primary"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-muted text-xs">
                            {initials(a.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{a.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="truncate text-sm text-foreground">{a.ownerName}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {a.organizationName ?? a.ownerEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CategoryIcon category={a.category} className="h-3.5 w-3.5" />
                        {a.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      {a.verified ? (
                        <VerifiedBadge showLabel />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {a.reputationScore}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                      {a.capabilityCount}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                      {a.taskCount}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {a.verified ? (
                        <span className="text-xs text-muted-foreground">Verified</span>
                      ) : (
                        <div className="flex justify-end">
                          <VerifyButton agentId={a.id} />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabCard>
        )}
      </TabsContent>

      {/* DISPUTES ---------------------------------------------------------- */}
      <TabsContent value="disputes">
        {disputes.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="No disputes"
            description="Every task is in good standing. Disputes will appear here for review."
          />
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/tasks/${d.taskId}`}
                        className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {d.taskTitle}
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                      <DisputeStatusBadge status={d.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{d.reason}</p>
                    {d.resolution && (
                      <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Resolution: </span>
                        {d.resolution}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Opened by <span className="text-foreground">{d.openedByName}</span>
                      </span>
                      {d.sellerAgentName && (
                        <>
                          <span aria-hidden>·</span>
                          <span>
                            Agent <span className="text-foreground">{d.sellerAgentName}</span>
                          </span>
                        </>
                      )}
                      <span aria-hidden>·</span>
                      <span title={formatDate(d.createdAt)}>{formatRelativeTime(d.createdAt)}</span>
                    </div>
                  </div>
                  {d.status === "open" && (
                    <div className="shrink-0">
                      <ResolveDisputeDialog disputeId={d.id} taskTitle={d.taskTitle} />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* SUSPICIOUS TASKS -------------------------------------------------- */}
      <TabsContent value="suspicious">
        {suspiciousTasks.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Nothing flagged"
            description="No disputed, failed, or unusually high-budget tasks right now."
          />
        ) : (
          <TabCard>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="hidden md:table-cell">Buyer</TableHead>
                  <TableHead className="pr-4">Why flagged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousTasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="pl-4">
                      <Link
                        href={`/tasks/${t.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {t.title}
                      </Link>
                      {t.sellerAgentName && (
                        <div className="truncate text-xs text-muted-foreground">
                          {t.sellerAgentName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <TaskStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(t.budget, t.currency)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {t.buyerName}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        {t.flags.map((flag) => (
                          <Badge
                            key={flag}
                            variant="warning"
                            className="gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabCard>
        )}
      </TabsContent>

      {/* PAYMENTS ---------------------------------------------------------- */}
      <TabsContent value="payments">
        {payments.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments" description="No payment activity yet." />
        ) : (
          <TabCard>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Task</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Mode</TableHead>
                  <TableHead className="hidden lg:table-cell">Provider</TableHead>
                  <TableHead className="hidden sm:table-cell">Transaction</TableHead>
                  <TableHead className="pr-4 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4 font-medium text-foreground">
                      {p.taskId ? (
                        <Link
                          href={`/tasks/${p.taskId}`}
                          className="transition-colors hover:text-primary"
                        >
                          {p.taskTitle}
                        </Link>
                      ) : (
                        p.taskTitle
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(p.amount, p.currency)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {PAYMENT_MODE_LABELS[p.mode] ?? p.mode}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{p.provider}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {p.transactionHash ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-xs text-muted-foreground"
                            title={p.transactionHash}
                          >
                            {truncate(p.transactionHash, 16)}
                          </span>
                          <CopyButton value={p.transactionHash} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                      <span title={formatDate(p.updatedAt)}>{formatRelativeTime(p.updatedAt)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabCard>
        )}
      </TabsContent>

      {/* REPUTATION EVENTS ------------------------------------------------- */}
      <TabsContent value="reputation">
        {reputationEvents.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No reputation events"
            description="Score changes from completions, reviews, and disputes will stream here."
          />
        ) : (
          <Card className="divide-y divide-border/60 p-0">
            {reputationEvents.map((e) => {
              const positive = e.scoreDelta > 0;
              const negative = e.scoreDelta < 0;
              const DeltaIcon = positive ? TrendingUp : negative ? TrendingDown : Minus;
              return (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                      positive && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                      negative && "border-red-500/30 bg-red-500/10 text-red-400",
                      !positive && !negative && "border-border/60 bg-muted/40 text-muted-foreground",
                    )}
                  >
                    <DeltaIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-medium text-foreground">{e.agentName}</span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {reputationTypeLabel(e.type)}
                      </Badge>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          positive && "text-emerald-400",
                          negative && "text-red-400",
                          !positive && !negative && "text-muted-foreground",
                        )}
                      >
                        {positive ? "+" : ""}
                        {e.scoreDelta}
                      </span>
                    </div>
                    {e.reason && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{e.reason}</p>
                    )}
                  </div>
                  <span
                    className="mt-0.5 shrink-0 text-xs text-muted-foreground"
                    title={formatDate(e.createdAt)}
                  >
                    {formatRelativeTime(e.createdAt)}
                  </span>
                </div>
              );
            })}
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

function CountPill({ value, tone }: { value: number; tone?: "danger" }) {
  return (
    <span
      className={cn(
        "ml-0.5 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
        tone === "danger"
          ? "bg-red-500/15 text-red-300"
          : "bg-muted-foreground/15 text-muted-foreground",
      )}
    >
      {value}
    </span>
  );
}
